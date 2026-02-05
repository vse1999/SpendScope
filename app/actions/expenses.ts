"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { startOfDay, subDays, format, startOfMonth, endOfMonth } from "date-fns";

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
 * Get all expenses for the current user's company
 * Includes category and user details
 */
export async function getExpensesByCompany() {
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
 * Create a new expense
 * Validates input data and creates expense for current user's company
 */
export async function createExpense(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user) {
      return { error: "Not authenticated" };
    }

    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
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
        error: "Invalid data",
        details: result.error.issues,
      };
    }

    const validated = result.data;

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        amount: validated.amount,
        description: validated.description,
        date: new Date(validated.date),
        categoryId: validated.categoryId,
        userId: session.user.id,
        companyId: companyId,
      },
    });

    revalidatePath("/dashboard");

    // Return serialized expense (Decimal -> string)
    return { success: true, expense: serializeExpense(expense) };
  } catch (error) {
    console.error("Failed to create expense:", error);
    return {
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
      oldValues: JSON.parse(h.oldValues),
      newValues: JSON.parse(h.newValues),
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
