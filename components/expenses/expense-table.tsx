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

  const canDelete = (expense: Expense) => {
    // Only admins can delete (for safety)
    return isAdmin
  }

  const hasExpenses = expenses.length > 0

  return (
    <>
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
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canEdit(expense) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete(expense) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeletingExpense(expense)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                    {formatCurrency(deletingExpense.amount)} • {format(new Date(deletingExpense.date), "MMM d, yyyy")}
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
