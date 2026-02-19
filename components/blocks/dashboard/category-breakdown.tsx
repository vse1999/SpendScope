import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"

interface Category {
  name: string
  amount: number
  color: string
}

interface CategoryBreakdownProps {
  categories: Category[]
  totalExpenses: number
}

export function CategoryBreakdown({ categories, totalExpenses }: CategoryBreakdownProps) {
  const hasCategories = categories.length > 0
  const safeTotal = totalExpenses || 1

  return (
    <Card className="app-card-strong">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">By Category</CardTitle>
        <CardDescription>Spending breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCategories ? (
          <p className="text-sm text-muted-foreground text-center py-6">No data available</p>
        ) : (
          <div className="space-y-5">
            {categories.map((category) => {
              const percentage = ((category.amount / safeTotal) * 100).toFixed(1)
              return (
                <div key={category.name} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground tabular-nums">{percentage}%</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        backgroundColor: category.color,
                        width: `${Math.min((category.amount / safeTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
