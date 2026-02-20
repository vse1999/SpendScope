"use client"

import { useEffect, useRef, useState } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import type { MonthlyTrend } from "@/types/analytics"

type TrendData = MonthlyTrend

interface MonthlyTrendChartProps {
  data: TrendData[]
}

const BRAND_INDIGO = "var(--brand-indigo)"

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)

  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0)
  const averageAmount = data.length > 0 ? totalAmount / data.length : 0

  useEffect(() => {
    const container = chartContainerRef.current
    if (!container) {
      return
    }

    const updateReadiness = () => {
      setIsChartReady(container.clientWidth > 0 && container.clientHeight > 0)
    }

    updateReadiness()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const observer = new ResizeObserver(() => updateReadiness())
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <Card className="app-card-strong">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
        <CardDescription>
          Average: {formatCurrency(averageAmount.toString())} per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={chartContainerRef}
          className="h-87.5 w-full min-w-0 select-none text-foreground pointer-events-none"
        >
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart
                data={data}
                accessibilityLayer={false}
                tabIndex={-1}
                style={{ outline: "none", pointerEvents: "none" }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND_INDIGO} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BRAND_INDIGO} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{
                    fontSize: 12,
                    fill: 'currentColor',
                    fontWeight: 500
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{
                    fontSize: 12,
                    fill: 'currentColor',
                    fontWeight: 500
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={BRAND_INDIGO}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" aria-hidden="true" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
