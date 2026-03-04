import { AlertCircle } from "lucide-react"
import { getAnalyticsData } from "@/app/actions/expenses"
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context"
import { isBillingEnabled } from "@/lib/stripe/config"
import { AnalyticsUpgradeGate } from "@/components/entitlements"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnalyticsClient } from "./analytics-client"

interface AnalyticsPageContentProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const VALID_DAY_PRESETS = new Set([30, 90, 180, 365])

export async function AnalyticsPageContent({
  searchParams,
}: AnalyticsPageContentProps): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams
  const { user } = await requireDashboardRequestContext()
  const userRole = user.role
  const billingEnabled = isBillingEnabled()
  const isAdmin = userRole === "ADMIN"

  const parsedDays = Number(resolvedSearchParams?.days)
  const days = VALID_DAY_PRESETS.has(parsedDays) ? parsedDays : 90
  const result = await getAnalyticsData(days)

  if (result.error) {
    if ("code" in result && result.code === "FORBIDDEN_FEATURE") {
      return (
        <div className="space-y-6">
          <h1 className="app-page-title">Analytics</h1>
          <AnalyticsUpgradeGate
            reason={result.error}
            isAdmin={isAdmin}
            billingEnabled={billingEnabled}
          />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <h1 className="app-page-title">Analytics</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AnalyticsClient
      initialData={result.data ?? null}
      initialDays={days}
      userRole={userRole}
    />
  )
}
