import type { Metadata } from "next"
import { AnalyticsPageContent } from "./analytics-page-content"

interface AnalyticsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const metadata: Metadata = {
  title: "Analytics",
  description: "Track long-term trends and category-level spending intelligence.",
  openGraph: {
    images: ["/api/og?variant=analytics"],
  },
  twitter: {
    images: ["/api/twitter?variant=analytics"],
  },
}

export default function AnalyticsPage(props: AnalyticsPageProps): React.JSX.Element {
  return <AnalyticsPageContent searchParams={props.searchParams} />
}
