import type { MultiSortConfig, ExpenseSortField } from "@/lib/expense-sorting";

export interface Expense {
  id: string;
  amount: number;
  description: string;
  date: Date;
  category?: {
    id?: string;
    name: string;
    color: string;
  };
  user?: {
    id?: string;
    name: string | null;
    email: string | null;
  };
}

export interface ServerExpenseItem extends Omit<Expense, "amount" | "date"> {
  amount: string | number;
  date: string | Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  _count?: {
    expenses: number;
  };
}

export interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialNextCursor: string | null;
  categories: Category[];
  children?: React.ReactNode;
  summary: {
    count: number;
    total: number;
  };
  filters: {
    cursor?: string;
    dateFrom?: Date;
    dateTo?: Date;
    categoryIds?: string[];
    amountMin?: number;
    amountMax?: number;
    search?: string;
    sort?: MultiSortConfig;
  };
  initialSortConfig: MultiSortConfig;
  isAdmin: boolean;
  billingEnabled: boolean;
}

export type SortField = ExpenseSortField;
