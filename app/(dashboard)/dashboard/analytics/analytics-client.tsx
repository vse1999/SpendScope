"use client"

import { useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  MonthlyTrendChart,
  CategoryDistributionChart,
  UserSpendingChart,
  DateRangePicker,
  ExportButton,
} from "@/components/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Users, PieChart } from "lucide-react"
import { formatCurrency } from "@/lib/format-utils"
import { UserRole } from "@prisma/client"
import type { AnalyticsData } from "@/types/analytics"

interface AnalyticsClientProps {
  initialData: AnalyticsData | null
  userRole: UserRole
}

export function AnalyticsClient({ initialData, userRole }: AnalyticsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get days from URL or default to 90
  const days = Number(searchParams.get("days")) || 90

  // Use initialData directly - it will update when server component re-renders
  const data = initialData

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handleDaysChange = (newDays: number) => {
    router.push(`${pathname}?${createQueryString("days", newDays.toString())}`)
  }

  const handleMonthClick = (monthKey: string) => {
    router.push(`/dashboard?month=${monthKey}`)
  }

  const handleCategoryClick = (categoryName: string) => {
    router.push(`/dashboard?category=${encodeURIComponent(categoryName)}`)
  }

  const isAdmin = userRole === UserRole.ADMIN

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <Alert>
          <AlertDescription>No data available</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8" id="analytics-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Insights into your company&apos;s spending patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={days} onChange={handleDaysChange} />
          <ExportButton data={data} filename={`analytics-${days}days`} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <SummaryCard
          title="Total Spent"
          value={formatCurrency(data.summary.totalAmount)}
          subtitle={`${data.summary.totalCount} expenses`}
          icon={<TrendingUp className="h-5 w-5 text-white" />}
          gradient="from-blue-500 to-blue-600"
          shadow="shadow-blue-500/20"
          bgGradient="from-blue-50 dark:from-blue-950/20"
        />
        <SummaryCard
          title="Average Expense"
          value={formatCurrency(data.summary.averageExpense)}
          subtitle="Per transaction"
          icon={<PieChart className="h-5 w-5 text-white" />}
          gradient="from-emerald-500 to-emerald-600"
          shadow="shadow-emerald-500/20"
          bgGradient="from-emerald-50 dark:from-emerald-950/20"
        />
        <SummaryCard
          title="Active Members"
          value={data.userSpending.length.toString()}
          subtitle="Contributing expenses"
          icon={<Users className="h-5 w-5 text-white" />}
          gradient="from-violet-500 to-violet-600"
          shadow="shadow-violet-500/20"
          bgGradient="from-violet-50 dark:from-violet-950/20"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTrendChart
          data={data.monthlyTrend}
          onMonthClick={handleMonthClick}
        />
        <CategoryDistributionChart
          data={data.categoryDistribution}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* User Spending - Full width for admin */}
      {isAdmin && (
        <UserSpendingChart
          data={data.userSpending}
          onUserClick={(email) => router.push(`/dashboard?user=${encodeURIComponent(email)}`)}
        />
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  gradient,
  shadow,
  bgGradient,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  gradient: string
  shadow: string
  bgGradient: string
}) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
      <div className={`absolute inset-0 bg-linear-to-br ${bgGradient} to-white dark:to-slate-900/50 opacity-80`} />
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/30 dark:bg-slate-800/10 rounded-full -translate-y-8 translate-x-8" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</CardTitle>
        <div className={`h-10 w-10 rounded-xl bg-linear-to-br ${gradient} flex items-center justify-center shadow-lg ${shadow} group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
