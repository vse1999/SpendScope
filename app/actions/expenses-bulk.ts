"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { invalidateCompanyExpenseReadModels } from "@/lib/cache/company-read-model-cache";
import { decrementResource } from "@/lib/subscription/feature-gate-service";

interface ExpenseBulkActor {
  userId: string;
  companyId: string;
  isAdmin: boolean;
}

type ExpenseBulkActorResult =
  | { success: true; actor: ExpenseBulkActor }
  | { success: false; error: string };

async function getExpenseBulkActor(): Promise<ExpenseBulkActorResult> {
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

  return {
    success: true,
    actor: {
      userId,
      companyId: user.companyId,
      isAdmin,
    },
  };
}

/**
 * Bulk delete multiple expenses
 * Only admins can bulk delete, members can only delete their own
 */
export async function bulkDeleteExpenses(expenseIds: string[]): Promise<
  | { success: true; deletedCount: number; deletedIds: string[]; skippedIds: string[] }
  | { success: false; error: string }
> {
  try {
    const actorResult = await getExpenseBulkActor();
    if (!actorResult.success) {
      return { success: false, error: actorResult.error };
    }
    const { userId, isAdmin, companyId } = actorResult.actor;

    // Verify all expenses belong to the user's company and check permissions
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        companyId,
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
    const deletedIdSet = new Set(deletableIds);
    const skippedIds = expenseIds.filter((expenseId) => !deletedIdSet.has(expenseId));

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
        await decrementResource(companyId, result.count);
      } catch (usageError) {
        console.error("Failed to decrement usage after bulk deletion:", usageError);
      }
    }

    revalidatePath("/dashboard/expenses");
    invalidateCompanyExpenseReadModels(companyId);

    return { success: true, deletedCount: result.count, deletedIds: deletableIds, skippedIds };
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
  | { success: true; updatedCount: number; updatedIds: string[]; skippedIds: string[] }
  | { success: false; error: string }
> {
  try {
    const actorResult = await getExpenseBulkActor();
    if (!actorResult.success) {
      return { success: false, error: actorResult.error };
    }
    const { userId, isAdmin, companyId } = actorResult.actor;

    // Verify category belongs to the company
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        companyId,
      },
    });

    if (!category) {
      return { success: false, error: "Category not found" };
    }

    // Verify all expenses belong to the user's company and check permissions
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
        companyId,
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
    const updatedIdSet = new Set(updatableIds);
    const skippedIds = expenseIds.filter((expenseId) => !updatedIdSet.has(expenseId));

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
    invalidateCompanyExpenseReadModels(companyId);

    return { success: true, updatedCount: updatableIds.length, updatedIds: updatableIds, skippedIds };
  } catch (error) {
    console.error("Failed to bulk update category:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update expenses",
    };
  }
}
