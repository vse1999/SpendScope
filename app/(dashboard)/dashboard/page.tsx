import { auth } from "@/auth"
import { getDashboardStats, getCategories } from "@/app/actions/expenses"
import { getCompanyBudgetState } from "@/app/actions/budget"
import { getCachedUserCompany } from "@/lib/queries/get-user-company"
import {
  PageHeader,
  ErrorAlert,
  StatsCards,
  CategoryBreakdown,
  QuickStats,
} from "@/components/blocks/dashboard"
import { ExpenseTable } from "@/components/expenses/expense-table"

export default async function DashboardPage() {
  // session.user is guaranteed by (dashboard)/layout.tsx auth guard
  const session = await auth()
  const user = session!.user!

  // Get companyId - user is guaranteed to have a company by layout guard
  const userCompanyResult = await getCachedUserCompany()
  const companyId = userCompanyResult.company!.id

  // Fetch data — single efficient call replaces getExpensesByCompany + getExpenseStats
  const [dashboardResult, categoriesResult, budgetResult] = await Promise.all([
    getDashboardStats(),
    getCategories(),
    getCompanyBudgetState(),
  ])

  // Extract errors
  const dashboardError = "error" in dashboardResult ? dashboardResult.error : undefined
  const hasError = Boolean(dashboardError)

  // Extract data with safe defaults
  const data = "error" in dashboardResult
    ? {
      totalExpenses: 0,
      thisMonth: 0,
      previousMonth: 0,
      monthlyTrend: "down" as const,
      monthlyChangePercent: "0%",
      expenseCount: 0,
      averageExpense: 0,
      largestExpense: 0,
      byCategory: [],
      recentExpenses: [],
      categoryCount: 0,
    }
    : dashboardResult.data

  const categoryList = "error" in categoriesResult ? [] : categoriesResult
  const budgetSummary = budgetResult.success
    ? budgetResult.summary
    : {
      hasBudget: false,
      thisMonthSpent: 0,
      budgetAmount: null,
      remaining: null,
      usagePercent: null,
      health: "HEALTHY" as const,
      currency: "USD",
      exhaustionPolicy: "WARN_ONLY" as const,
      isActive: false,
    }
  const budgetSettings = budgetResult.success ? budgetResult.settings : null

  return (
    <div className="space-y-8">
      <PageHeader
        userName={user.name ?? undefined}
        companyId={companyId}
        userId={user.id ?? undefined}
      />

      {hasError && <ErrorAlert expensesError={dashboardError} statsError={undefined} />}

      <StatsCards
        totalExpenses={data.totalExpenses}
        thisMonth={data.thisMonth}
        expenseCount={data.expenseCount}
        monthlyTrend={data.monthlyTrend}
        monthlyChangePercent={data.monthlyChangePercent}
        budgetSummary={budgetSummary}
        budgetSettings={budgetSettings}
        currentUserRole={user.role}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ExpenseTable
            expenses={data.recentExpenses}
            categories={categoryList}
            currentUserId={user.id}
            currentUserRole={user.role}
          />
        </div>

        <div className="space-y-6">
          <CategoryBreakdown categories={data.byCategory} totalExpenses={data.totalExpenses} />
          <QuickStats
            averageExpense={data.averageExpense}
            largestExpense={data.largestExpense}
            categoryCount={data.categoryCount}
          />
        </div>
      </div>
    </div>
  )
}
