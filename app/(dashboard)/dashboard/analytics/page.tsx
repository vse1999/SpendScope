import { Suspense } from "react"
import { AnalyticsPageContent } from "./analytics-page-content"
import { AnalyticsPageSkeleton } from "./analytics-page-skeleton"

interface AnalyticsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default function AnalyticsPage(props: AnalyticsPageProps): React.JSX.Element {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsPageContent searchParams={props.searchParams} />
    </Suspense>
  )
}
