import { NextRequest, NextResponse } from "next/server"
import { getAnalyticsData } from "@/app/actions/expenses"
import { parseAnalyticsDaysParam } from "@/lib/analytics/date-range"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const days = parseAnalyticsDaysParam(request.nextUrl.searchParams.get("days"))

  const result = await getAnalyticsData(days)
  if ("error" in result) {
    const status = "code" in result && result.code === "FORBIDDEN_FEATURE" ? 403 : 400
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
