import { stripe } from "@/lib/stripe/config"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import type { StripeSubscriptionWithPeriod } from "@/types/stripe"
import { getSubscriptionIdFromInvoice } from "@/types/stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(request: Request) {
  try {
    const payload = await request.text()
    const signature = request.headers.get("stripe-signature") || ""

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error(`Webhook signature verification failed:`, errorMessage)
      return NextResponse.json(
        { error: `Webhook Error: ${errorMessage}` },
        { status: 400 }
      )
    }

    console.log(`[STRIPE WEBHOOK] Event: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId
  const subscriptionId = session.subscription as string

  if (!companyId || !subscriptionId) {
    console.error("Missing metadata in checkout session")
    return
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as StripeSubscriptionWithPeriod

  // Update database
  await prisma.subscription.update({
    where: { companyId },
    data: {
      plan: "PRO",
      status: "ACTIVE",
      stripeSubId: subscriptionId,
      stripePriceId: subscription.items.data[0]?.price.id,
      currentPeriodEnd: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null,
    },
  })

  console.log(`[STRIPE] Upgraded company ${companyId} to PRO`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  
  if (!subscriptionId) return

  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "ACTIVE" },
  })

  console.log(`[STRIPE] Subscription ${subscriptionId} payment confirmed`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  
  if (!subscriptionId) return

  await prisma.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "PAST_DUE" },
  })

  console.log(`[STRIPE] Subscription ${subscriptionId} payment failed`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubId: subscription.id },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      stripeSubId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    },
  })

  console.log(`[STRIPE] Subscription ${subscription.id} downgraded to FREE`)
}
