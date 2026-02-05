import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from "lucide-react"
import { formatCurrency } from "@/lib/format-utils"
import { cn } from "@/lib/utils"

interface StatsCardsProps {
  totalExpenses: number
  thisMonth: number
  expenseCount: number
  monthlyTrend: "up" | "down"
}

const MONTHLY_BUDGET = 10000

export function StatsCards({
  totalExpenses,
  thisMonth,
  expenseCount,
  monthlyTrend,
}: StatsCardsProps) {
  const budgetRemaining = MONTHLY_BUDGET - thisMonth
  const budgetUsedPercent = Math.min((thisMonth / MONTHLY_BUDGET) * 100, 100)
  const monthlyChange = "12.5%"

  const getBudgetColor = () => {
    if (budgetUsedPercent > 90) return "bg-red-500"
    if (budgetUsedPercent > 70) return "bg-amber-500"
    return "bg-emerald-500"
  }

  return (
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
            {expenseCount === 0
              ? "No expenses recorded"
              : `${expenseCount} expense${expenseCount === 1 ? "" : "s"} total`}
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
          <div className={cn("text-2xl font-bold", budgetRemaining < 0 ? "text-red-600" : "text-emerald-600")}>
            {formatCurrency(budgetRemaining)}
          </div>
          <div className="mt-2">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getBudgetColor())}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetUsedPercent.toFixed(0)}% of monthly budget used
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
