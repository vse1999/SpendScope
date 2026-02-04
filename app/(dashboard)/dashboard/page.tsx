import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getExpensesByCompany, getExpenseStats } from "@/app/actions/expenses"
import { getUserCompany } from "@/app/actions/companies"
import ExpenseForm from "@/components/expense-form"
import { format } from "date-fns"
import { redirect } from "next/navigation"
import { Building2, AlertCircle, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Check company from database (not session, to handle stale JWT after onboarding)
  const userCompanyResult = await getUserCompany()
  
  // If user has no company, redirect to onboarding
  if (!userCompanyResult.hasCompany) {
    redirect("/onboarding")
  }

  const companyId = userCompanyResult.company?.id

  // Fetch real data from the database
  const expenses = await getExpensesByCompany()
  const stats = await getExpenseStats()

  // Check for errors
  const hasError = "error" in expenses || "error" in stats

  // Format currency helper
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num)
  }

  // Get safe stats values
  const totalExpenses = "error" in stats ? 0 : stats.totalExpenses
  const thisMonth = "error" in stats ? 0 : stats.thisMonth
  const budgetRemaining = 10000 - thisMonth
  const byCategory = "error" in stats ? [] : stats.byCategory
  const expenseList = "error" in expenses ? [] : expenses

  // Calculate trend (mock - would compare to previous month)
  const monthlyTrend = thisMonth > 5000 ? "up" : "down"
  const monthlyChange = "12.5%"

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session.user.name?.split(" ")[0] || "there"}! Here&apos;s your spending overview.
          </p>
        </div>
        {session.user.id && companyId && (
          <ExpenseForm 
            userId={session.user.id} 
            companyId={companyId}
          />
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Error loading data</p>
              <p className="text-sm">
                {"error" in expenses
                  ? expenses.error
                  : "error" in stats
                    ? stats.error
                    : "Failed to load expense data"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Expenses */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Total Expenses</CardDescription>
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenseList.length === 0
                ? "No expenses recorded"
                : `${expenseList.length} expense${expenseList.length === 1 ? "" : "s"} total`}
            </p>
          </CardContent>
        </Card>

        {/* This Month */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">This Month</CardDescription>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonth)}</div>
            <div className="flex items-center gap-1 mt-1">
              {monthlyTrend === "up" ? (
                <TrendingUp className="h-3 w-3 text-red-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-emerald-500" />
              )}
              <span className={monthlyTrend === "up" ? "text-xs text-red-500" : "text-xs text-emerald-500"}>
                {monthlyChange}
              </span>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget Remaining */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription className="text-sm font-medium">Budget Remaining</CardDescription>
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <PieChart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${budgetRemaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {formatCurrency(budgetRemaining)}
            </div>
            <div className="mt-2">
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (thisMonth / 10000) > 0.9 ? "bg-red-500" : 
                    (thisMonth / 10000) > 0.7 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min((thisMonth / 10000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {((thisMonth / 10000) * 100).toFixed(0)}% of monthly budget used
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Recent Expenses */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Expenses</CardTitle>
                <CardDescription>Your latest transactions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expenseList.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No expenses yet. Add your first expense!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseList.slice(0, 10).map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(expense.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {expense.description}
                        </TableCell>
                        <TableCell>
                          {expense.category ? (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{ 
                                backgroundColor: expense.category.color + "20",
                                color: expense.category.color,
                                borderColor: expense.category.color + "40"
                              }}
                            >
                              {expense.category.name}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Uncategorized</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle>By Category</CardTitle>
              <CardDescription>Spending breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No data available
                </p>
              ) : (
                <div className="space-y-4">
                  {byCategory.map((category) => (
                    <div key={category.name} className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{category.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(category.amount)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              backgroundColor: category.color,
                              width: `${Math.min((category.amount / (totalExpenses || 1)) * 100, 100)}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Monthly insights</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Average Expense</span>
                <span className="font-medium">
                  {expenseList.length > 0 
                    ? formatCurrency(totalExpenses / expenseList.length)
                    : "-$"
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Largest Expense</span>
                <span className="font-medium">
                  {expenseList.length > 0
                    ? formatCurrency(Math.max(...expenseList.map(e => parseFloat(e.amount))))
                    : "-$"
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Categories Used</span>
                <span className="font-medium">{byCategory.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
