import {
  buildLoginUrl,
  buildOnboardingUrl,
  parsePricingIntent,
  sanitizeRedirectTo,
} from "@/lib/auth/redirect-intent"

describe("redirect intent helpers", () => {
  it("sanitizes redirect targets to safe relative paths", () => {
    expect(sanitizeRedirectTo("/dashboard/billing")).toBe("/dashboard/billing")
    expect(sanitizeRedirectTo("//malicious.example")).toBe("/dashboard")
    expect(sanitizeRedirectTo("https://malicious.example")).toBe("/dashboard")
    expect(sanitizeRedirectTo(undefined)).toBe("/dashboard")
  })

  it("parses only supported pricing intents", () => {
    expect(parsePricingIntent("free")).toBe("free")
    expect(parsePricingIntent("pro")).toBe("pro")
    expect(parsePricingIntent("enterprise")).toBeUndefined()
    expect(parsePricingIntent(undefined)).toBeUndefined()
  })

  it("builds login urls with preserved signup intent", () => {
    expect(
      buildLoginUrl({
        intent: "signup",
        pricingIntent: "pro",
        redirectTo: "/dashboard/billing",
      })
    ).toBe("/login?intent=signup&plan=pro&redirectTo=%2Fdashboard%2Fbilling")
  })

  it("builds onboarding urls that preserve the post-onboarding target", () => {
    expect(
      buildOnboardingUrl({
        pricingIntent: "pro",
        redirectTo: "/dashboard/billing",
      })
    ).toBe("/onboarding?redirectTo=%2Fdashboard%2Fbilling&plan=pro")
  })
})
