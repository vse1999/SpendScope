import Stripe from "stripe"

// Stripe configuration for TEST MODE
// In production, these would be live keys
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
  typescript: true,
})

// Feature flags
export const STRIPE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true"

// Price IDs (Test mode)
export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_test_pro",
} as const

// Feature limits per plan
export const PLAN_LIMITS = {
  FREE: {
    name: "Free",
    maxUsers: 3,
    maxMonthlyExpenses: 100,
    features: {
      analytics: false,
      export: false,
      teamInvites: false,
      unlimitedExpenses: false,
    },
  },
  PRO: {
    name: "Pro",
    maxUsers: Infinity,
    maxMonthlyExpenses: Infinity,
    features: {
      analytics: true,
      export: true,
      teamInvites: true,
      unlimitedExpenses: true,
    },
  },
} as const

// Helper to check if billing is enabled
export function isBillingEnabled(): boolean {
  return STRIPE_ENABLED
}

// Helper to get plan limits
export function getPlanLimits(plan: "FREE" | "PRO") {
  return PLAN_LIMITS[plan]
}
