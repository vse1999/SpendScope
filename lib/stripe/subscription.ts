import { prisma } from "@/lib/prisma"
import { getPlanLimits, isBillingEnabled } from "./config"

/**
 * Get subscription status for a company
 * During dev (billing disabled), everyone gets PRO
 */
export async function getCompanySubscription(companyId: string) {
  // During development, everyone gets PRO features
  if (!isBillingEnabled()) {
    return {
      plan: "PRO" as const,
      status: "ACTIVE" as const,
      limits: getPlanLimits("PRO"),
      isPro: true,
    }
  }

  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
  })

  if (!subscription || subscription.plan === "FREE") {
    return {
      plan: "FREE" as const,
      status: subscription?.status || "ACTIVE",
      limits: getPlanLimits("FREE"),
      isPro: false,
    }
  }

  return {
    plan: "PRO" as const,
    status: subscription.status,
    limits: getPlanLimits("PRO"),
    isPro: subscription.status === "ACTIVE",
  }
}

/**
 * Check if a feature is available for a company
 */
export async function canUseFeature(
  companyId: string,
  feature: keyof typeof import("./config").PLAN_LIMITS.PRO.features
): Promise<boolean> {
  const sub = await getCompanySubscription(companyId)
  return sub.limits.features[feature]
}

/**
 * Get usage stats vs limits
 */
export async function getUsageStats(companyId: string) {
  const sub = await getCompanySubscription(companyId)
  
  // Get current user count
  const userCount = await prisma.user.count({
    where: { companyId },
  })

  // Get current month expenses
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyExpenses = await prisma.expense.count({
    where: {
      companyId,
      date: { gte: startOfMonth },
    },
  })

  return {
    plan: sub.plan,
    users: {
      current: userCount,
      limit: sub.limits.maxUsers,
      percentage: sub.limits.maxUsers === Infinity 
        ? 0 
        : (userCount / sub.limits.maxUsers) * 100,
    },
    expenses: {
      current: monthlyExpenses,
      limit: sub.limits.maxMonthlyExpenses,
      percentage: sub.limits.maxMonthlyExpenses === Infinity
        ? 0
        : (monthlyExpenses / sub.limits.maxMonthlyExpenses) * 100,
    },
    features: sub.limits.features,
  }
}
