"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import {
  checkFeatureLimit,
  consumeResource,
  decrementResource,
  type FeatureCheckResult
} from "@/lib/subscription/feature-gate-service";
import {
  decodeCursor,
  type PaginatedResult
} from "@/lib/pagination/cursor-pagination";
import { FeatureGateError } from "@/lib/errors";
import type { ExpenseChangeValues } from "@/types/expense-history";
import { createNotification } from "@/app/actions/notifications";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Decimal } from "@prisma/client/runtime/library";
import type { MultiSortConfig } from "@/lib/expense-sorting";

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

function resolveCursorId(cursor: string | null | undefined): string | null {
  if (!cursor) {
    return null;
  }

  const decoded = decodeCursor(cursor);
  if (decoded?.id) {
    return decoded.id;
  }

  return cursor;
}

function parseOffsetCursor(cursor: string | null | undefined): number | null {
  if (!cursor) {
    return null;
  }

  const parsed = Number.parseInt(cursor, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
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
 * Get all dashboard data efficiently using DB aggregation
 * Replaces the need for separate getExpensesByCompany() + getExpenseStats() calls
 */
export async function getDashboardStats() {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    // Get start of current and previous month for trend calculation
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Run all queries in parallel using DB aggregation
    const [
      totalAgg,
      totalCount,
      thisMonthAgg,
      previousMonthAgg,
      categoryGroups,
      recentExpenses,
      largestExpenseAgg,
    ] = await Promise.all([
      // Total amount across all expenses
      prisma.expense.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      // Total count of expenses
      prisma.expense.count({
        where: { companyId },
      }),
      // This month's total
      prisma.expense.aggregate({
        where: { companyId, date: { gte: startOfCurrentMonth } },
        _sum: { amount: true },
      }),
      // Previous month's total (for trend calculation)
      prisma.expense.aggregate({
        where: {
          companyId,
          date: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
        },
        _sum: { amount: true },
      }),
      // Group by category for breakdown
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { companyId },
        _sum: { amount: true },
      }),
      // Recent 10 expenses for the table
      prisma.expense.findMany({
        where: { companyId },
        include: {
          category: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      // Largest single expense
      prisma.expense.aggregate({
        where: { companyId },
        _max: { amount: true },
      }),
    ]);

    // Resolve category names for the breakdown
    const categoryIds = categoryGroups.map((g) => g.categoryId);
    const categories = categoryIds.length > 0
      ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true },
      })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = categoryGroups
      .map((g) => {
        const cat = categoryMap.get(g.categoryId);
        return {
          name: cat?.name || "Uncategorized",
          color: cat?.color || "#888888",
          amount: Number(g._sum.amount ?? 0),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Compute stats
    const totalExpenses = Number(totalAgg._sum.amount ?? 0);
    const thisMonth = Number(thisMonthAgg._sum.amount ?? 0);
    const previousMonth = Number(previousMonthAgg._sum.amount ?? 0);
    const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
    const largestExpense = Number(largestExpenseAgg._max.amount ?? 0);

    // Compute trend
    const monthlyTrend: "up" | "down" = thisMonth >= previousMonth ? "up" : "down";
    const monthlyChangePercent =
      previousMonth > 0
        ? Math.abs(((thisMonth - previousMonth) / previousMonth) * 100).toFixed(1) + "%"
        : totalCount > 0
          ? "N/A"
          : "0%";

    // Serialize recent expenses
    const serializedExpenses = recentExpenses.map(serializeExpense);

    return {
      data: {
        totalExpenses,
        thisMonth,
        previousMonth,
        monthlyTrend,
        monthlyChangePercent,
        expenseCount: totalCount,
        averageExpense,
        largestExpense,
        byCategory,
        recentExpenses: serializedExpenses,
        categoryCount: byCategory.length,
      },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    };
  }
}

/**
 * Get analytics data for charts and visualizations
 * Returns monthly trends, category distribution, and user spending
 */
export async function getAnalyticsData(days: number = 90) {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Fetch expenses with relations
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
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    if (expenses.length === 0) {
      return {
        data: {
          monthlyTrend: [],
          categoryDistribution: [],
          userSpending: [],
          summary: {
            totalAmount: 0,
            totalCount: 0,
            averageExpense: 0,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      };
    }

    // Calculate monthly trend
    const monthlyMap = new Map<string, { month: string; amount: number; monthKey: string }>();

    for (const expense of expenses) {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        monthlyMap.set(monthKey, {
          month: monthName,
          amount: Number(expense.amount),
          monthKey,
        });
      }
    }

    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    // Calculate category distribution
    const categoryMap = new Map<string, { name: string; color: string; amount: number }>();

    for (const expense of expenses) {
      const categoryName = expense.category?.name || "Uncategorized";
      const categoryColor = expense.category?.color || "#888888";

      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          color: categoryColor,
          amount: Number(expense.amount),
        });
      }
    }

    const categoryDistribution = Array.from(categoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // Calculate user spending
    const userMap = new Map<string, { name: string; email: string; amount: number; count: number }>();

    for (const expense of expenses) {
      const email = expense.user?.email || "unknown";
      const name = expense.user?.name || email;

      const existing = userMap.get(email);
      if (existing) {
        existing.amount += Number(expense.amount);
        existing.count += 1;
      } else {
        userMap.set(email, {
          name,
          email,
          amount: Number(expense.amount),
          count: 1,
        });
      }
    }

    const userSpending = Array.from(userMap.values()).sort((a, b) => b.amount - a.amount);

    // Calculate summary
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      data: {
        monthlyTrend,
        categoryDistribution,
        userSpending,
        summary: {
          totalAmount,
          totalCount: expenses.length,
          averageExpense: totalAmount / expenses.length,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch analytics data",
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

    // Ensure category belongs to the current company
    const category = await prisma.category.findFirst({
      where: {
        id: validated.categoryId,
        companyId,
      },
      select: { id: true },
    });

    if (!category) {
      return {
        success: false,
        error: "Invalid category for your company",
        code: "VALIDATION_ERROR",
      };
    }

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

    // Notify all company members about the new expense
    try {
      const companyMembers = await prisma.user.findMany({
        where: { companyId },
        select: { id: true },
      });

      const creatorName = session.user.name || session.user.email || "Someone";
      const amountFormatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(Number(validated.amount));

      // Notify all team members except the creator
      for (const member of companyMembers) {
        if (member.id !== session.user.id) {
          await createNotification(member.id, {
            type: "INFO",
            title: "New Expense Added",
            message: `${creatorName} added ${amountFormatted} for "${validated.description}"`,
            actionUrl: "/dashboard/expenses",
          });
        }
      }
    } catch (notifyError) {
      console.error("Failed to send notifications:", notifyError);
      // Don't fail the expense creation if notifications fail
    }

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
    const newCategory = await prisma.category.findFirst({
      where: {
        id: validated.categoryId,
        companyId: existingExpense.companyId,
      },
      select: { name: true },
    });

    if (!newCategory) {
      return { error: "Invalid category for this company" };
    }

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

    // Notify expense owner if admin edited their expense
    if (!isOwner && isAdmin) {
      try {
        const amountFormatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(validated.amount));

        await createNotification(existingExpense.userId, {
          type: "WARNING",
          title: "Expense Updated by Admin",
          message: `${userName} updated your expense "${validated.description}" to ${amountFormatted}`,
          actionUrl: "/dashboard/expenses",
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }
    }

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

    const currentCompanyId = await getCurrentUserCompanyId();
    if (!currentCompanyId || currentCompanyId !== expense.companyId) {
      return { error: "Not authorized" };
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

    const currentCompanyId = await getCurrentUserCompanyId();
    if (!currentCompanyId || currentCompanyId !== expense.companyId) {
      return { error: "Not authorized" };
    }

    // Check if user owns the expense or is an admin
    const isOwner = expense.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return { error: "Not authorized" };
    }

    // Get expense details before deletion for notification
    const expenseAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(expense.amount));

    // Delete the expense
    await prisma.expense.delete({
      where: { id },
    });

    try {
      await decrementResource(expense.companyId, 1);
    } catch (usageError) {
      console.error("Failed to decrement usage after expense deletion:", usageError);
    }

    revalidatePath("/dashboard");

    // Notify expense owner if admin deleted their expense
    if (!isOwner && isAdmin) {
      try {
        const userName = session.user.name || session.user.email || "Admin";
        await createNotification(expense.userId, {
          type: "ERROR",
          title: "Expense Deleted by Admin",
          message: `${userName} deleted your expense "${expense.description}" (${expenseAmount})`,
          actionUrl: "/dashboard/expenses",
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }
    }

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
  sort?: MultiSortConfig;
}

/**
 * Build Prisma orderBy from multi-sort configuration
 */
function buildMultiOrderBy(sorts: MultiSortConfig): Array<Record<string, unknown>> {
  const orderBy: Array<Record<string, unknown>> = [];

  for (const sort of sorts) {
    if (sort.field === "date") {
      orderBy.push({ date: sort.direction });
      continue;
    }

    if (sort.field === "amount") {
      orderBy.push({ amount: sort.direction });
      continue;
    }

    if (sort.field === "createdAt") {
      orderBy.push({ createdAt: sort.direction });
      continue;
    }

    if (sort.field === "category") {
      orderBy.push({ category: { name: sort.direction } });
      continue;
    }

    if (sort.field === "user") {
      orderBy.push({ user: { name: sort.direction } });
      orderBy.push({ user: { email: sort.direction } });
      continue;
    }
  }

  // Always add id as final deterministic tiebreaker for stable pagination
  orderBy.push({ id: "asc" });

  return orderBy;
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

    if (result.count > 0) {
      try {
        await decrementResource(user.companyId, result.count);
      } catch (usageError) {
        console.error("Failed to decrement usage after bulk deletion:", usageError);
      }
    }

    revalidatePath("/dashboard/expenses");

    return { success: true, deletedCount: result.count };
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
 * Only admins can bulk update any, members can only update their own
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
    const isAdmin = session.user.role === UserRole.ADMIN;

    // Get current user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return { success: false, error: "User not assigned to company" };
    }

    // Verify category belongs to the company
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
    await prisma.expense.updateMany({
      where: {
        id: { in: updatableIds },
      },
      data: {
        categoryId,
      },
    });

    revalidatePath("/dashboard/expenses");

    return { success: true, updatedCount: updatableIds.length };
  } catch (error) {
    console.error("Failed to bulk update category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update expenses",
    };
  }
}

/**
 * Export expenses to CSV format
 * Returns CSV content string and filename
 */
export async function exportExpensesCSV(filters: {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  categoryIds?: string[];
  amountMin?: number | null;
  amountMax?: number | null;
  search?: string;
}): Promise<
  | { csvContent: string; filename: string }
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
      `"${e.description.replace(/"/g, '""')}"`, // Escape quotes
      e.category.name,
      e.user?.name || e.user?.email || "Unknown",
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
