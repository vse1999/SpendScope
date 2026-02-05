import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format-utils"

// Type matching the serialized expense from getExpensesByCompany
interface Expense {
  id: string
  amount: string
  description: string
  date: Date
  categoryId: string
  userId: string
  companyId: string
  createdAt: Date
  updatedAt: Date
  category?: { name: string; color: string }
  user?: { name: string | null; email: string | null }
}

interface QuickStatsProps {
  expenses: Expense[]
  totalExpenses: number
  categoryCount: number
}

export function QuickStats({ expenses, totalExpenses, categoryCount }: QuickStatsProps) {
  const hasExpenses = expenses.length > 0

  const averageExpense = hasExpenses ? totalExpenses / expenses.length : 0

  const largestExpense = hasExpenses
    ? Math.max(...expenses.map((e) => parseFloat(e.amount)))
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Stats</CardTitle>
        <CardDescription>Monthly insights</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Average Expense</span>
          <span className="font-medium">
            {hasExpenses ? formatCurrency(averageExpense) : "-$"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Largest Expense</span>
          <span className="font-medium">
            {hasExpenses ? formatCurrency(largestExpense) : "-$"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Categories Used</span>
          <span className="font-medium">{categoryCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
