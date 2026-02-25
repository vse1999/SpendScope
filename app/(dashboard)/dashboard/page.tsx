import { Suspense } from "react"
import { DashboardPageContent } from "./dashboard-page-content"
import { DashboardPageSkeleton } from "./dashboard-page-skeleton"

export default function DashboardPage(): React.JSX.Element {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}
