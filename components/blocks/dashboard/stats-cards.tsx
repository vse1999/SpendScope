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
    <div className="grid gap-5 md:grid-cols-3">
      {/* Total Expenses */}
      <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900/50 opacity-80" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full -translate-y-8 translate-x-8" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-semibold text-slate-600 dark:text-slate-300">Total Expenses</CardDescription>
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalExpenses)}</div>
          <p className="text-sm text-muted-foreground mt-2">
            {expenseCount === 0
              ? "No expenses recorded"
              : `${expenseCount} expense${expenseCount === 1 ? "" : "s"} total`}
          </p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900/50 opacity-80" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/40 dark:bg-emerald-900/10 rounded-full -translate-y-8 translate-x-8" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardDescription className="text-sm font-semibold text-slate-600 dark:text-slate-300">This Month</CardDescription>
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
            <Calendar className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="text-3xl font-bold tracking-tight">{formatCurrency(thisMonth)}</div>
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
