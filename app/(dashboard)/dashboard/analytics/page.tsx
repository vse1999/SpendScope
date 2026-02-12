import { auth } from "@/auth"
import { getAnalyticsData } from "@/app/actions/expenses"
import { AnalyticsClient } from "./analytics-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface AnalyticsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AnalyticsPage(props: AnalyticsPageProps) {
  const searchParams = await props.searchParams
  // session.user is guaranteed by (dashboard)/layout.tsx auth guard
  const session = await auth()
  const user = session!.user!

  const days = Number(searchParams?.days) || 90
  const result = await getAnalyticsData(days)

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
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
