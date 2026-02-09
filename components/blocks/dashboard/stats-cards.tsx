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
    if (budgetUsedPercent > 90) return "bg-destructive"
    if (budgetUsedPercent > 70) return "bg-warning"
    return "bg-success"
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Total Expenses */}
      <Card className="relative overflow-hidden card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-medium">Total Expenses</CardDescription>
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{formatCurrency(totalExpenses)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {expenseCount === 0
              ? "No expenses recorded"
              : `${expenseCount} expense${expenseCount === 1 ? "" : "s"} total`}
          </p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card className="relative overflow-hidden card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-medium">This Month</CardDescription>
          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">{formatCurrency(thisMonth)}</div>
          <div className="flex items-center gap-1 mt-1">
            {monthlyTrend === "up" ? (
              <TrendingUp className="h-3 w-3 text-destructive" />
            ) : (
              <TrendingDown className="h-3 w-3 text-success" />
            )}
            <span className={monthlyTrend === "up" ? "text-xs text-destructive" : "text-xs text-success"}>
              {monthlyChange}
            </span>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Budget Remaining */}
      <Card className="relative overflow-hidden card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-medium">Budget Remaining</CardDescription>
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <PieChart className="h-4 w-4 text-warning" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold font-mono tracking-tight", budgetRemaining < 0 ? "text-destructive" : "text-success")}>
            {formatCurrency(budgetRemaining)}
          </div>
          <div className="mt-3">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", getBudgetColor())}
                style={{ width: `${budgetUsedPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {budgetUsedPercent.toFixed(0)}% of monthly budget used
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
