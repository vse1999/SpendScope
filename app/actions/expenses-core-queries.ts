"use server";

import { prisma } from "@/lib/prisma";
import { resolveCursorId, serializeExpense } from "@/lib/expenses/action-helpers";
import { getCategoriesForCompany } from "@/lib/dashboard/queries";
import { createLogger } from "@/lib/monitoring/logger";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT, getCurrentUserCompanyId } from "./expenses-shared";
import type {
  GetExpensesResult,
  GetPaginatedExpensesResult,
} from "./expenses-types";

const LEGACY_EXPENSES_FETCH_LIMIT = 500;
const logger = createLogger("expenses-core-queries");

/**
 * Get all expenses for the current user's company
 * Backward compatible - returns array of expenses
 */
export async function getExpensesByCompany(): Promise<GetExpensesResult> {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    const expenses = await prisma.expense.findMany({
      where: { companyId },
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
      take: LEGACY_EXPENSES_FETCH_LIMIT,
    });

    // Serialize expenses to convert Decimal to plain strings
    const serializedExpenses = expenses.map(serializeExpense);

    return serializedExpenses;
  } catch (error) {
    logger.error("Failed to fetch expenses by company", { error });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expenses",
    };
  }
}

/**
 * Get paginated expenses using cursor-based pagination
 * @param params - Pagination parameters (cursor, limit)
 * @returns Paginated result with page info
 */
export async function getPaginatedExpenses(
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

    const cursorId = resolveCursorId(params.cursor);

    // Build Prisma query
    const whereClause = {
      companyId,
    };

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
      orderBy: { date: "desc" },
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      take: limit + 1, // Fetch one extra to check for next page
    });

    // Check if there's a next page
    const hasNextPage = expenses.length > limit;
    const items = hasNextPage ? expenses.slice(0, limit) : expenses;

    // Serialize expenses to convert Decimal to plain strings
    const serializedItems = items.map(serializeExpense);

    // Build page info using cursor encoding
    const startCursor = serializedItems.length > 0
      ? serializedItems[0].id
      : null;
    const endCursor = serializedItems.length > 0
      ? serializedItems[serializedItems.length - 1].id
      : null;

    return {
      items: serializedItems,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursorId !== null,
        startCursor,
        endCursor,
        totalCount: undefined, // Not efficient to count in cursor pagination
      },
    };
  } catch (error) {
    logger.error("Failed to fetch paginated expenses", { error, params });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expenses",
    };
  }
}

/**
 * Get all categories for the current user's company
 */
export async function getCategories() {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }
    return getCategoriesForCompany(companyId);
  } catch (error) {
    logger.error("Failed to fetch categories", { error });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch categories",
    };
  }
}
