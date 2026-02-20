import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function AnalyticsPageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-44 rounded-lg" />
          <Skeleton className="mt-2 h-5 w-80 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`analytics-summary-skeleton-${index}`} className="app-card-strong">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-24 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={`analytics-chart-skeleton-${index}`} className="app-card-strong">
            <CardHeader>
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="mt-1 h-4 w-32 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="app-card-strong">
        <CardHeader>
          <Skeleton className="h-6 w-52 rounded-lg" />
          <Skeleton className="mt-1 h-4 w-44 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`analytics-user-row-skeleton-${index}`} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="w-32 sm:w-40">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="mt-1 h-3 w-20 rounded" />
              </div>
              <div className="flex-1">
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
              <Skeleton className="h-4 w-10 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
