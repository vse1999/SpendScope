import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function ExpenseMonitorAlertSkeleton({
  actionCount = 3,
  index,
}: {
  actionCount?: number
  index: number
}): React.JSX.Element {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-[28rem] rounded" />
          <Skeleton className="h-4 w-[82%] max-w-[22rem] rounded" />
        </div>

        <Skeleton className="h-4 w-full max-w-[30rem] rounded" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {Array.from({ length: actionCount }).map((_, actionIndex) => (
          <Skeleton
            key={`expense-monitor-alert-action-skeleton-${index}-${actionIndex}`}
            className="h-9 w-full rounded-md sm:w-32"
          />
        ))}
      </div>
    </div>
  )
}

function ExpenseMonitorCardSkeleton(): React.JSX.Element {
  return (
    <Card className="border-amber-300/60">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-full max-w-[32rem] rounded" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <ExpenseMonitorAlertSkeleton key={`expense-monitor-skeleton-${index}`} index={index} />
        ))}
      </CardContent>
    </Card>
  )
}

export function ExpensesPageSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-9 w-40 rounded-lg" />
          <Skeleton className="mt-2 h-5 w-64 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="app-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-28 rounded-lg" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-32 rounded-lg" />
          </CardContent>
        </Card>
      </div>

      <ExpenseMonitorCardSkeleton />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-80 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex items-end">
              <Skeleton className="h-10 w-28 rounded-md" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex items-end">
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-44 rounded" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`policy-badge-skeleton-${index}`} className="h-7 w-32 rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`filter-field-skeleton-${index}`} className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="relative">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Skeleton className="h-4 w-4 rounded" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-16 rounded" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-12 rounded" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20 rounded" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-12 rounded" />
                </TableHead>
                <TableHead className="text-right">
                  <Skeleton className="ml-auto h-4 w-16 rounded" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={`expenses-table-row-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-4 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-56 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-28 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24 rounded" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="ml-auto h-4 w-20 rounded" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-center border-t p-4">
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
