"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { subDays, format, startOfMonth } from "date-fns";
import { 
  checkFeatureLimit, 
  consumeResource,
  type FeatureCheckResult 
} from "@/lib/subscription/feature-gate-service";
import { 
  decodeCursor,
  encodeCursor,
  buildPrismaCursorWhere,
  buildPrismaOrderBy,
  type PaginatedResult 
} from "@/lib/pagination/cursor-pagination";
import { FeatureGateError } from "@/lib/errors";
import type { ExpenseChangeValues } from "@/types/expense-history";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Helper to get the current user's company ID from database
 * (not from session/JWT to avoid stale data after onboarding)
 */
async function getCurrentUserCompanyId(): Promise<string | null> {
  const session = await auth();
  
  if (!session?.user?.id) {
    return null;
  }
  
  // Query database for fresh companyId (not JWT token)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { companyId: true }
  });
  
  return user?.companyId || null;
}

/**
 * Serialize expense data to plain objects
 * Converts Decimal amounts to strings for client components
 */
interface ExpenseWithRelations {
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

function serializeExpense(expense: ExpenseWithRelations) {
  return {
    ...expense,
    amount: expense.amount.toString(), // Convert Decimal to string
  };
}

/**
 * Default pagination limit
 */
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

/**
 * Result type for create expense action
 */
type CreateExpenseResult = 
  | { success: true; expense: SerializedExpense }
  | { success: false; error: string; code?: "LIMIT_EXCEEDED" | "UNAUTHORIZED" | "VALIDATION_ERROR" | "RATE_LIMITED" };

/**
 * Result type for paginated expenses
 */
type GetPaginatedExpensesResult = 
  | PaginatedResult<SerializedExpense>
  | { error: string; code?: "UNAUTHORIZED" };

/**
 * Result type for all expenses (backward compatible)
 */
type GetExpensesResult = 
  | SerializedExpense[]
  | { error: string };

/**
 * Serialized expense type for client components
 */
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
    });

    // Serialize expenses to convert Decimal to plain strings
    const serializedExpenses = expenses.map(serializeExpense);

    return serializedExpenses;
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
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

    // Decode cursor if provided
    const cursor = decodeCursor(params.cursor);

    // Build Prisma query
    const whereClause = {
      companyId,
      ...(buildPrismaCursorWhere(cursor, "forward") ?? {}),
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
      orderBy: buildPrismaOrderBy(),
      take: limit + 1, // Fetch one extra to check for next page
    });

    // Check if there's a next page
    const hasNextPage = expenses.length > limit;
    const items = hasNextPage ? expenses.slice(0, limit) : expenses;

    // Serialize expenses to convert Decimal to plain strings
    const serializedItems = items.map(serializeExpense);

    // Build page info using cursor encoding
    const startCursor = serializedItems.length > 0 
      ? encodeCursor({ v: "v1", id: serializedItems[0].id, d: serializedItems[0].createdAt.toISOString() })
      : null;
    const endCursor = serializedItems.length > 0 
      ? encodeCursor({ v: "v1", id: serializedItems[serializedItems.length - 1].id, d: serializedItems[serializedItems.length - 1].createdAt.toISOString() })
      : null;

    return {
      items: serializedItems,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        startCursor,
        endCursor,
        totalCount: undefined, // Not efficient to count in cursor pagination
      },
    };
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expenses",
    };
  }
}

/**
 * Get expense statistics for the current user's company
 * Returns total expenses, this month's expenses, and breakdown by category
 */
export async function getExpenseStats() {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all expenses for the company
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      include: {
        category: true,
      },
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    // Calculate this month's expenses
    const thisMonth = expenses
      .filter((expense) => expense.date >= startOfMonth)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Group by category
    const byCategoryMap = new Map<
      string,
      { name: string; color: string; amount: number }
    >();

    for (const expense of expenses) {
      const categoryName = expense.category.name;
      const categoryColor = expense.category.color;
      const current = byCategoryMap.get(categoryName) || {
        name: categoryName,
        color: categoryColor,
        amount: 0,
      };
      current.amount += Number(expense.amount);
      byCategoryMap.set(categoryName, current);
    }

    const byCategory = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    return {
      totalExpenses,
      thisMonth,
      byCategory,
    };
  } catch (error) {
    console.error("Failed to fetch expense stats:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expense stats",
    };
  }
}

/**
 * Create a new expense with feature limit enforcement and rate limiting
 * Validates input data and creates expense for current user's company
 */
