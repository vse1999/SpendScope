"use client"

import { useCallback, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { UserRole } from "@prisma/client"
import { PieChart, TrendingUp, Users } from "lucide-react"

import {
  CategoryDistributionChart,
  DateRangePicker,
  ExportButton,
  MonthlyTrendChart,
  UserSpendingChart,
} from "@/components/analytics"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
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

  const isAdmin = userRole === UserRole.ADMIN

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="app-page-title">Analytics</h1>
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
          <h1 className="app-page-title">
            <span className="app-page-title-gradient">Analytics</span>
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
        />
        <SummaryCard
          title="Average Expense"
          value={formatCurrency(data.summary.averageExpense)}
          subtitle="Per transaction"
          icon={<PieChart className="h-5 w-5 text-white" />}
        />
        <SummaryCard
          title="Active Members"
          value={data.userSpending.length.toString()}
          subtitle="Contributing expenses"
          icon={<Users className="h-5 w-5 text-white" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTrendChart data={data.monthlyTrend} />
        <CategoryDistributionChart data={data.categoryDistribution} />
      </div>

      {/* User Spending - Full width for admin */}
      {isAdmin && (
        <UserSpendingChart data={data.userSpending} />
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: ReactNode
}) {
  return (
    <Card className="app-card-strong relative overflow-hidden transition-all duration-200 hover:shadow-md group">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <div className="app-icon-chip transition-transform duration-200 group-hover:scale-105">
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
