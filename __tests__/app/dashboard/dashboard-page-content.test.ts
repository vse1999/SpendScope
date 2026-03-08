import { UserRole, type Category } from "@prisma/client"
import { renderToStaticMarkup } from "react-dom/server"

import { DashboardPageContent } from "@/app/(dashboard)/dashboard/dashboard-page-content"
import * as dashboardBlocks from "@/components/blocks/dashboard"
import { getCategoriesForCompany, getCompanyBudgetStateForCompany, getDashboardStatsForCompany } from "@/lib/dashboard/queries"
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

jest.mock("@/lib/dashboard/queries", () => ({
  getCategoriesForCompany: jest.fn(),
  getCompanyBudgetStateForCompany: jest.fn(),
  getDashboardStatsForCompany: jest.fn(),
}))

const mockPageHeader = jest.mocked(dashboardBlocks.PageHeader)
const mockRequireDashboardRequestContext = jest.mocked(requireDashboardRequestContext)
const mockGetDashboardStatsForCompany = jest.mocked(getDashboardStatsForCompany)
const mockGetCategoriesForCompany = jest.mocked(getCategoriesForCompany)
const mockGetCompanyBudgetStateForCompany = jest.mocked(getCompanyBudgetStateForCompany)

const baseDashboardStats = {
  averageExpense: 50,
  byCategory: [],
  categoryCount: 0,
  expenseCount: 2,
  largestExpense: 75,
  monthlyChangePercent: "10.0%",
  monthlyTrend: "up" as const,
  previousMonth: 100,
  recentExpenses: [],
  thisMonth: 110,
  totalExpenses: 200,
}

const baseBudgetState = {
  success: true as const,
  settings: null,
  summary: {
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

async function renderDashboardPageContent(): Promise<void> {
  const element = await DashboardPageContent()
  renderToStaticMarkup(element)
}

describe("DashboardPageContent category prefetch handoff", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireDashboardRequestContext.mockResolvedValue(baseContext)
    mockGetDashboardStatsForCompany.mockResolvedValue({ data: baseDashboardStats })
    mockGetCompanyBudgetStateForCompany.mockResolvedValue(baseBudgetState)
  })

  it("passes initialCategories when server category prefetch succeeds", async () => {
    const categories: Category[] = [
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
    mockGetCategoriesForCompany.mockResolvedValue(categories)

    await renderDashboardPageContent()

    const pageHeaderProps = getPageHeaderProps()
    expect(pageHeaderProps.initialCategories).toEqual(categories)
  })

  it("leaves initialCategories undefined when server category prefetch fails", async () => {
    mockGetCategoriesForCompany.mockResolvedValue({ error: "Failed to fetch categories" })

    await renderDashboardPageContent()

    const pageHeaderProps = getPageHeaderProps()
    expect(pageHeaderProps.initialCategories).toBeUndefined()
  })
})