export async function createExpense(formData: FormData): Promise<CreateExpenseResult> {
  // Apply rate limiting at the start
  try {
    // Check action rate limit
    const actionLimit = await import("@/lib/rate-limit").then(m => m.checkRateLimit("expense-action", { tier: "action" }));
    if (!actionLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }

    // Check user rate limit
    const headersList = await import("next/headers").then(m => m.headers());
    const userId = headersList.get("x-user-id") ?? "anonymous";
    const userLimit = await import("@/lib/rate-limit").then(m => m.checkRateLimit(userId, { tier: "action" }));
    if (!userLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
    }
  } catch {
    // Continue if rate limiting fails
  }

  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }

    // Parse form data into object
    const rawData = {
      amount: formData.get("amount") as string,
      description: formData.get("description") as string,
      date: formData.get("date") as string,
      categoryId: formData.get("categoryId") as string,
    };

    // Validate with Zod
    const result = createExpenseSchema.safeParse(rawData);

    if (!result.success) {
      return {
        success: false,
        error: "Invalid data: " + result.error.issues.map(i => i.message).join(", "),
        code: "VALIDATION_ERROR",
      };
    }

    const validated = result.data;

    // Check feature limit before creating
    let limitCheck: FeatureCheckResult;
    try {
      limitCheck = await checkFeatureLimit(companyId, "expense", 1);
    } catch (error) {
      console.error("Failed to check feature limit:", error);
      // Gracefully handle limit check failure - allow creation
      limitCheck = { allowed: true, remaining: Infinity };
    }

    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.reason ?? "Monthly expense limit exceeded",
        code: "LIMIT_EXCEEDED",
      };
    }

    // Use transaction: consume resource + create expense atomically
    const expense = await prisma.$transaction(async (tx) => {
      // Consume the resource
      try {
        await consumeResource(companyId, "expense", 1);
      } catch (error) {
        // If limit was exceeded during transaction, abort
        if (error instanceof FeatureGateError) {
          throw error;
        }
        // For other errors, log but continue (graceful degradation)
        console.error("Failed to consume resource:", error);
      }

      // Create the expense
      const newExpense = await tx.expense.create({
        data: {
          amount: validated.amount,
          description: validated.description,
          date: new Date(validated.date),
          categoryId: validated.categoryId,
          userId: session.user.id,
          companyId: companyId,
        },
      });

      return newExpense;
    }).catch((error: Error) => {
      if (error instanceof FeatureGateError) {
        throw error;
      }
      throw new Error(`Transaction failed: ${error.message}`);
    });

    revalidatePath("/dashboard");
    revalidatePath("/expenses");

    // Return serialized expense (Decimal -> string)
    return { success: true, expense: serializeExpense(expense) };
  } catch (error) {
    console.error("Failed to create expense:", error);
    
    if (error instanceof FeatureGateError) {
      return {
        success: false,
        error: error.message,
        code: "LIMIT_EXCEEDED",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}

/**
 * Update an expense with full audit trail
 * - MEMBER: Can only edit their own expenses
 * - ADMIN: Can edit any expense in their company
 */
export async function updateExpense(id: string, formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const userName = session.user.name || session.user.email;

    // Find the expense with full details for audit
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: true,
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!existingExpense) {
      return { error: "Expense not found" };
    }

    // Check company membership
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true }
    });

    if (user?.companyId !== existingExpense.companyId) {
      return { error: "Not authorized - expense belongs to different company" };
    }

    // Permission check: MEMBER can only edit own, ADMIN can edit all
    const isOwner = existingExpense.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return { error: "Not authorized - you can only edit your own expenses" };
    }

    // Parse and validate form data
    const rawData = {
      amount: formData.get("amount") as string,
      description: formData.get("description") as string,
      date: formData.get("date") as string,
      categoryId: formData.get("categoryId") as string,
    };

    const result = updateExpenseSchema.safeParse(rawData);

    if (!result.success) {
      return {
        error: "Invalid data",
        details: result.error.issues,
      };
    }

    const validated = result.data;

    // Prepare old values for audit trail
    const oldValues = {
      amount: existingExpense.amount.toString(),
      description: existingExpense.description,
      date: existingExpense.date.toISOString(),
      categoryId: existingExpense.categoryId,
      categoryName: existingExpense.category.name,
    };

    // Prepare new values for audit trail
    const newValues = {
      amount: validated.amount,
      description: validated.description,
      date: validated.date,
      categoryId: validated.categoryId,
    };

    // Get new category name for audit
    const newCategory = await prisma.category.findUnique({
      where: { id: validated.categoryId },
      select: { name: true }
    });

    // Perform update and create audit trail in transaction
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // Update the expense
      const expense = await tx.expense.update({
        where: { id },
        data: {
          amount: validated.amount,
          description: validated.description,
          date: new Date(validated.date),
          categoryId: validated.categoryId,
        },
      });

      // Create audit trail record
      await tx.expenseHistory.create({
        data: {
          expenseId: id,
          editedBy: userId,
          editedByName: userName || undefined,
          editedAt: new Date(),
          oldValues: JSON.stringify(oldValues),
          newValues: JSON.stringify({
            ...newValues,
            categoryName: newCategory?.name,
          }),
          changeType: "UPDATE",
          // If admin is editing someone else's expense, note it
          reason: (!isOwner && isAdmin) ? `Admin edit by ${userName}` : undefined,
        },
      });

      return expense;
    });

    revalidatePath("/dashboard");

    console.log(`[AUDIT] Expense ${id} updated by ${userName} (${userRole})`);

    return { 
      success: true, 
      expense: serializeExpense(updatedExpense)
    };
  } catch (error) {
    console.error("Failed to update expense:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update expense",
    };
  }
}

