"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

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
