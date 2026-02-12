"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"

interface CategoryData {
  name: string
  color: string
  amount: number
}

interface CategoryDistributionChartProps {
  data: CategoryData[]
  onCategoryClick?: (categoryName: string) => void
}

export function CategoryDistributionChart({
  data,
  onCategoryClick
}: CategoryDistributionChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const total = data.reduce((sum, d) => sum + d.amount, 0)

  // Sort by amount and take top 6, group rest as "Other"
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)
  const topCategories = sortedData.slice(0, 6)
  const otherAmount = sortedData.slice(6).reduce((sum, d) => sum + d.amount, 0)

  const chartData = otherAmount > 0
    ? [...topCategories, { name: "Other", color: "#94a3b8", amount: otherAmount }]
    : topCategories

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Spending by Category</CardTitle>
        <CardDescription>
          {data.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="amount"
                onClick={(entry) => {
                  if (onCategoryClick && entry.name !== "Other") {
                    onCategoryClick(entry.name)
                  }
                }}
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    strokeWidth={activeIndex === index ? 3 : 0}
                    cursor={onCategoryClick && entry.name !== "Other" ? "pointer" : "default"}
                    opacity={activeIndex !== null && activeIndex !== index ? 0.6 : 1}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const percentage = total > 0 ? ((data.amount / total) * 100).toFixed(1) : "0"
                    return (
                      <div className="bg-background/95 backdrop-blur-sm border rounded-xl p-3 shadow-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
                          <p className="font-semibold text-sm">{data.name}</p>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="font-bold text-lg">{formatCurrency(data.amount)}</p>
                          <p className="text-muted-foreground text-sm">{percentage}%</p>
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category list */}
        <div className="mt-4 space-y-3">
          {topCategories.slice(0, 5).map((cat) => {
            const percentage = total > 0 ? ((cat.amount / total) * 100).toFixed(1) : "0"
            return (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-muted-foreground tabular-nums">{percentage}%</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(cat.amount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