/**
 * Get audit history for an expense
 * Only accessible by admins or the expense owner
 */
export async function getExpenseHistory(id: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { userId: true, companyId: true }
    });

    if (!expense) {
      return { error: "Expense not found" };
    }

    // Check permissions
    const isOwner = expense.userId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      return { error: "Not authorized" };
    }

    // Get history
    const history = await prisma.expenseHistory.findMany({
      where: { expenseId: id },
      orderBy: { editedAt: "desc" },
    });

    // Parse JSON values for display
    const parsedHistory = history.map(h => ({
      ...h,
      oldValues: JSON.parse(h.oldValues) as ExpenseChangeValues,
      newValues: JSON.parse(h.newValues) as ExpenseChangeValues,
    }));

    return { success: true, history: parsedHistory };
  } catch (error) {
    console.error("Failed to get expense history:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get history",
    };
  }
}

/**
 * Delete an expense by ID
 * Only allows deletion by the expense creator or an admin
 */
export async function deleteExpense(id: string) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    // Find the expense
    const expense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return { error: "Expense not found" };
    }

    // Check if user owns the expense or is an admin
    const isOwner = expense.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { error: "Not authorized" };
    }

    // Delete the expense
    await prisma.expense.delete({
      where: { id },
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete expense",
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

    const categories = await prisma.category.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    });

    return categories;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch categories",
    };
  }
}

/**
 * Filter parameters for expense queries
 */
export interface ExpenseFilters {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  categoryIds?: string[];
  amountMin?: number | null;
  amountMax?: number | null;
  search?: string;
}

/**
 * Get expenses with advanced filters using cursor-based pagination
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

    // Decode cursor if provided
    const cursor = decodeCursor(params.cursor);

    // Build where clause with filters
    const whereClause: Record<string, unknown> = {
      companyId,
      ...(buildPrismaCursorWhere(cursor, "forward") ?? {}),
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
      orderBy: buildPrismaOrderBy(),
      take: limit + 1, // Fetch one extra to check for next page
    });

    // Check if there's a next page
    const hasNextPage = expenses.length > limit;
    const items = hasNextPage ? expenses.slice(0, limit) : expenses;

    // Serialize expenses to convert Decimal to plain strings
    const serializedItems = items.map(serializeExpense);

    // Build page info using cursor encoding
    const startCursor = serializedItems.length > 0
      ? encodeCursor({ v: "v1", id: serializedItems[0].id, d: serializedItems[0].createdAt.toISOString() })
      : null;
    const endCursor = serializedItems.length > 0
      ? encodeCursor({ v: "v1", id: serializedItems[serializedItems.length - 1].id, d: serializedItems[serializedItems.length - 1].createdAt.toISOString() })
      : null;

    return {
      items: serializedItems,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
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
 * Bulk delete multiple expenses
 * Only admins can bulk delete, members can only delete their own
 */
export async function bulkDeleteExpenses(expenseIds: string[]): Promise<
  | { success: true; deletedCount: number }
  | { success: false; error: string }
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const isAdmin = session.user.role === UserRole.ADMIN;

    // Get current user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return { success: false, error: "User not assigned to company" };
    }

    // Verify all expenses belong to the user's company and check permissions
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        companyId: user.companyId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (expenses.length === 0) {
      return { success: false, error: "No expenses found" };
    }

    // Filter expenses that can be deleted
    const deletableIds = expenses
      .filter((expense) => isAdmin || expense.userId === userId)
      .map((expense) => expense.id);

    if (deletableIds.length === 0) {
      return { success: false, error: "Not authorized to delete these expenses" };
    }

    // Delete the expenses
    const result = await prisma.expense.deleteMany({
      where: {
        id: { in: deletableIds },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error) {
    console.error("Failed to bulk delete expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete expenses",
    };
  }
}

/**
 * Bulk update category for multiple expenses
 */
export async function bulkUpdateCategory(
  expenseIds: string[],
  categoryId: string
): Promise<
  | { success: true; updatedCount: number }
  | { success: false; error: string }
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const userName = session.user.name || session.user.email;
    const isAdmin = session.user.role === UserRole.ADMIN;

    // Get current user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return { success: false, error: "User not assigned to company" };
    }

    // Verify the category belongs to the company
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        companyId: user.companyId,
      },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Verify all expenses belong to the user's company and check permissions
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        companyId: user.companyId,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (expenses.length === 0) {
      return { success: false, error: "No expenses found" };
    }

    // Filter expenses that can be updated
    const updatableIds = expenses
      .filter((expense) => isAdmin || expense.userId === userId)
      .map((expense) => expense.id);

    if (updatableIds.length === 0) {
      return { success: false, error: "Not authorized to update these expenses" };
    }

    // Update the expenses
    const result = await prisma.expense.updateMany({
      where: {
        id: { in: updatableIds },
      },
      data: {
        categoryId,
      },
    });

    // Create audit history entries for bulk update
    await prisma.expenseHistory.createMany({
      data: updatableIds.map((expenseId) => ({
        expenseId,
        editedBy: userId,
        editedByName: userName || undefined,
        editedAt: new Date(),
        oldValues: JSON.stringify({ categoryId: "previous" }),
        newValues: JSON.stringify({ categoryId, categoryName: category.name }),
        changeType: "UPDATE",
        reason: "Bulk category update",
      })),
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");

    return {
      success: true,
      updatedCount: result.count,
    };
  } catch (error) {
    console.error("Failed to bulk update categories:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update categories",
    };
  }
}

