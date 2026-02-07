/**
 * Expense History Types
 * Enterprise audit trail for expense changes
 */

export interface ExpenseChangeValues {
  amount?: string
  description?: string
  date?: string
  categoryId?: string
  categoryName?: string
}

/**
 * Raw history record from database (before JSON parsing)
 */
export interface ExpenseHistoryRecord {
  id: string
  expenseId: string
  editedBy: string
  editedByName: string | null
  editedAt: Date
  oldValues: string
  newValues: string
  changeType: "UPDATE" | "DELETE" | "CREATE"
  reason: string | null
}

export interface ExpenseHistoryItem {
  id: string
  expenseId: string
  editedBy: string
  editedByName: string | null
  editedAt: Date
  oldValues: ExpenseChangeValues
  newValues: ExpenseChangeValues
  changeType: "UPDATE" | "DELETE" | "CREATE"
  reason: string | null
}

export type ExpenseHistory = ExpenseHistoryItem[]
