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
  const [committedDays, setCommittedDays] = useState<number>(initialDays)
  const [pendingDays, setPendingDays] = useState<number | null>(null)
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

  const getPendingRangeLabel = useCallback((rangeDays: number): string => {
    return `${rangeDays} day${rangeDays === 1 ? "" : "s"}`
  }, [])

  const handleDaysChange = useCallback((newDays: number): void => {
    if (newDays === committedDays || isPending) {
      return
    }

    const requestId = activeRequestIdRef.current + 1
    activeRequestIdRef.current = requestId
    setPendingDays(newDays)
    setIsPending(true)

    void (async () => {
      try {
        const response = await fetch(`/api/analytics?days=${newDays}`, {
          method: "GET",
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
          setPendingDays(null)
          setIsPending(false)
          return
        }

        setData(result.data)
        setCommittedDays(newDays)
        updateDaysQueryWithoutNavigation(newDays)
        setPendingDays(null)
        setIsPending(false)
      } catch {
        if (activeRequestIdRef.current !== requestId) {
          return
        }

        toast.error("Failed to load analytics data")
        setPendingDays(null)
        setIsPending(false)
      }
    })()
  }, [committedDays, isPending, updateDaysQueryWithoutNavigation])

  const isAdmin = userRole === UserRole.ADMIN

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground">Visualize spending patterns and trends</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Failed to load analytics data</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-8" id="analytics-container" aria-busy={isPending}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Insights into your company&apos;s spending patterns
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:items-center sm:justify-end">
          <DateRangePicker
            value={committedDays}
            onChange={handleDaysChange}
            disabled={isPending}
          />
          <ExportButton data={data} filename={`analytics-${committedDays}days`} />
          {isPending && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Updating to {getPendingRangeLabel(pendingDays ?? committedDays)}
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
    <Card className="app-card-strong min-h-[10.5rem] transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight break-words tabular-nums whitespace-normal sm:text-3xl sm:whitespace-nowrap">
          {value}
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{subtitle}</p>
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
