"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { UserRole } from "@prisma/client"
import { Loader2, PieChart, TrendingUp, Users } from "lucide-react"
import { toast } from "sonner"

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
  initialDays: number
  userRole: UserRole
}

interface AnalyticsApiResponse {
  data?: AnalyticsData
  error?: string
}

export function AnalyticsClient({
  initialData,
  initialDays,
  userRole,
}: AnalyticsClientProps): React.JSX.Element {
  const [days, setDays] = useState<number>(initialDays)
  const [data, setData] = useState<AnalyticsData | null>(initialData)
  const [isPending, setIsPending] = useState<boolean>(false)
  const activeRequestIdRef = useRef<number>(0)
  const prefersReducedMotion = usePrefersReducedMotion()
  const chartMotionPolicy = prefersReducedMotion ? "none" : "stable"
  const monthlyTrendData = useMemo<AnalyticsData["monthlyTrend"]>(
    () => data?.monthlyTrend ?? [],
    [data]
  )

  const updateDaysQueryWithoutNavigation = useCallback((newDays: number): void => {
    if (typeof window === "undefined") {
      return
    }

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set("days", newDays.toString())
    const nextPath = `${nextUrl.pathname}?${nextUrl.searchParams.toString()}`
    window.history.replaceState(window.history.state, "", nextPath)
  }, [])

  const handleDaysChange = useCallback((newDays: number): void => {
    if (newDays === days || isPending) {
      return
    }

    setDays(newDays)
    updateDaysQueryWithoutNavigation(newDays)

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    setIsPending(true)

    void (async () => {
      try {
        const response = await fetch(`/api/analytics?days=${newDays}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        })

        const result = (await response.json()) as AnalyticsApiResponse
        if (activeRequestIdRef.current !== requestId) {
          return
        }

        if (!response.ok || !result.data) {
          toast.error(result.error ?? "Failed to load analytics data")
          setIsPending(false)
          return
        }

        setData(result.data)
        setIsPending(false)
      } catch {
        if (activeRequestIdRef.current !== requestId) {
          return
        }

        toast.error("Failed to load analytics data")
        setIsPending(false)
      }
    })()
  }, [days, isPending, updateDaysQueryWithoutNavigation])

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
    <div className="space-y-8" id="analytics-container" aria-busy={isPending}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="app-page-title">
            <span className="app-page-title-gradient">Analytics</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            Insights into your company&apos;s spending patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={days} onChange={handleDaysChange} disabled={isPending} />
          <ExportButton data={data} filename={`analytics-${days}days`} />
          {isPending && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating
            </span>
          )}
        </div>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthlyTrendChart data={monthlyTrendData} motionPolicy={chartMotionPolicy} />
        <CategoryDistributionChart data={data.categoryDistribution} />
      </div>

      {isAdmin && <UserSpendingChart data={data.userSpending} />}
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
}): React.JSX.Element {
  return (
    <Card className="app-card-strong group relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-brand" />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <div className="app-icon-chip transition-transform duration-200 group-hover:scale-105">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updatePreference = (): void => {
      setPrefersReducedMotion(mediaQueryList.matches)
    }

    updatePreference()
    mediaQueryList.addEventListener("change", updatePreference)
    return () => {
      mediaQueryList.removeEventListener("change", updatePreference)
    }
  }, [])

  return prefersReducedMotion
}