/**
 * Export expenses to CSV format
 * Returns CSV content as string
 */
export async function exportExpensesCSV(filters: ExpenseFilters = {}): Promise<
  | { success: true; csvContent: string; filename: string }
  | { success: false; error: string }
> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { success: false, error: "User not assigned to company" };
    }

    // Get company name for filename
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

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

    // Fetch all matching expenses (limit to 10,000 for performance)
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
      take: 10000,
    });

    // CSV headers
    const headers = ["Date", "Description", "Category", "Amount", "User", "Created At"];

    // CSV rows
    const rows = expenses.map((expense) => [
      format(expense.date, "yyyy-MM-dd"),
      `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
      expense.category?.name || "Uncategorized",
      expense.amount.toString(),
      expense.user?.name || expense.user?.email || "Unknown",
      format(expense.createdAt, "yyyy-MM-dd HH:mm:ss"),
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // Generate filename
    const dateStr = format(new Date(), "yyyy-MM-dd");
    const companySlug = company?.name?.replace(/\s+/g, "_").toLowerCase() || "expenses";
    const filename = `${companySlug}_expenses_${dateStr}.csv`;

    return {
      success: true,
      csvContent,
      filename,
    };
  } catch (error) {
    console.error("Failed to export expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to export expenses",
    };
  }
}

/**
 * Get analytics data for charts
 * Returns time-series data and aggregations for the specified date range
 */
export async function getAnalyticsData(days: number = 90) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Fetch expenses in date range
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { date: "asc" },
    });

    // 1. Monthly Trend Data
    const monthlyMap = new Map<string, number>();
    
    // Initialize all months in range with 0
    let currentMonth = startOfMonth(startDate);
    const lastMonth = startOfMonth(endDate);
    
    while (currentMonth <= lastMonth) {
      const monthKey = format(currentMonth, "yyyy-MM");
      monthlyMap.set(monthKey, 0);
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    }

    // Aggregate expenses by month
    for (const expense of expenses) {
      const monthKey = format(expense.date, "yyyy-MM");
      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, current + Number(expense.amount));
    }

    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month: format(new Date(month + "-01"), "MMM yyyy"),
      amount,
      monthKey: month,
    }));

    // 2. Category Distribution
    const categoryMap = new Map<string, { name: string; color: string; amount: number }>();
    
    for (const expense of expenses) {
      const key = expense.category.id;
      const current = categoryMap.get(key) || {
        name: expense.category.name,
        color: expense.category.color,
        amount: 0,
      };
      current.amount += Number(expense.amount);
      categoryMap.set(key, current);
    }

    const categoryDistribution = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount);

    // 3. User Spending (for admin view)
    const userMap = new Map<string, { name: string; email: string; amount: number; count: number }>();
    
    for (const expense of expenses) {
      const key = expense.user.id;
      const current = userMap.get(key) || {
        name: expense.user.name || expense.user.email?.split("@")[0] || "Unknown",
        email: expense.user.email || "",
        amount: 0,
        count: 0,
      };
      current.amount += Number(expense.amount);
      current.count += 1;
      userMap.set(key, current);
    }

    const userSpending = Array.from(userMap.values())
      .sort((a, b) => b.amount - a.amount);

    // 4. Summary Stats
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCount = expenses.length;
    const averageExpense = totalCount > 0 ? totalAmount / totalCount : 0;

    return {
      success: true,
      data: {
        monthlyTrend,
        categoryDistribution,
        userSpending,
        summary: {
          totalAmount,
          totalCount,
          averageExpense,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Failed to get analytics data:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to get analytics data",
    };
  }
}
