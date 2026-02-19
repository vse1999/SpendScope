"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Check, X, AlertTriangle, Sparkles, Users, Receipt, BarChart3, Download, CreditCard, Loader2, RefreshCw } from "lucide-react"
import { getTestCardInfo, isTestMode } from "@/lib/stripe/test-cards"
import { resetToFree, syncSubscriptionAfterCheckout } from "@/app/actions/billing"
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

  const plans = [
    {
      name: "Free",
      description: "For small teams getting started",
      price: "$0",
      period: "forever",
      current: usage.plan === "FREE",
      features: [
        { icon: Users, text: "Up to 3 team members", included: true },
        { icon: Receipt, text: "100 expenses per month", included: true },
        { icon: X, text: "Advanced analytics", included: false },
        { icon: X, text: "CSV export", included: false },
        { icon: X, text: "Team invites", included: false },
      ],
    },
    {
      name: "Pro",
      description: "For growing companies",
      price: "$29",
      period: "per month",
      current: usage.plan === "PRO",
      popular: true,
      features: [
        { icon: Users, text: "Unlimited team members", included: true },
        { icon: Receipt, text: "Unlimited expenses", included: true },
        { icon: BarChart3, text: "Advanced analytics", included: true },
        { icon: Download, text: "CSV export", included: true },
        { icon: Users, text: "Team invitations", included: true },
      ],
    },
  ]

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
          <Card key={plan.name} className={plan.popular ? "app-card border-primary" : "app-card"}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.popular && (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                {plan.current && (
                  <Badge variant="outline">Current</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <feature.icon className={`h-4 w-4 ${feature.included ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={feature.included ? "" : "text-muted-foreground line-through"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {isAdmin && (
                <>
                  {/* Show upgrade button for Pro when on Free */}
                  {plan.name === "Pro" && usage.plan === "FREE" && (
                    <Button
                      className="w-full"
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
                    <div className="text-center py-2 px-4 rounded-md bg-muted text-sm text-muted-foreground">
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
                <p className="text-sm text-muted-foreground text-center">
                  Only admins can manage billing
                </p>
              )}
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
