import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2 } from "lucide-react"
import { format } from "date-fns"
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

interface ExpenseListProps {
  expenses: Expense[]
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const hasExpenses = expenses.length > 0

  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasExpenses ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No expenses yet. Add your first expense!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.slice(0, 10).map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(expense.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      {expense.category ? (
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: expense.category.color + "20",
                            color: expense.category.color,
                            borderColor: expense.category.color + "40",
                          }}
                        >
                          {expense.category.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Uncategorized</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
