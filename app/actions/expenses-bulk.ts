"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { decrementResource } from "@/lib/subscription/feature-gate-service";

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

