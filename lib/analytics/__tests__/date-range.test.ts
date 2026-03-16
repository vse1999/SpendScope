import {
  DEFAULT_ANALYTICS_DAYS,
  getAnalyticsPeriodBounds,
  parseAnalyticsDaysParam,
} from "@/lib/analytics/date-range"

describe("analytics date range helpers", () => {
  it("accepts only supported preset values", () => {
    expect(parseAnalyticsDaysParam("30")).toBe(30)
    expect(parseAnalyticsDaysParam("365")).toBe(365)
    expect(parseAnalyticsDaysParam("45")).toBe(DEFAULT_ANALYTICS_DAYS)
    expect(parseAnalyticsDaysParam(undefined)).toBe(DEFAULT_ANALYTICS_DAYS)
    expect(parseAnalyticsDaysParam(["180", "30"])).toBe(180)
    expect(parseAnalyticsDaysParam(90)).toBe(90)
  })

  it("returns UTC calendar-day bounds for the requested range", () => {
    const { endDate, endExclusive, startDate } = getAnalyticsPeriodBounds(
      30,
      new Date("2026-03-16T15:42:19.000Z")
    )

    expect(startDate.toISOString()).toBe("2026-02-15T00:00:00.000Z")
    expect(endExclusive.toISOString()).toBe("2026-03-17T00:00:00.000Z")
    expect(endDate.toISOString()).toBe("2026-03-16T23:59:59.999Z")
  })
})
