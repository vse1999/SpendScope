import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react"
import { UserRole } from "@prisma/client"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-utils"
import { BudgetCard } from "./budget-card"
import type { BudgetSummary, CompanyBudgetSettings } from "@/lib/budget/types"

interface StatsCardsProps {
  totalExpenses: number
  thisMonth: number
  expenseCount: number
  monthlyTrend: "up" | "down"
  monthlyChangePercent: string
  budgetSummary: BudgetSummary
  budgetSettings: CompanyBudgetSettings | null
  currentUserRole: UserRole
}

export function StatsCards({
  totalExpenses,
  thisMonth,
  expenseCount,
  monthlyTrend,
  monthlyChangePercent,
  budgetSummary,
  budgetSettings,
  currentUserRole,
}: StatsCardsProps) {
  return (
    <div className="grid items-start gap-5 md:grid-cols-3">
      {/* Total Expenses */}
      <Card className="app-card-strong min-h-[14rem] transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-semibold">Total Expenses</CardDescription>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight break-words tabular-nums whitespace-normal sm:text-3xl sm:whitespace-nowrap">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {expenseCount === 0
              ? "No expenses recorded"
              : `${expenseCount} expense${expenseCount === 1 ? "" : "s"} total`}
          </p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card className="app-card-strong min-h-[14rem] transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-semibold">This Month</CardDescription>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight break-words tabular-nums whitespace-normal sm:text-3xl sm:whitespace-nowrap">
            {formatCurrency(thisMonth)}
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
              monthlyTrend === "up"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            )}>
              {monthlyTrend === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {monthlyChangePercent}
            </div>
            <span className="text-xs text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      <BudgetCard
        summary={budgetSummary}
        settings={budgetSettings}
        currentUserRole={currentUserRole}
      />
    </div>
  )
}
