"use server";

import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { buildMultiOrderBy, parseOffsetCursor, serializeExpense } from "@/lib/expenses/action-helpers";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, getCurrentUserCompanyId } from "./expenses-shared";
import type {
  ExpenseFilters,
  GetPaginatedExpensesResult,
} from "./expenses-types";

type ExportExpenseFilters = Omit<ExpenseFilters, "sort">;

const CSV_FORMULA_PREFIX = /^[=+\-@]/;

function encodeCsvCell(value: string): string {
  const neutralizedValue = CSV_FORMULA_PREFIX.test(value.trimStart())
    ? `'${value}`
    : value;

  return `"${neutralizedValue.replace(/"/g, "\"\"")}"`;
}

function buildFilteredWhereClause(companyId: string, filters: ExportExpenseFilters): Record<string, unknown> {
  // Build where clause with filters
  const whereClause: Record<string, unknown> = {
    companyId,
  };

  // Apply date filters
  if (filters.dateFrom || filters.dateTo) {
    whereClause.date = {};
    if (filters.dateFrom) {
      (whereClause.date as Record<string, Date>).gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      (whereClause.date as Record<string, Date>).lte = filters.dateTo;
    }
  }

  // Apply category filter
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    whereClause.categoryId = { in: filters.categoryIds };
  }

  // Apply amount filters
  if (filters.amountMin !== null && filters.amountMin !== undefined) {
    whereClause.amount = {
      ...(whereClause.amount as Record<string, unknown> ?? {}),
      gte: filters.amountMin,
    };
  }
  if (filters.amountMax !== null && filters.amountMax !== undefined) {
    whereClause.amount = {
      ...(whereClause.amount as Record<string, unknown> ?? {}),
      lte: filters.amountMax,
    };
  }

  // Apply search filter (description)
  if (filters.search && filters.search.trim()) {
    whereClause.description = {
      contains: filters.search.trim(),
      mode: "insensitive",
    };
  }

  return whereClause;
}

/**
 * Get expenses with advanced filters using cursor-based pagination
 * Now supports multi-column sorting
 */
export async function getExpensesWithFilters(
  filters: ExpenseFilters,
  params: { cursor?: string | null; limit?: number } = {}
): Promise<GetPaginatedExpensesResult> {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    // Validate and normalize limit
    let limit = params.limit ?? DEFAULT_PAGE_LIMIT;
    if (limit < 1) limit = DEFAULT_PAGE_LIMIT;
    if (limit > MAX_PAGE_LIMIT) limit = MAX_PAGE_LIMIT;

    const cursorOffset = parseOffsetCursor(params.cursor) ?? 0;
    const whereClause = buildFilteredWhereClause(companyId, filters);

    // Build multi-column order by
    const sorts = filters.sort || [{ field: "date", direction: "desc" }];
    const orderBy = buildMultiOrderBy(sorts);

    // Fetch one extra item to determine if there's a next page
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        category: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy,
      skip: cursorOffset,
      take: limit + 1, // Fetch one extra to check for next page
    });

    // Check if there's a next page
    const hasNextPage = expenses.length > limit;
    const items = hasNextPage ? expenses.slice(0, limit) : expenses;

    // Serialize expenses to convert Decimal to plain strings
    const serializedItems = items.map(serializeExpense);

    // Build page info using cursor encoding
    const startCursor = serializedItems.length > 0
      ? String(cursorOffset)
      : null;
    const endCursor = hasNextPage
      ? String(cursorOffset + items.length)
      : null;

    return {
      items: serializedItems,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursorOffset > 0,
        startCursor,
        endCursor,
        totalCount: undefined,
      },
    };
  } catch (error) {
    console.error("Failed to fetch expenses with filters:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expenses",
    };
  }
}

/**
 * Get total count and sum of expenses with filters (for summary stats)
 */
export async function getExpensesSummary(filters: ExpenseFilters = {}): Promise<
  | { count: number; totalAmount: number }
  | { error: string }
> {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    const whereClause = buildFilteredWhereClause(companyId, filters);

    // Aggregate count and sum using Prisma's type-safe queries
    const [count, aggregateResult] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.aggregate({
        where: whereClause,
        _sum: { amount: true },
      }),
    ]);

    return {
      count,
      totalAmount: Number(aggregateResult._sum.amount ?? 0),
    };
  } catch (error) {
    console.error("Failed to get expenses summary:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get expenses summary",
    };
  }
}

/**
 * Export expenses to CSV format
 * Returns CSV content string and filename
 */
export async function exportExpensesCSV(filters: ExportExpenseFilters): Promise<
  | { csvContent: string; filename: string }
  | { error: string; code?: "FORBIDDEN_FEATURE" }
> {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    const exportAccess = await checkFeatureLimit(companyId, "export");
    if (!exportAccess.allowed) {
      return {
        error: exportAccess.reason ?? "CSV export is available on the Pro plan",
        code: "FORBIDDEN_FEATURE",
      };
    }

    const whereClause = buildFilteredWhereClause(companyId, filters);

    // Fetch all matching expenses
    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        category: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    if (expenses.length === 0) {
      return { error: "No expenses to export" };
    }

    // Build CSV content
    const headers = ["Date", "Description", "Category", "User", "Amount"];
    const rows = expenses.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      encodeCsvCell(e.description),
      encodeCsvCell(e.category.name),
      encodeCsvCell(e.user?.name || e.user?.email || "Unknown"),
      e.amount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const filename = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;

    return { csvContent, filename };
  } catch (error) {
    console.error("Failed to export expenses:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to export expenses",
    };
  }
}
