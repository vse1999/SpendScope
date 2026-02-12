import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"
import { Calculator, TrendingUp, Layers } from "lucide-react"

interface QuickStatsProps {
  averageExpense: number
  largestExpense: number
  categoryCount: number
}

export function QuickStats({ averageExpense, largestExpense, categoryCount }: QuickStatsProps) {
  const hasData = averageExpense > 0 || largestExpense > 0 || categoryCount > 0

  const stats = [
    {
      label: "Average Expense",
      value: hasData ? formatCurrency(averageExpense) : "—",
      icon: Calculator,
      color: "text-blue-500",
    },
    {
      label: "Largest Expense",
      value: hasData ? formatCurrency(largestExpense) : "—",
      icon: TrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Categories Used",
      value: categoryCount.toString(),
      icon: Layers,
      color: "text-violet-500",
    },
  ]

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Stats</CardTitle>
        <CardDescription>Monthly insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {stats.map((stat, index) => (
          <div key={stat.label}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{stat.value}</span>
            </div>
            {index < stats.length - 1 && (
              <div className="h-px bg-border" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
