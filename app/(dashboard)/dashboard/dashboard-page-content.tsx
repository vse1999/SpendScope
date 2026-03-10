import { Suspense, cache } from "react"
import {
  CategoryBreakdown,
  ErrorAlert,
  PageHeader,
  QuickStats,
  StatsCards,
} from "@/components/blocks/dashboard"
import { ExpenseTable } from "@/components/expenses/expense-table"
import type {
  DashboardCategoryBreakdownData,
  DashboardCriticalReadModelData,
} from "@/lib/dashboard/read-model"
import {
  getDashboardCategoryBreakdownForCompany,
  getDashboardCriticalReadModelForCompany,
} from "@/lib/dashboard/read-model"
import { requireDashboardRequestContext } from "@/lib/dashboard/request-context"
import {
  DashboardCategoryBreakdownSkeleton,
  DashboardHeroSkeleton,
  DashboardQuickStatsSkeleton,
  DashboardRecentExpensesSkeleton,
} from "./dashboard-page-skeleton"

const EMPTY_DASHBOARD_CRITICAL_READ_MODEL: DashboardCriticalReadModelData = {
  budgetSettings: null,
  budgetSummary: {
    budgetAmount: null,
    currency: "USD",
    exhaustionPolicy: "WARN_ONLY",
    hasBudget: false,
    health: "HEALTHY",
    isActive: false,
    remaining: null,
    thisMonthSpent: 0,
    usagePercent: null,
  },
  categories: [],
  stats: {
    averageExpense: 0,
    categoryCount: 0,
    expenseCount: 0,
    largestExpense: 0,
    monthlyChangePercent: "0%",
    monthlyTrend: "down",
    previousMonth: 0,
    recentExpenses: [],
    thisMonth: 0,
    totalExpenses: 0,
  },
}

const EMPTY_DASHBOARD_CATEGORY_BREAKDOWN: DashboardCategoryBreakdownData = {
  byCategory: [],
}

interface DashboardCriticalSectionState {
  error?: string
  readModel: DashboardCriticalReadModelData
}

interface DashboardCategoryBreakdownSectionState {
  error?: string
  readModel: DashboardCategoryBreakdownData
}

const getDashboardCriticalSectionState = cache(
  async (companyId: string): Promise<DashboardCriticalSectionState> => {
    try {
      const readModel = await getDashboardCriticalReadModelForCompany(companyId)
      return { readModel }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch dashboard data",
        readModel: EMPTY_DASHBOARD_CRITICAL_READ_MODEL,
      }
    }
  }
)

const getDashboardCategoryBreakdownSectionState = cache(
  async (companyId: string): Promise<DashboardCategoryBreakdownSectionState> => {
    try {
      const readModel = await getDashboardCategoryBreakdownForCompany(companyId)
      return { readModel }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to fetch category breakdown",
        readModel: EMPTY_DASHBOARD_CATEGORY_BREAKDOWN,
      }
    }
  }
)

export async function DashboardCriticalSection(): Promise<React.JSX.Element> {
  const { user } = await requireDashboardRequestContext()
  const { error, readModel } = await getDashboardCriticalSectionState(user.company.id)

  return (
    <>
      <PageHeader
        userName={user.name ?? undefined}
        companyId={user.company.id}
        userId={user.id ?? undefined}
        initialCategories={readModel.categories.length > 0 ? readModel.categories : undefined}
      />

      {error ? <ErrorAlert expensesError={error} statsError={undefined} /> : null}

      <StatsCards
        totalExpenses={readModel.stats.totalExpenses}
        thisMonth={readModel.stats.thisMonth}
        expenseCount={readModel.stats.expenseCount}
        monthlyTrend={readModel.stats.monthlyTrend}
        monthlyChangePercent={readModel.stats.monthlyChangePercent}
        budgetSummary={readModel.budgetSummary}
        budgetSettings={readModel.budgetSettings}
        currentUserRole={user.role}
      />
    </>
  )
}

export async function DashboardRecentExpensesSection(): Promise<React.JSX.Element> {
  const { user } = await requireDashboardRequestContext()
  const { readModel } = await getDashboardCriticalSectionState(user.company.id)

  return (
    <ExpenseTable
      expenses={readModel.stats.recentExpenses}
      categories={readModel.categories}
      currentUserId={user.id}
      currentUserRole={user.role}
    />
  )
}

export async function DashboardQuickStatsSection(): Promise<React.JSX.Element> {
  const { user } = await requireDashboardRequestContext()
  const { readModel } = await getDashboardCriticalSectionState(user.company.id)

  return (
    <QuickStats
      averageExpense={readModel.stats.averageExpense}
      largestExpense={readModel.stats.largestExpense}
      categoryCount={readModel.stats.categoryCount}
    />
  )
}

export async function DashboardCategoryBreakdownSection(): Promise<React.JSX.Element> {
  const { user } = await requireDashboardRequestContext()
  const [{ readModel: criticalReadModel }, { error, readModel: categoryReadModel }] = await Promise.all([
    getDashboardCriticalSectionState(user.company.id),
    getDashboardCategoryBreakdownSectionState(user.company.id),
  ])

  return (
    <>
      {error ? <ErrorAlert expensesError={undefined} statsError={error} /> : null}
      <CategoryBreakdown
        categories={categoryReadModel.byCategory}
        totalExpenses={criticalReadModel.stats.totalExpenses}
      />
    </>
  )
}

export function DashboardPageContent(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <Suspense fallback={<DashboardHeroSkeleton />}>
        <DashboardCriticalSection />
      </Suspense>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<DashboardRecentExpensesSkeleton />}>
            <DashboardRecentExpensesSection />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<DashboardQuickStatsSkeleton />}>
            <DashboardQuickStatsSection />
          </Suspense>

          <Suspense fallback={<DashboardCategoryBreakdownSkeleton />}>
            <DashboardCategoryBreakdownSection />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
