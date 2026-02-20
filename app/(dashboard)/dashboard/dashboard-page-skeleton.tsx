import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardPageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="mt-2 h-5 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`dashboard-stats-skeleton-${index}`} className="app-card-strong">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="mt-2 h-4 w-28 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="app-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="mt-1 h-4 w-36 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4">
              <Skeleton className="h-3 rounded" />
              <Skeleton className="h-3 rounded" />
              <Skeleton className="h-3 rounded" />
              <Skeleton className="h-3 rounded" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`dashboard-table-row-skeleton-${index}`} className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-4">
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-4 rounded" />
                <Skeleton className="h-6 rounded-full" />
                <Skeleton className="h-4 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="app-card">
            <CardHeader>
              <Skeleton className="h-6 w-28 rounded-lg" />
              <Skeleton className="mt-1 h-4 w-36 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`dashboard-category-skeleton-${index}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="app-card">
            <CardHeader>
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="mt-1 h-4 w-32 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`dashboard-quick-stats-skeleton-${index}`} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
