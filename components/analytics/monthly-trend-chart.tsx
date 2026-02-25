"use client"

import { memo, useMemo } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { StableResponsiveContainer } from "@/components/analytics/stable-responsive-container"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import type { MonthlyTrend } from "@/types/analytics"

type TrendData = MonthlyTrend

interface MonthlyTrendChartProps {
  data: TrendData[]
  motionPolicy?: "stable" | "none"
}

const BRAND_INDIGO = "var(--brand-indigo)"
const MIN_Y_AXIS_MAX = 100
const Y_AXIS_HEADROOM_RATIO = 1.2
const NICE_STEP_FACTORS = [1, 2, 2.5, 5, 10] as const
const Y_AXIS_TICK_COUNT = 6
const Y_AXIS_WIDTH_PX = 72
const Y_AXIS_TICK_MARGIN_PX = 8
const X_AXIS_HEIGHT_PX = 30
const X_AXIS_TICK_MARGIN_PX = 10
const CHART_ANIMATION_DURATION_MS = 220

const integerCurrencyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

function getNiceStepFactor(normalized: number): number {
  for (const factor of NICE_STEP_FACTORS) {
    if (normalized <= factor) {
      return factor
    }
  }

  return NICE_STEP_FACTORS[NICE_STEP_FACTORS.length - 1]
}

function computeYAxisMax(amounts: number[]): number {
  if (amounts.length === 0) {
    return MIN_Y_AXIS_MAX
  }

  const maxAmount = Math.max(...amounts)
  if (maxAmount <= 0) {
    return MIN_Y_AXIS_MAX
  }

  const paddedMax = maxAmount * Y_AXIS_HEADROOM_RATIO
  const magnitude = 10 ** Math.floor(Math.log10(paddedMax))
  const normalized = paddedMax / magnitude
  const roundedMax = getNiceStepFactor(normalized) * magnitude

  return Math.max(MIN_Y_AXIS_MAX, roundedMax)
}

function buildYAxisTicks(yAxisMax: number, tickCount: number = Y_AXIS_TICK_COUNT): number[] {
  const safeTickCount = Math.max(2, Math.floor(tickCount))
  const step = yAxisMax / (safeTickCount - 1)
  return Array.from({ length: safeTickCount }, (_, index) => Math.round(step * index))
}

function formatAxisCurrencyTick(value: number): string {
  return `$${integerCurrencyFormatter.format(value)}`
}

const MonthlyTrendChartComponent = ({
  data,
  motionPolicy = "stable",
}: MonthlyTrendChartProps): React.JSX.Element => {
  const totalAmount = useMemo(
    () => data.reduce((sum, trendPoint) => sum + trendPoint.amount, 0),
    [data]
  )
  const averageAmount = useMemo(
    () => (data.length > 0 ? totalAmount / data.length : 0),
    [data.length, totalAmount]
  )
  const yAxisScale = useMemo(() => {
    const axisMax = computeYAxisMax(data.map((trendPoint) => trendPoint.amount))
    return {
      axisMax,
      ticks: buildYAxisTicks(axisMax, Y_AXIS_TICK_COUNT),
    }
  }, [data])

  const chartSeriesType = data.length <= 1 ? "linear" : "monotone"
  const shouldAnimateSeries = motionPolicy !== "none"

  return (
    <Card className="app-card-strong">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
        <CardDescription>
          Average: {formatCurrency(averageAmount)} per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-87.5 w-full min-w-0 select-none text-foreground pointer-events-none">
          <StableResponsiveContainer>
            <AreaChart
              data={data}
              accessibilityLayer={false}
              tabIndex={-1}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              style={{ outline: "none", pointerEvents: "none" }}
            >
              <defs>
                <linearGradient id="monthlyTrendAmountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND_INDIGO} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BRAND_INDIGO} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 12,
                  fill: "currentColor",
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={24}
                height={X_AXIS_HEIGHT_PX}
                tickMargin={X_AXIS_TICK_MARGIN_PX}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: "currentColor",
                  fontWeight: 500,
                }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, yAxisScale.axisMax]}
                ticks={yAxisScale.ticks}
                tickFormatter={(value) => formatAxisCurrencyTick(Number(value))}
                width={Y_AXIS_WIDTH_PX}
                tickMargin={Y_AXIS_TICK_MARGIN_PX}
              />
              <Area
                type={chartSeriesType}
                dataKey="amount"
                stroke={BRAND_INDIGO}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#monthlyTrendAmountGradient)"
                dot={data.length <= 1 ? { r: 3, fill: BRAND_INDIGO, stroke: "transparent" } : false}
                isAnimationActive={shouldAnimateSeries}
                animationDuration={CHART_ANIMATION_DURATION_MS}
                animationEasing="ease-out"
                animationBegin={0}
              />
            </AreaChart>
          </StableResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export const MonthlyTrendChart = memo(MonthlyTrendChartComponent)
