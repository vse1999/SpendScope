import { Suspense } from "react"
import type { Metadata } from "next"
import { DashboardPageContent } from "./dashboard-page-content"
import { DashboardPageSkeleton } from "./dashboard-page-skeleton"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Company-wide expense visibility with policy-aware summaries.",
  openGraph: {
    images: ["/api/og?variant=dashboard"],
  },
  twitter: {
    images: ["/api/twitter?variant=dashboard"],
  },
}

export default function DashboardPage(): React.JSX.Element {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  )
}
