import { UserRole } from "@prisma/client"
import { renderToStaticMarkup } from "react-dom/server"

import { getAnalyticsData } from "@/app/actions/expenses"
import { AnalyticsPageContent } from "@/app/(dashboard)/dashboard/analytics/analytics-page-content"
import { AnalyticsClient } from "@/app/(dashboard)/dashboard/analytics/analytics-client"
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context"

jest.mock("@/app/actions/expenses", () => ({
  getAnalyticsData: jest.fn(),
}))

jest.mock("@/lib/dashboard/request-context", () => ({
  requireDashboardRequestContext: jest.fn(),
}))

jest.mock("@/lib/stripe/config", () => ({
  isBillingEnabled: jest.fn(() => true),
}))

jest.mock("@/components/entitlements", () => ({
  AnalyticsUpgradeGate: jest.fn(() => null),
}))

jest.mock("@/app/(dashboard)/dashboard/analytics/analytics-client", () => ({
  AnalyticsClient: jest.fn(() => null),
}))

const mockGetAnalyticsData = jest.mocked(getAnalyticsData)
const mockRequireDashboardRequestContext = jest.mocked(requireDashboardRequestContext)
const mockAnalyticsClient = jest.mocked(AnalyticsClient)

const baseAnalyticsData = {
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
}

describe("AnalyticsPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireDashboardRequestContext.mockResolvedValue({
      user: {
        company: {
          id: "company-1",
          name: "Acme",
        },
        email: "admin@example.com",
        id: "user-1",
        image: null,
        name: "Admin User",
        role: UserRole.ADMIN,
      },
    })
    mockGetAnalyticsData.mockResolvedValue({ data: baseAnalyticsData })
  })

  it("uses the shared preset parser and falls back invalid values to 90 days", async () => {
    const element = await AnalyticsPageContent({
      searchParams: Promise.resolve({ days: "999" }),
    })

    renderToStaticMarkup(element)

    expect(mockGetAnalyticsData).toHaveBeenCalledWith(90)
    expect(mockAnalyticsClient).toHaveBeenCalledWith(
      expect.objectContaining({
        initialDays: 90,
      }),
      undefined
    )
  })

  it("passes supported preset values through unchanged", async () => {
    const element = await AnalyticsPageContent({
      searchParams: Promise.resolve({ days: "180" }),
    })

    renderToStaticMarkup(element)

    expect(mockGetAnalyticsData).toHaveBeenCalledWith(180)
    expect(mockAnalyticsClient).toHaveBeenCalledWith(
      expect.objectContaining({
        initialDays: 180,
      }),
      undefined
    )
  })
})
