"use client"

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateExpense, getExpenseHistory } from "@/app/actions/expenses"
import { toast } from "sonner"
import type { ExpenseHistoryItem } from "@/types/expense-history"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
}

interface EditExpenseDialogProps {
  expense: Expense | null
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  canEdit: boolean
  isAdmin: boolean
}

// Helper to create initial form data from expense
function createInitialFormData(expense: Expense | null) {
  if (!expense) {
    return {
      amount: "",
      description: "",
      date: new Date(),
      categoryId: "",
    }
  }
  return {
    amount: expense.amount,
    description: expense.description,
    date: expense.date instanceof Date ? expense.date : new Date(expense.date),
    categoryId: expense.categoryId,
  }
}

export function EditExpenseDialog({
  expense,
  categories,
  isOpen,
  onClose,
  onSuccess,
  canEdit,
}: EditExpenseDialogProps): React.ReactElement | null {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [showHistory, setShowHistory] = useState<boolean>(false)
  const [history, setHistory] = useState<ExpenseHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  
  // Use useMemo to create stable initial form data based on expense
  const initialFormData = useMemo(() => createInitialFormData(expense), [expense])
  const [formData, setFormData] = useState(initialFormData)

  // Handle dialog close with state reset
  const handleOpenChange = useCallback((open: boolean): void => {
    if (!open) {
      setShowHistory(false)
      setHistory([])
      onClose()
    }
  }, [onClose])

  // Load audit history
  const loadHistory = useCallback(async (): Promise<void> => {
    if (!expense) return
    setIsLoadingHistory(true)
    const result = await getExpenseHistory(expense.id)
    if (result.success && result.history) {
      setHistory(result.history as ExpenseHistoryItem[])
    }
    setIsLoadingHistory(false)
  }, [expense])

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!expense) return

    setIsSubmitting(true)

    const data = new FormData()
    data.append("amount", formData.amount)
    data.append("description", formData.description)
    data.append("date", formData.date.toISOString().split("T")[0])
    data.append("categoryId", formData.categoryId)

    const result = await updateExpense(expense.id, data)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Expense updated successfully")
      onSuccess()
      onClose()
    }

    setIsSubmitting(false)
  }, [expense, formData, onSuccess, onClose])

  if (!expense) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>
            Make changes to your expense here. All edits are logged for accountability.
          </DialogDescription>
        </DialogHeader>

        {!canEdit && (
          <Alert variant="destructive">
            <AlertDescription>
              You can only edit your own expenses. Contact an admin if you need to modify this expense.
            </AlertDescription>
          </Alert>
        )}

        {canEdit && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What was this expense for?"
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData({ ...formData, date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Audit History Section */}
        <div className="border-t pt-4 mt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!showHistory) void loadHistory()
              setShowHistory(!showHistory)
            }}
            disabled={isLoadingHistory}
          >
            <History className="mr-2 h-4 w-4" />
            {showHistory ? "Hide" : "Show"} Edit History
          </Button>

          {showHistory && (
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No edits yet. This expense has not been modified.
                </p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="text-sm border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {h.editedByName || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(h.editedAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    {h.reason && (
                      <p className="text-xs text-amber-600 mb-2">{h.reason}</p>
                    )}
                    <div className="space-y-1 text-xs">
                      {h.oldValues.amount !== h.newValues.amount && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="line-through text-red-500">${h.oldValues.amount}</span>
                          <span className="text-green-600">${h.newValues.amount}</span>
                        </div>
                      )}
                      {h.oldValues.description !== h.newValues.description && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Description:</span>
                          <span className="line-through text-red-500">{h.oldValues.description}</span>
                          <span className="text-green-600">{h.newValues.description}</span>
                        </div>
                      )}
                      {h.oldValues.categoryName !== h.newValues.categoryName && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Category:</span>
                          <span className="line-through text-red-500">{h.oldValues.categoryName}</span>
                          <span className="text-green-600">{h.newValues.categoryName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
