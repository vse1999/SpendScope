import {
  getCategoriesForCompany,
  getCompanyBudgetStateForCompany,
  getDashboardStatsForCompany,
} from "@/lib/dashboard/queries"
import {
  getDashboardCategoryBreakdownForCompany,
  getDashboardCriticalReadModelForCompany,
} from "@/lib/dashboard/read-model"

jest.mock("@/lib/dashboard/read-model", () => ({
  getDashboardCategoryBreakdownForCompany: jest.fn(),
  getDashboardCriticalReadModelForCompany: jest.fn(),
}))

const mockGetDashboardCategoryBreakdownForCompany = jest.mocked(
  getDashboardCategoryBreakdownForCompany
)
const mockGetDashboardCriticalReadModelForCompany = jest.mocked(
  getDashboardCriticalReadModelForCompany
)

const baseCriticalReadModel = {
  budgetSettings: null,
  budgetSummary: {
    budgetAmount: null,
    currency: "USD",
    exhaustionPolicy: "WARN_ONLY" as const,
    hasBudget: false,
    health: "HEALTHY" as const,
    isActive: false,
    remaining: null,
    thisMonthSpent: 120,
    usagePercent: null,
  },
  categories: [
    {
      companyId: "company-1",
      color: "#3b82f6",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      icon: "DollarSign",
      id: "category-1",
      name: "Travel",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  ],
  stats: {
    averageExpense: 60,
    categoryCount: 1,
    expenseCount: 2,
    largestExpense: 90,
    monthlyChangePercent: "20.0%",
    monthlyTrend: "up" as const,
    previousMonth: 100,
    recentExpenses: [],
    thisMonth: 120,
    totalExpenses: 240,
  },
}

describe("dashboard query adapters", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetDashboardCriticalReadModelForCompany.mockResolvedValue(baseCriticalReadModel)
    mockGetDashboardCategoryBreakdownForCompany.mockResolvedValue({
      byCategory: [
        {
          amount: 240,
          color: "#3b82f6",
          name: "Travel",
        },
      ],
    })
  })

  it("returns categories from the unified critical read model", async () => {
    const result = await getCategoriesForCompany("company-1")

    expect(result).toEqual(baseCriticalReadModel.categories)
  })

  it("returns budget state from the unified critical read model", async () => {
    const result = await getCompanyBudgetStateForCompany("company-1")

    expect(result).toEqual({
      settings: null,
      success: true,
      summary: baseCriticalReadModel.budgetSummary,
    })
  })

  it("preserves the public dashboard stats shape by combining critical and deferred data", async () => {
    const result = await getDashboardStatsForCompany("company-1")

    expect(result).toEqual({
      data: {
        ...baseCriticalReadModel.stats,
        byCategory: [
          {
            amount: 240,
            color: "#3b82f6",
            name: "Travel",
          },
        ],
      },
    })
  })
})
