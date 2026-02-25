import Stripe from "stripe"
import { FEATURE_LIMITS } from "@/lib/subscription/config"

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY?.trim() ?? ""
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? ""
const BILLING_FLAG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BILLING === "true"
const ALLOW_LIVE_STRIPE_KEYS = process.env.ALLOW_LIVE_STRIPE_KEYS === "true"

function createStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    const missingKeyError = new Error(
      "Stripe is not configured: STRIPE_SECRET_KEY is missing."
    )

    return new Proxy({} as Stripe, {
      get() {
        throw missingKeyError
      },
    })
  }

  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
    typescript: true,
  })
}

// Build-safe Stripe client: avoids module-load crashes when billing env is absent.
export const stripe: Stripe = createStripeClient()

type StripeKeyMode = "missing" | "test" | "live" | "unknown"

function getStripeKeyMode(key: string, testPrefix: string, livePrefix: string): StripeKeyMode {
  if (!key) return "missing"
  if (key.startsWith(testPrefix)) return "test"
  if (key.startsWith(livePrefix)) return "live"
  return "unknown"
}

function shouldEnableStripeBilling(): boolean {
  if (!BILLING_FLAG_ENABLED) {
    return false
  }

  const secretMode = getStripeKeyMode(STRIPE_SECRET_KEY, "sk_test_", "sk_live_")
  const publishableMode = getStripeKeyMode(STRIPE_PUBLISHABLE_KEY, "pk_test_", "pk_live_")

  if (secretMode === "missing" || publishableMode === "missing") {
    console.warn("[billing] Billing disabled: missing Stripe keys.")
    return false
  }

  const hasLiveKey = secretMode === "live" || publishableMode === "live"
  if (hasLiveKey && !ALLOW_LIVE_STRIPE_KEYS) {
    console.warn("[billing] Billing disabled: live Stripe keys detected without ALLOW_LIVE_STRIPE_KEYS=true.")
    return false
  }

  // Prevent accidental mixed-mode configuration (test + live keys together).
  const isMixedMode = (secretMode === "live" && publishableMode === "test") || (secretMode === "test" && publishableMode === "live")
  if (isMixedMode) {
    console.warn("[billing] Billing disabled: mixed Stripe key modes detected (test/live mismatch).")
    return false
  }

  return true
}

// Feature flag + key safety guard
export const STRIPE_ENABLED = shouldEnableStripeBilling()

// Price IDs (Test mode)
export const PRICE_IDS = {
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_test_pro",
} as const

// Single source of truth for plan limits/features (shared with feature-gate service)
export const PLAN_LIMITS = {
  FREE: FEATURE_LIMITS.FREE,
  PRO: FEATURE_LIMITS.PRO,
} as const

// Helper to check if billing is enabled
export function isBillingEnabled(): boolean {
  return STRIPE_ENABLED
}

// Helper to get plan limits
export function getPlanLimits(plan: "FREE" | "PRO") {
  return PLAN_LIMITS[plan]
}
