"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe/config"
import { revalidatePath } from "next/cache"
import type { StripeSubscriptionWithPeriod } from "@/types/stripe"

/**
 * Reset subscription to FREE (for testing only)
 */
export async function resetToFree() {
  try {
    const session = await auth()

    if (!session?.user) {
      return { error: "Not authenticated" }
    }

    // Only admins can reset
    if (session.user.role !== "ADMIN") {
      return { error: "Only admins can reset subscription" }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    })

    if (!user?.companyId) {
      return { error: "No company found" }
    }

    await prisma.subscription.update({
      where: { companyId: user.companyId },
      data: {
        plan: "FREE",
        status: "ACTIVE",
        stripeSubId: null,
        stripePriceId: null,
        currentPeriodEnd: null,
      }
    })

    revalidatePath("/billing")

    return { success: true }
  } catch (error) {
    console.error("Reset error:", error)
    return { error: "Failed to reset subscription" }
  }
}

/**
 * Sync subscription with Stripe after checkout
 * Called when user returns from Stripe with ?success=true
 */
export async function syncSubscriptionAfterCheckout() {
  try {
    const session = await auth()

    if (!session?.user) {
      return { error: "Not authenticated" }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { company: { include: { subscription: true } } }
    })

    if (!user?.company?.subscription?.stripeCustomerId) {
      return { error: "No Stripe customer found" }
    }

    // List active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.company.subscription.stripeCustomerId,
      status: "active",
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return { error: "No active subscription found in Stripe" }
    }

    const stripeSub = subscriptions.data[0] as StripeSubscriptionWithPeriod

    // Update database with Stripe data
    await prisma.subscription.update({
      where: { companyId: user.company.id },
      data: {
        plan: "PRO",
        status: "ACTIVE",
        stripeSubId: stripeSub.id,
        stripePriceId: stripeSub.items.data[0]?.price.id,
        currentPeriodEnd: stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000) 
          : null,
      }
    })

    revalidatePath("/billing")

    return { success: true, plan: "PRO" }
  } catch (error) {
    console.error("Sync error:", error)
    return { error: "Failed to sync subscription" }
  }
}
