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
import type { MonthlyTrend } from "@/types/analytics"

type TrendData = MonthlyTrend

interface MonthlyTrendChartProps {
  data: TrendData[]
  onMonthClick?: (monthKey: string) => void
}

export function MonthlyTrendChart({ data, onMonthClick }: MonthlyTrendChartProps) {

  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0)
  const averageAmount = data.length > 0 ? totalAmount / data.length : 0

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending Trend</CardTitle>
        <CardDescription>
          Average: {formatCurrency(averageAmount.toString())} per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] text-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              onClick={(nextState) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const state = nextState as any
                if (state?.activePayload?.[0] && onMonthClick) {
                  onMonthClick((state.activePayload[0].payload as MonthlyTrend).monthKey)
                }
              }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
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
                        <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg mt-0.5">
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
                stroke="#6366f1"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorAmount)"
                cursor={onMonthClick ? "pointer" : "default"}
                dot={false}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
