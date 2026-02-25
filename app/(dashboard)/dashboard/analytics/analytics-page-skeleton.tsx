import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AnalyticsPageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="mt-2 h-5 w-72 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`analytics-summary-skeleton-${index}`} className="app-card-strong min-h-[10.5rem]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="mt-1 h-4 w-28 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={`analytics-chart-skeleton-${index}`} className="app-card">
            <CardHeader>
              <Skeleton className="h-7 w-52 rounded-lg" />
              <Skeleton className="mt-2 h-5 w-44 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="app-card">
        <CardHeader>
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="mt-2 h-5 w-52 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[320px] w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  )
}
