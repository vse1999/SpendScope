import { AnalyticsPageContent } from "./analytics-page-content"

interface AnalyticsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default function AnalyticsPage(props: AnalyticsPageProps): React.JSX.Element {
  return <AnalyticsPageContent searchParams={props.searchParams} />
}
