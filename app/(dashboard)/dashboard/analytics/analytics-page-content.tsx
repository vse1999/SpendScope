import { AlertCircle } from "lucide-react"
import { auth } from "@/auth"
import { getAnalyticsData } from "@/app/actions/expenses"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnalyticsClient } from "./analytics-client"

interface AnalyticsPageContentProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function AnalyticsPageContent({
  searchParams,
}: AnalyticsPageContentProps): Promise<React.JSX.Element> {
  const resolvedSearchParams = await searchParams
  // session.user is guaranteed by (dashboard)/layout.tsx auth guard
  const session = await auth()
  const user = session!.user!

  const days = Number(resolvedSearchParams?.days) || 90
  const result = await getAnalyticsData(days)

  if (result.error) {
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
      userRole={user.role}
    />
  )
}
