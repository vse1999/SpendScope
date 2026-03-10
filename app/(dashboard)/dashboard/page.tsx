import type { Metadata } from "next"
import { DashboardPageContent } from "./dashboard-page-content"

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
  return <DashboardPageContent />
}
