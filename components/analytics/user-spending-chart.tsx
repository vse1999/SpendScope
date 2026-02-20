"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import type { UserSpending } from "@/types/analytics"

interface UserSpendingChartProps {
  data: UserSpending[]
}

interface ProcessedUserData extends UserSpending {
  percentage: number
  initials: string
  avgAmount: number
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function truncateName(name: string, maxLength: number = 18): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 1) + "..."
}

export function UserSpendingChart({ data }: UserSpendingChartProps) {
  // Process and sort data
  const { sortedData, totalAmount, maxAmount, hasData } = useMemo(() => {
    if (data.length === 0) {
      return { sortedData: [], totalAmount: 0, maxAmount: 0, hasData: false }
    }

    const sorted = [...data].sort((a, b) => b.amount - a.amount)
    const total = data.reduce((sum, d) => sum + d.amount, 0)
    const max = sorted[0]?.amount ?? 0

    const processed: ProcessedUserData[] = sorted.map((user) => ({
      ...user,
      percentage: total > 0 ? Math.round((user.amount / total) * 100) : 0,
      initials: getInitials(user.name),
      avgAmount: user.count > 0 ? user.amount / user.count : 0,
    }))

    return { sortedData: processed, totalAmount: total, maxAmount: max, hasData: true }
  }, [data])

  // Calculate dynamic height based on member count
  const chartHeight = useMemo(() => {
    const itemHeight = 52 // Height per row including gap
    const minHeight = 200
    const maxHeight = 600
    const calculatedHeight = Math.max(minHeight, sortedData.length * itemHeight + 24)
    return Math.min(maxHeight, calculatedHeight)
  }, [sortedData.length])

  // Empty state
  if (!hasData) {
    return (
      <Card className="app-card-strong">
        <CardHeader>
          <CardTitle className="text-lg">Spending by Team Member</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <svg
                className="w-7 h-7 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">No spending data</p>
            <p className="text-xs text-muted-foreground mt-1">
              Team members will appear here once they add expenses
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="app-card-strong">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Spending by Team Member</CardTitle>
        <CardDescription>
          {data.length} member{data.length !== 1 ? "s" : ""} | {formatCurrency(totalAmount.toString())} total
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div 
          className="overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
          style={{ maxHeight: chartHeight }}
        >
          <div className="space-y-3">
            {sortedData.map((user) => {
              const barWidth = maxAmount > 0 ? (user.amount / maxAmount) * 100 : 0
              
              return (
                <div
                  key={user.email}
                  className="group flex items-center gap-4 py-2"
                >
                  {/* Avatar with initials */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">
                      {user.initials}
                    </span>
                  </div>

                  {/* Name and amount */}
                  <div className="shrink-0 w-32 sm:w-40">
                    <p 
                      className="text-sm font-medium text-foreground truncate"
                      title={user.name}
                    >
                      {truncateName(user.name)}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(user.amount)}
                    </p>
                  </div>

                  {/* Bar and percentage */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Progress bar */}
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-brand rounded-full" style={{ width: `${barWidth}%` }} />
                      </div>
                      
                      {/* Percentage */}
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums w-9 text-right">
                        {user.percentage}%
                      </span>
                    </div>
                    
                    {/* Secondary info: expense count and average */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-muted-foreground/70">
                        {user.count} expense{user.count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50">|</span>
                      <span className="text-[11px] text-muted-foreground/70">
                        avg {formatCurrency(user.avgAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
