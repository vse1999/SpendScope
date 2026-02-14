import { decodeCursor } from "@/lib/pagination/cursor-pagination";
import type { MultiSortConfig } from "@/lib/expense-sorting";

export interface ExpenseWithRelations {
  id: string;
  amount: { toString(): string };
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

export function serializeExpense<T extends { amount: { toString(): string } }>(
  expense: T
): Omit<T, "amount"> & { amount: string } {
  return {
    ...expense,
    amount: expense.amount.toString(),
  };
}

export function resolveCursorId(cursor: string | null | undefined): string | null {
  if (!cursor) {
    return null;
  }

  const decoded = decodeCursor(cursor);
  if (decoded?.id) {
    return decoded.id;
  }

  return cursor;
}

export function parseOffsetCursor(cursor: string | null | undefined): number | null {
  if (!cursor) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function buildMultiOrderBy(sorts: MultiSortConfig): Array<Record<string, unknown>> {
  const orderBy: Array<Record<string, unknown>> = [];

  for (const sort of sorts) {
    switch (sort.field) {
      case "date":
      case "amount":
      case "createdAt":
        orderBy.push({ [sort.field]: sort.direction });
        break;
      case "category":
        orderBy.push({ category: { name: sort.direction } });
        break;
      case "user":
        orderBy.push({ user: { name: sort.direction } });
        orderBy.push({ user: { email: sort.direction } });
        break;
      default:
        break;
    }
  }

  orderBy.push({ id: "asc" });

  return orderBy;
}
