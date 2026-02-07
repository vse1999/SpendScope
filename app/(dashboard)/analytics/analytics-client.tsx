"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  const [days, setDays] = useState(90)
  const [data] = useState(initialData)

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
    <div className="space-y-6" id="analytics-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Insights into your company&apos;s spending patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={days} onChange={setDays} />
          <ExportButton data={data} filename={`analytics-${days}days`} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total Spent"
          value={formatCurrency(data.summary.totalAmount)}
          subtitle={`${data.summary.totalCount} expenses`}
          icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
        />
        <SummaryCard
          title="Average Expense"
          value={formatCurrency(data.summary.averageExpense)}
          subtitle="Per transaction"
          icon={<PieChart className="h-4 w-4 text-green-600" />}
        />
        <SummaryCard
          title="Active Members"
          value={data.userSpending.length.toString()}
          subtitle="Contributing expenses"
          icon={<Users className="h-4 w-4 text-purple-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MonthlyTrendChart
          data={data.monthlyTrend}
          onMonthClick={handleMonthClick}
        />
        <CategoryDistributionChart
          data={data.categoryDistribution}
          onCategoryClick={handleCategoryClick}
        />
        {isAdmin && (
          <UserSpendingChart
            data={data.userSpending}
            onUserClick={(email) => router.push(`/dashboard?user=${encodeURIComponent(email)}`)}
          />
        )}
      </div>
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
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
