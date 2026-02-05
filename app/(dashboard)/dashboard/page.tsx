import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getExpensesByCompany, getExpenseStats, getCategories } from "@/app/actions/expenses"
import { getUserCompany } from "@/app/actions/companies"
import {
  PageHeader,
  ErrorAlert,
  StatsCards,
  CategoryBreakdown,
  QuickStats,
} from "@/components/blocks/dashboard"
import { ExpenseTable } from "@/components/expenses/expense-table"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check company from database (not session, to handle stale JWT after onboarding)
  const userCompanyResult = await getUserCompany()

  if (!userCompanyResult.hasCompany) {
    redirect("/onboarding")
  }

  const companyId = userCompanyResult.company?.id

  // Fetch data
  const expenses = await getExpensesByCompany()
  const stats = await getExpenseStats()
  const categories = await getCategories()

  // Extract errors
  const expensesError = "error" in expenses ? expenses.error : undefined
  const statsError = "error" in stats ? stats.error : undefined
  const hasError = Boolean(expensesError || statsError)

  // Extract data
  const expenseList = "error" in expenses ? [] : expenses
  const categoryList = "error" in categories ? [] : categories
  const totalExpenses = "error" in stats ? 0 : stats.totalExpenses
  const thisMonth = "error" in stats ? 0 : stats.thisMonth
  const byCategory = "error" in stats ? [] : stats.byCategory

  // Calculate trend (mock - would compare to previous month)
  const monthlyTrend: "up" | "down" = thisMonth > 5000 ? "up" : "down"

  return (
    <div className="space-y-6">
      <PageHeader
        userName={session.user.name ?? undefined}
        companyId={companyId}
        userId={session.user.id ?? undefined}
      />

      {hasError && <ErrorAlert expensesError={expensesError} statsError={statsError} />}

      <StatsCards
        totalExpenses={totalExpenses}
        thisMonth={thisMonth}
        expenseCount={expenseList.length}
        monthlyTrend={monthlyTrend}
      />

      <div className="grid gap-6 lg:grid-cols-7">
        <ExpenseTable 
          expenses={expenseList} 
          categories={categoryList}
          currentUserId={session.user.id}
          currentUserRole={session.user.role}
        />

        <div className="lg:col-span-3 space-y-6">
          <CategoryBreakdown categories={byCategory} totalExpenses={totalExpenses} />
          <QuickStats
            expenses={expenseList}
            totalExpenses={totalExpenses}
            categoryCount={byCategory.length}
          />
        </div>
      </div>
    </div>
  )
}
