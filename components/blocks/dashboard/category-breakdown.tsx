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
    <Card>
      <CardHeader>
        <CardTitle>By Category</CardTitle>
        <CardDescription>Spending breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCategories ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data available</p>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.name} className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate text-foreground">{category.name}</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatCurrency(category.amount)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        backgroundColor: category.color,
                        width: `${Math.min((category.amount / safeTotal) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
