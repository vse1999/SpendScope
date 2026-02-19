"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Building2, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/format-utils"
import { Button } from "@/components/ui/button"
import { EditExpenseDialog } from "./edit-expense-dialog"
import { deleteExpense } from "@/app/actions/expenses"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { UserRole } from "@prisma/client"

interface Category {
  id: string
  name: string
  color: string
}

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

interface ExpenseTableProps {
  expenses: Expense[]
  categories: Category[]
  currentUserId: string
  currentUserRole: UserRole
}

export function ExpenseTable({
  expenses,
  categories,
  currentUserId,
  currentUserRole
}: ExpenseTableProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = currentUserRole === UserRole.ADMIN

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingExpense) return

    setIsDeleting(true)
    const result = await deleteExpense(deletingExpense.id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Expense deleted successfully")
      // Refresh the page to show updated data
      window.location.reload()
    }

    setIsDeleting(false)
    setDeletingExpense(null)
  }

  const canEdit = (expense: Expense) => {
    return expense.userId === currentUserId || isAdmin
  }

  const canDelete = (): boolean => {
    // Only admins can delete (for safety)
    return isAdmin
  }

  const hasExpenses = expenses.length > 0

  return (
    <>
      <Card className="app-card-strong">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pl-6">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 w-[100px] pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className="group hover:bg-muted/35 transition-colors">
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
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit(expense) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg"
                              onClick={() => handleEdit(expense)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                              onClick={() => setDeletingExpense(expense)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditExpenseDialog
        expense={editingExpense}
        categories={categories}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingExpense(null)
        }}
        onSuccess={() => {
          window.location.reload()
        }}
        canEdit={editingExpense ? canEdit(editingExpense) : false}
        isAdmin={isAdmin}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingExpense} onOpenChange={() => setDeletingExpense(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
              {deletingExpense && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="font-medium">{deletingExpense.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(deletingExpense.amount)} - {format(new Date(deletingExpense.date), "MMM d, yyyy")}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
