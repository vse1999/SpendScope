"use client"

import { useState } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
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
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>
          {data.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
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
                    stroke={entry.color}
                    strokeWidth={activeIndex === index ? 3 : 1}
                    cursor={onCategoryClick && entry.name !== "Other" ? "pointer" : "default"}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const percentage = total > 0 ? ((data.amount / total) * 100).toFixed(1) : "0"
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-medium" style={{ color: data.color }}>
                          {data.name}
                        </p>
                        <p>{formatCurrency(data.amount)}</p>
                        <p className="text-muted-foreground text-sm">{percentage}%</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Top categories list */}
        <div className="mt-4 space-y-2">
          {topCategories.slice(0, 4).map((cat) => {
            const percentage = total > 0 ? ((cat.amount / total) * 100).toFixed(1) : "0"
            return (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate max-w-[120px]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{percentage}%</span>
                  <span className="font-medium">{formatCurrency(cat.amount)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
