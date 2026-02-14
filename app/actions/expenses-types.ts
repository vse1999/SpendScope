import type { PaginatedResult } from "@/lib/pagination/cursor-pagination";
import type { MultiSortConfig } from "@/lib/expense-sorting";

export interface SerializedExpense {
  id: string;
  amount: string;
  description: string;
  date: Date;
  categoryId: string;
  userId: string;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string; color: string };
  user?: { name: string | null; email: string | null };
}

export type CreateExpenseResult =
  | { success: true; expense: SerializedExpense }
  | {
    success: false;
    error: string;
    code?: "LIMIT_EXCEEDED" | "UNAUTHORIZED" | "VALIDATION_ERROR" | "RATE_LIMITED" | "BUDGET_EXCEEDED";
  };

export type GetPaginatedExpensesResult =
  | PaginatedResult<SerializedExpense>
  | { error: string; code?: "UNAUTHORIZED" };

export type GetExpensesResult =
  | SerializedExpense[]
  | { error: string };

export interface ExpenseFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  categoryIds?: string[];
  amountMin?: number | null;
  amountMax?: number | null;
  search?: string;
  sort?: MultiSortConfig;
}

