import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAnalyticsData } from "@/app/actions/expenses"
import { AnalyticsClient } from "./analytics-client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function AnalyticsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const result = await getAnalyticsData(90)

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
      userRole={session.user.role}
    />
  )
}
