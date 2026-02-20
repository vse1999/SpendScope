"use client"

import { useEffect, useRef, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"

interface CategoryData {
  name: string
  color: string
  amount: number
}

interface CategoryDistributionChartProps {
  data: CategoryData[]
}

export function CategoryDistributionChart({
  data
}: CategoryDistributionChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)

  const total = data.reduce((sum, d) => sum + d.amount, 0)

  // Sort by amount and take top 6, group rest as "Other"
  const sortedData = [...data].sort((a, b) => b.amount - a.amount)
  const topCategories = sortedData.slice(0, 6)
  const otherAmount = sortedData.slice(6).reduce((sum, d) => sum + d.amount, 0)

  const chartData = otherAmount > 0
    ? [...topCategories, { name: "Other", color: "#94a3b8", amount: otherAmount }]
    : topCategories

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
        <CardTitle className="text-lg">Spending by Category</CardTitle>
        <CardDescription>
          {data.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={chartContainerRef}
          className="h-[280px] w-full min-w-0 select-none pointer-events-none"
        >
          {isChartReady ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <PieChart
                accessibilityLayer={false}
                tabIndex={-1}
                style={{ outline: "none", pointerEvents: "none" }}
              >
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="amount"
                  rootTabIndex={-1}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full" aria-hidden="true" />
          )}
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
