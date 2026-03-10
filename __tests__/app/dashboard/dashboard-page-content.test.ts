import { UserRole } from "@prisma/client"
import { renderToStaticMarkup } from "react-dom/server"
import { DashboardCriticalSection } from "@/app/(dashboard)/dashboard/dashboard-page-content"
import * as dashboardBlocks from "@/components/blocks/dashboard"
import { getDashboardCriticalReadModelForCompany } from "@/lib/dashboard/read-model"
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context"

jest.mock("@/components/blocks/dashboard", () => ({
  CategoryBreakdown: jest.fn(() => null),
  ErrorAlert: jest.fn(() => null),
  PageHeader: jest.fn(() => null),
  QuickStats: jest.fn(() => null),
  StatsCards: jest.fn(() => null),
}))

jest.mock("@/components/expenses/expense-table", () => ({
  ExpenseTable: jest.fn(() => null),
}))

jest.mock("@/lib/dashboard/request-context", () => ({
  requireDashboardRequestContext: jest.fn(),
}))

jest.mock("@/lib/dashboard/read-model", () => ({
  getDashboardCategoryBreakdownForCompany: jest.fn(),
  getDashboardCriticalReadModelForCompany: jest.fn(),
}))

const mockPageHeader = jest.mocked(dashboardBlocks.PageHeader)
const mockRequireDashboardRequestContext = jest.mocked(requireDashboardRequestContext)
const mockGetDashboardCriticalReadModelForCompany = jest.mocked(
  getDashboardCriticalReadModelForCompany
)

const baseReadModel = {
  budgetSettings: null,
  budgetSummary: {
    budgetAmount: null,
    currency: "USD",
    exhaustionPolicy: "WARN_ONLY" as const,
    hasBudget: false,
    health: "HEALTHY" as const,
    isActive: false,
    remaining: null,
    thisMonthSpent: 0,
    usagePercent: null,
  },
  categories: [],
  stats: {
    averageExpense: 50,
    categoryCount: 0,
    expenseCount: 2,
    largestExpense: 75,
    monthlyChangePercent: "10.0%",
    monthlyTrend: "up" as const,
    previousMonth: 100,
    recentExpenses: [],
    thisMonth: 110,
    totalExpenses: 200,
  },
}

const baseContext = {
  user: {
    company: {
      id: "company-1",
      name: "Acme",
    },
    email: "member@example.com",
    id: "user-1",
    image: null,
    name: "Member",
    role: UserRole.MEMBER,
  },
}

function getPageHeaderProps(): Record<string, unknown> {
  const pageHeaderCall = mockPageHeader.mock.calls[0]
  if (!pageHeaderCall) {
    throw new Error("Expected PageHeader to be rendered")
  }

  return pageHeaderCall[0] as Record<string, unknown>
}

async function renderDashboardCriticalSection(): Promise<void> {
  const element = await DashboardCriticalSection()
  renderToStaticMarkup(element)
}

describe("DashboardCriticalSection category prefetch handoff", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireDashboardRequestContext.mockResolvedValue(baseContext)
    mockGetDashboardCriticalReadModelForCompany.mockResolvedValue(baseReadModel)
  })

  it("passes initialCategories when the dashboard critical read model succeeds", async () => {
    mockRequireDashboardRequestContext.mockResolvedValue({
      ...baseContext,
      user: {
        ...baseContext.user,
        company: {
          ...baseContext.user.company,
          id: "company-categories",
        },
      },
    })
    const categories = [
      {
        companyId: "company-1",
        color: "#3b82f6",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        icon: "DollarSign",
        id: "category-1",
        name: "Travel",
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ]
    mockGetDashboardCriticalReadModelForCompany.mockResolvedValue({
      ...baseReadModel,
      categories,
    })

    await renderDashboardCriticalSection()

    const pageHeaderProps = getPageHeaderProps()
    expect(pageHeaderProps.initialCategories).toEqual(categories)
  })

  it("leaves initialCategories undefined when the critical read model has no categories", async () => {
    mockRequireDashboardRequestContext.mockResolvedValue({
      ...baseContext,
      user: {
        ...baseContext.user,
        company: {
          ...baseContext.user.company,
          id: "company-empty",
        },
      },
    })

    await renderDashboardCriticalSection()

    const pageHeaderProps = getPageHeaderProps()
    expect(pageHeaderProps.initialCategories).toBeUndefined()
  })
})
