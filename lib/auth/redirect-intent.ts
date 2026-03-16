export type PricingIntent = "free" | "pro"

const DEFAULT_POST_LOGIN_REDIRECT = "/dashboard"

function isSafeRelativePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//")
}

export function sanitizeRedirectTo(
  redirectTo: string | null | undefined,
  fallback: string = DEFAULT_POST_LOGIN_REDIRECT
): string {
  if (!redirectTo) {
    return fallback
  }

  return isSafeRelativePath(redirectTo) ? redirectTo : fallback
}

export function parsePricingIntent(value: string | null | undefined): PricingIntent | undefined {
  if (value === "free" || value === "pro") {
    return value
  }

  return undefined
}

export function buildLoginUrl({
  intent,
  pricingIntent,
  redirectTo,
}: {
  readonly intent?: string
  readonly pricingIntent?: PricingIntent
  readonly redirectTo?: string
}): string {
  const searchParams = new URLSearchParams()

  if (intent) {
    searchParams.set("intent", intent)
  }

  if (pricingIntent) {
    searchParams.set("plan", pricingIntent)
  }

  if (redirectTo) {
    searchParams.set("redirectTo", redirectTo)
  }

  const queryString = searchParams.toString()
  return queryString ? `/login?${queryString}` : "/login"
}

export function buildOnboardingUrl({
  pricingIntent,
  redirectTo,
}: {
  readonly pricingIntent?: PricingIntent
  readonly redirectTo?: string
}): string {
  const searchParams = new URLSearchParams()

  if (redirectTo) {
    searchParams.set("redirectTo", redirectTo)
  }

  if (pricingIntent) {
    searchParams.set("plan", pricingIntent)
  }

  const queryString = searchParams.toString()
  return queryString ? `/onboarding?${queryString}` : "/onboarding"
}
