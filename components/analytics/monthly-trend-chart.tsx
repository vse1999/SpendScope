"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import type { MonthlyTrend, RechartsAreaClickEvent } from "@/types/analytics"

type TrendData = MonthlyTrend

interface MonthlyTrendChartProps {
  data: TrendData[]
  onMonthClick?: (monthKey: string) => void
}

const BRAND_INDIGO = "var(--brand-indigo)"

function isRechartsAreaClickEvent(value: unknown): value is RechartsAreaClickEvent {
  if (!value || typeof value !== "object") {
    return false
  }

  const activePayload = (value as { activePayload?: unknown }).activePayload
  if (!Array.isArray(activePayload) || activePayload.length === 0) {
    return false
  }

  const firstEntry = activePayload[0]
  if (!firstEntry || typeof firstEntry !== "object") {
    return false
  }

  const payload = (firstEntry as { payload?: unknown }).payload
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "monthKey" in payload &&
      typeof (payload as { monthKey?: unknown }).monthKey === "string"
  )
}

export function MonthlyTrendChart({ data, onMonthClick }: MonthlyTrendChartProps) {

  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0)
  const averageAmount = data.length > 0 ? totalAmount / data.length : 0

  return (
    <Card className="app-card-strong">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
        <CardDescription>
          Average: {formatCurrency(averageAmount.toString())} per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-87.5 text-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              onClick={(nextState) => {
                if (!onMonthClick || !isRechartsAreaClickEvent(nextState)) {
                  return
                }

                const monthKey = nextState.activePayload?.[0]?.payload?.monthKey
                if (monthKey) {
                  onMonthClick(monthKey)
                }
              }}
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
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background/95 backdrop-blur-sm border rounded-xl p-3 shadow-xl">
                        <p className="font-semibold text-sm text-foreground">{payload[0].payload.month}</p>
                        <p className="text-primary font-bold text-lg mt-0.5">
                          {formatCurrency(payload[0].value as number)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={BRAND_INDIGO}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorAmount)"
                cursor={onMonthClick ? "pointer" : "default"}
                dot={false}
                activeDot={{ r: 6, fill: BRAND_INDIGO, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
