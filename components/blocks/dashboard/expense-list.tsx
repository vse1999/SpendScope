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
  const visibleExpenses = expenses.slice(0, 10)

  return (
    <Card className="app-card-strong">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
            <CardDescription>Your latest transactions</CardDescription>
          </div>
          {hasExpenses && (
            <Badge variant="secondary" className="text-xs font-medium">
              {expenses.length} total
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {!hasExpenses ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No expenses yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Add your first expense to get started!</p>
            </div>
          ) : (
          <>
            <div className="space-y-3 px-4 md:hidden">
              {visibleExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-xl border border-border/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight break-words">
                        {expense.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {expense.category ? (
                      <Badge
                        variant="secondary"
                        className="text-xs font-medium border"
                        style={{
                          backgroundColor: expense.category.color + "12",
                          color: expense.category.color,
                          borderColor: expense.category.color + "30",
                        }}
                      >
                        {expense.category.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Uncategorized</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pl-6">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 text-right pr-6">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-muted/35 transition-colors">
                      <TableCell className="text-muted-foreground tabular-nums pl-6">
                        {format(new Date(expense.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium border"
                            style={{
                              backgroundColor: expense.category.color + "12",
                              color: expense.category.color,
                              borderColor: expense.category.color + "30",
                            }}
                          >
                            {expense.category.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Uncategorized</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums pr-6">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
