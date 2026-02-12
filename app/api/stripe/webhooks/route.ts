import { stripe } from "@/lib/stripe/config"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import Stripe from "stripe"
import type { StripeSubscriptionWithPeriod } from "@/types/stripe"
import { getSubscriptionIdFromInvoice } from "@/types/stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""
const STRIPE_PROVIDER = "stripe"

type WebhookProcessingResult = "processed" | "duplicate"

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

async function applyEvent(
  tx: Prisma.TransactionClient,
  event: Stripe.Event
): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      await handleCheckoutCompleted(tx, session)
      return
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaid(tx, invoice)
      return
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      await handlePaymentFailed(tx, invoice)
      return
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionDeleted(tx, subscription)
      return
    }

    default: {
      console.log(`Unhandled event type: ${event.type}`)
    }
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured")
      return NextResponse.json(
        { error: "Webhook secret is not configured" },
        { status: 500 }
      )
    }

    const payload = await request.text()
    const signature = request.headers.get("stripe-signature") || ""

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("Webhook signature verification failed:", errorMessage)
      return NextResponse.json(
        { error: `Webhook Error: ${errorMessage}` },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      try {
        await tx.webhookEvent.create({
          data: {
            provider: STRIPE_PROVIDER,
            eventId: event.id,
            eventType: event.type,
          },
        })
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return "duplicate" satisfies WebhookProcessingResult
        }

        throw error
      }

      await applyEvent(tx, event)
      return "processed" satisfies WebhookProcessingResult
    })

    if (result === "duplicate") {
      console.log(`[STRIPE WEBHOOK] Duplicate event ignored: ${event.id}`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    console.log(`[STRIPE WEBHOOK] Processed event ${event.id} (${event.type})`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(
  tx: Prisma.TransactionClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const companyId = session.metadata?.companyId
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id

  if (!companyId || !subscriptionId) {
    console.error("Missing metadata in checkout session")
    return
  }

  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as StripeSubscriptionWithPeriod

  // Update database
  await tx.subscription.update({
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

async function handleInvoicePaid(
  tx: Prisma.TransactionClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)

  if (!subscriptionId) {
    return
  }

  await tx.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "ACTIVE" },
  })

  console.log(`[STRIPE] Subscription ${subscriptionId} payment confirmed`)
}

async function handlePaymentFailed(
  tx: Prisma.TransactionClient,
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)

  if (!subscriptionId) {
    return
  }

  await tx.subscription.updateMany({
    where: { stripeSubId: subscriptionId },
    data: { status: "PAST_DUE" },
  })

  console.log(`[STRIPE] Subscription ${subscriptionId} payment failed`)
}

async function handleSubscriptionDeleted(
  tx: Prisma.TransactionClient,
  subscription: Stripe.Subscription
): Promise<void> {
  await tx.subscription.updateMany({
    where: { stripeSubId: subscription.id },
    data: {
      plan: "FREE",
      status: "ACTIVE",
      stripeSubId: null,
      stripePriceId: null,
      currentPeriodEnd: null
    },
  })

  console.log(`[STRIPE] Subscription ${subscription.id} downgraded to FREE`)
}
