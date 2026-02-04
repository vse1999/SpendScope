import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsSkeleton } from "@/components/dashboard/stats-skeleton"
import { TableSkeleton } from "@/components/dashboard/table-skeleton"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-56 mt-2" />
            <Skeleton className="h-3 w-40 mt-1" />
          </div>

          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <StatsSkeleton />

        {/* Recent Expenses Table Skeleton */}
        <TableSkeleton />

        {/* Category Breakdown Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-3 h-3 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Info Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full max-w-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
