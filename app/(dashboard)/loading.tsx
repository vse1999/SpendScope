import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen app-shell p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 rounded-lg" />
            <Skeleton className="h-5 w-72 mt-2 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-0 shadow-md overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28 rounded-lg" />
                <Skeleton className="h-10 w-10 rounded-xl" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-4 w-24 mt-2 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Table Skeleton */}
          <Card className="lg:col-span-2 border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-32 mt-1 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-0">
                {/* Table header */}
                <div className="flex items-center gap-4 px-6 py-3 border-b border-border/60">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-24 rounded flex-1" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                {/* Table rows */}
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-full rounded flex-1" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar Skeleton */}
          <div className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-28 rounded-lg" />
                <Skeleton className="h-4 w-36 mt-1 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-20 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <Skeleton className="h-6 w-24 rounded-lg" />
                <Skeleton className="h-4 w-32 mt-1 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
