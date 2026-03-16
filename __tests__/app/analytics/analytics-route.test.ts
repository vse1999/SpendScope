import type { NextRequest } from "next/server"

import { getAnalyticsData } from "@/app/actions/expenses"
import { GET } from "@/app/api/analytics/route"

const mockNextResponseJson = jest.fn()

jest.mock("next/server", () => ({
  NextResponse: {
    json: (...args: unknown[]) => mockNextResponseJson(...args),
  },
}))

jest.mock("@/app/actions/expenses", () => ({
  getAnalyticsData: jest.fn(),
}))

const mockGetAnalyticsData = jest.mocked(getAnalyticsData)

function createRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
  } as NextRequest
}

describe("analytics route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNextResponseJson.mockImplementation(
      (payload: unknown, init?: Record<string, unknown>) => ({
        init,
        payload,
      })
    )
  })

  it("falls back invalid day params to the default preset", async () => {
    mockGetAnalyticsData.mockResolvedValue({
      data: {
        categoryDistribution: [],
        monthlyTrend: [],
        summary: {
          totalAmount: 0,
          totalCount: 0,
          averageExpense: 0,
          startDate: "2026-01-01T00:00:00.000Z",
          endDate: "2026-03-31T23:59:59.999Z",
        },
        userSpending: [],
      },
    })

    const response = await GET(createRequest("http://localhost:3000/api/analytics?days=12"))

    expect(mockGetAnalyticsData).toHaveBeenCalledWith(90)
    expect(response).toEqual(
      expect.objectContaining({
        init: undefined,
      })
    )
  })

  it("returns forbidden feature responses with a 403 status", async () => {
    mockGetAnalyticsData.mockResolvedValue({
      error: "Upgrade required",
      code: "FORBIDDEN_FEATURE",
    })

    const response = await GET(createRequest("http://localhost:3000/api/analytics?days=30"))

    expect(mockGetAnalyticsData).toHaveBeenCalledWith(30)
    expect(response).toEqual({
      payload: {
        error: "Upgrade required",
        code: "FORBIDDEN_FEATURE",
      },
      init: { status: 403 },
    })
  })
})
