"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, AlertTriangle, Sparkles, CreditCard, Loader2, RefreshCw } from "lucide-react"
import { getTestCardInfo, isTestMode } from "@/lib/stripe/test-cards"
import { resetToFree, syncSubscriptionAfterCheckout } from "@/app/actions/billing"
import { PRICING_PLANS } from "@/lib/marketing/pricing-plans"
import {
  getPricingBadgeClassName,
  getPricingCardClassName,
  getPricingFeatureIconClassName,
  getPricingFeatureIconContainerClassName,
  getPricingFeatureTextClassName,
  getPricingPrimaryButtonClassName,
} from "@/components/pricing/plan-card-styles"
import { toast } from "sonner"

interface UsageData {
  plan: "FREE" | "PRO"
  users: { current: number; limit: number | typeof Infinity; percentage: number }
  expenses: { current: number; limit: number | typeof Infinity; percentage: number }
  features: Record<string, boolean>
}

interface BillingClientProps {
  usage: UsageData
  isAdmin: boolean
  billingEnabled: boolean
}

export function BillingClient({ usage, isAdmin, billingEnabled }: BillingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const hasSynced = useRef(false)
  const allowBillingReset = process.env.NEXT_PUBLIC_ALLOW_BILLING_RESET === "true"

  // Sync subscription handler - defined before useEffect that uses it
  const handleSyncAfterCheckout = useCallback(async () => {
    setIsSyncing(true)
    toast.loading("Activating your subscription...")

    const result = await syncSubscriptionAfterCheckout()

    if (result.error) {
      toast.dismiss()
      toast.error(result.error)
    } else {
      toast.dismiss()
      toast.success("Subscription activated! Welcome to Pro.")
      // Clear URL params and refresh
      router.replace("/dashboard/billing")
      router.refresh()
    }

    setIsSyncing(false)
  }, [router])

  // Sync subscription when returning from Stripe checkout
  useEffect(() => {
    const success = searchParams.get("success")
    const sessionId = searchParams.get("session_id")

    if (success === "true" && sessionId && !hasSynced.current) {
      hasSynced.current = true

      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        handleSyncAfterCheckout()
      }, 0)

      return () => clearTimeout(timer)
    }
  }, [searchParams, handleSyncAfterCheckout])

  const handleUpgrade = async () => {
    setIsUpgrading(true)

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Failed to create checkout")
      }
    } catch {
      toast.error("Failed to start checkout")
    }

    setIsUpgrading(false)
  }

  const handleReset = async () => {
    setIsResetting(true)

    const result = await resetToFree()

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Reset to FREE plan")
      router.refresh()
    }

    setIsResetting(false)
  }

  const plans = PRICING_PLANS.map((plan) => ({
    ...plan,
    current: usage.plan === (plan.name === "Pro" ? "PRO" : "FREE"),
  }))

  return (
    <div className="space-y-6 relative">
      {/* Loading Overlay during sync */}
      {isSyncing && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg font-medium">Activating your Pro subscription...</p>
            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Development Mode Banner */}
      {!billingEnabled && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Billing is in test mode. All features are available during development.
            Set NEXT_PUBLIC_ENABLE_BILLING=true to enable real payments.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="app-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                You are on the {usage.plan} plan
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={usage.plan === "PRO" ? "default" : "secondary"}>
                {usage.plan}
              </Badge>
              {/* Refresh status button - appears when on FREE after checkout */}
              {billingEnabled && isAdmin && usage.plan === "FREE" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSyncAfterCheckout}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh Status
                </Button>
              )}
              {billingEnabled && isAdmin && usage.plan === "PRO" && allowBillingReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reset to Free
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Team Members</span>
                <span className="text-muted-foreground">
                  {usage.users.current} / {usage.users.limit === Infinity ? "unlimited" : usage.users.limit}
                </span>
              </div>
              <Progress value={usage.users.percentage} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Monthly Expenses</span>
                <span className="text-muted-foreground">
                  {usage.expenses.current} / {usage.expenses.limit === Infinity ? "unlimited" : usage.expenses.limit}
                </span>
              </div>
              <Progress value={usage.expenses.percentage} />
            </div>
          </div>

          {/* Available Features */}
          <div className="grid gap-2">
            <p className="text-sm font-medium">Available Features</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(usage.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  {enabled ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={enabled ? "" : "text-muted-foreground"}>
                    {feature.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.name} className={getPricingCardClassName(Boolean(plan.isPopular))}>
            <CardContent className="p-6">
              <div className="grid h-full grid-rows-[auto_auto_auto_1fr_auto]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-semibold tracking-tight">{plan.name}</h3>
                    {plan.isPopular && (
                      <Sparkles className="size-5 text-indigo-400" />
                    )}
                  </div>

                  <div className="flex h-6 items-center gap-2">
                    <Badge className={getPricingBadgeClassName(Boolean(plan.isPopular))}>
                      {plan.badge}
                    </Badge>
                    {plan.current && <Badge variant="outline">Current</Badge>}
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">/{plan.period}</span>
                </div>

                <div className="mt-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={`${plan.name}-${feature.text}`} className="flex items-start gap-3 text-sm">
                        <div className={getPricingFeatureIconContainerClassName(feature.included)}>
                          {feature.included ? (
                            <Check className={getPricingFeatureIconClassName(true)} />
                          ) : (
                            <X className={getPricingFeatureIconClassName(false)} />
                          )}
                        </div>
                        <span className={getPricingFeatureTextClassName(feature.included)}>{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  {isAdmin && (
                    <>
                      {/* Show upgrade button for Pro when on Free */}
                      {plan.name === "Pro" && usage.plan === "FREE" && (
                        <Button
                          className={getPricingPrimaryButtonClassName(Boolean(plan.isPopular))}
                          variant={plan.isPopular ? "default" : "outline"}
                          onClick={handleUpgrade}
                          disabled={!billingEnabled || isUpgrading}
                        >
                          {isUpgrading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            "Upgrade to Pro"
                          )}
                        </Button>
                      )}

                      {/* Show current plan badge when Pro */}
                      {plan.name === "Pro" && usage.plan === "PRO" && (
                        <Button variant="outline" className="w-full" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Current Plan
                        </Button>
                      )}

                      {/* Show included badge for Free when on Pro */}
                      {plan.name === "Free" && usage.plan === "PRO" && (
                        <div className="rounded-md bg-muted px-4 py-2 text-center text-sm text-muted-foreground">
                          You are already a Pro member
                        </div>
                      )}

                      {/* Show current plan badge for Free when on Free */}
                      {plan.name === "Free" && usage.plan === "FREE" && (
                        <Button variant="outline" className="w-full" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Current Plan
                        </Button>
                      )}
                    </>
                  )}

                  {!isAdmin && (
                    <p className="text-center text-sm text-muted-foreground">
                      Only admins can manage billing
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Test Mode Cards */}
      {billingEnabled && isTestMode() && (
        <Card className="app-card border-2 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Test Cards
            </CardTitle>
            <CardDescription>
              Use these test cards to simulate different payment scenarios.
              No real money will be charged.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {getTestCardInfo().map((card) => (
                <div key={card.name} className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="font-medium">{card.name}</div>
                  <div className="font-mono text-sm">{card.number}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Expiry: {card.expiry}</div>
                    <div>CVC: {card.cvc}</div>
                  </div>
                  <div className="text-xs pt-2 border-t">{card.result}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
