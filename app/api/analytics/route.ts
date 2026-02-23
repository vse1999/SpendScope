import { NextRequest, NextResponse } from "next/server"
import { getAnalyticsData } from "@/app/actions/expenses"

const VALID_DAY_PRESETS = new Set([30, 90, 180, 365])

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const parsedDays = Number(request.nextUrl.searchParams.get("days"))
  const days = VALID_DAY_PRESETS.has(parsedDays) ? parsedDays : 90

  const result = await getAnalyticsData(days)
  if ("error" in result) {
    const status = "code" in result && result.code === "FORBIDDEN_FEATURE" ? 403 : 400
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result)
}
