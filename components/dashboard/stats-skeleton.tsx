import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function StatsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Total Expenses Card */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>

      {/* This Month Card */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-28" />
        </CardContent>
      </Card>

      {/* Budget Remaining Card */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-32 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    </div>
  )
}
