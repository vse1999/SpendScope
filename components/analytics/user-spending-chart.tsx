"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, type BarRectangleItem } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import type { UserSpending } from "@/types/analytics"

type UserData = UserSpending

interface UserSpendingChartProps {
  data: UserData[]
  onUserClick?: (email: string) => void
}

export function UserSpendingChart({ data, onUserClick }: UserSpendingChartProps) {
  // Sort by amount and take top 8
  const sortedData = [...data]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Team Member</CardTitle>
        <CardDescription>
          {data.length} members • {formatCurrency(totalAmount.toString())} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={100}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
                        <p className="font-medium text-popover-foreground">{data.name}</p>
                        <p className="text-muted-foreground text-sm">{data.email}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between gap-4">
                            <span>Total:</span>
                            <span className="font-medium">
                              {formatCurrency(data.amount)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Expenses:</span>
                            <span className="font-medium">{data.count}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Average:</span>
                            <span className="font-medium">
                              {formatCurrency(data.count > 0 ? data.amount / data.count : 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar
                dataKey="amount"
                radius={[0, 4, 4, 0]}
                cursor={onUserClick ? "pointer" : "default"}
                onClick={(data: BarRectangleItem) => {
                  const userData = data.payload as UserData
                  onUserClick?.(userData.email)
                }}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "var(--chart-1)" : index === 1 ? "var(--chart-2)" : "var(--chart-3)"}
                    opacity={1 - index * 0.08}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
