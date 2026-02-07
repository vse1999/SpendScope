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
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Monthly Spending Trend</CardTitle>
        <CardDescription>
          Average: {formatCurrency(averageAmount.toString())} per month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
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
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium">{payload[0].payload.month}</p>
                        <p className="text-blue-600">
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
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
                cursor={onMonthClick ? "pointer" : "default"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
