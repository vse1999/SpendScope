"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { stripe } from "@/lib/stripe/config"
import { revalidatePath } from "next/cache"
import { syncUsageLimits as syncUsageLimitsService } from "@/lib/subscription/feature-gate-service"
import { createNotification } from "@/app/actions/notifications"
import type { StripeSubscriptionWithPeriod } from "@/types/stripe"

/**
 * Result type for sync usage limits action
 */
type SyncUsageLimitsResult = 
  | { success: true; message: string }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "RATE_LIMITED" };

/**
 * Reset subscription to FREE (for testing only)
 */
export async function resetToFree() {
  try {
    const isBillingResetAllowed =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_BILLING_RESET === "true";

    if (!isBillingResetAllowed) {
      return { error: "Reset is disabled in this environment" };
    }

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

    revalidatePath("/dashboard/billing")

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

    revalidatePath("/dashboard/billing")

    // Notify all company members about the upgrade
    try {
      const companyMembers = await prisma.user.findMany({
        where: { companyId: user.company.id },
        select: { id: true },
      });

      const upgraderName = session.user.name || session.user.email || "Someone";

      for (const member of companyMembers) {
        await createNotification(member.id, {
          type: "SUCCESS",
          title: "Upgraded to Pro",
          message: `${upgraderName} upgraded your team to the Pro plan. Enjoy unlimited features!`,
          actionUrl: "/dashboard/billing",
        });
      }
    } catch (notifyError) {
      console.error("Failed to send upgrade notifications:", notifyError);
    }

    return { success: true, plan: "PRO" }
  } catch (error) {
    console.error("Sync error:", error)
    return { error: "Failed to sync subscription" }
  }
}

/**
 * Sync usage limits when subscription changes
 * Should be called after subscription upgrade/downgrade to update CompanyUsage limits
 */
export async function syncUsageLimits(): Promise<SyncUsageLimitsResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" }
    }

    const [apiLimit, userLimit] = await Promise.all([
      checkRateLimit("sync-api", { tier: "api" }),
      checkRateLimit(`sync-api-user:${session.user.id}`, { tier: "api" }),
    ]);

    if (!apiLimit.allowed || !userLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" }
    }

    // Only admins can sync usage limits
    if (session.user.role !== "ADMIN") {
      return { success: false, error: "Only admins can sync usage limits", code: "UNAUTHORIZED" }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true }
    })

    if (!user?.companyId) {
      return { success: false, error: "No company found", code: "NOT_FOUND" }
    }

    // Call the service function to sync limits
    await syncUsageLimitsService(user.companyId)

    revalidatePath("/dashboard/billing")
    revalidatePath("/dashboard/settings")

    return { success: true, message: "Usage limits synced successfully" }
  } catch (error) {
    console.error("Sync usage limits error:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to sync usage limits" 
    }
  }
}
