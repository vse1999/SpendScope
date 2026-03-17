"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/actions/notifications";
import { invalidateCompanyExpenseReadModels } from "@/lib/cache/company-read-model-cache";
import { createLogger } from "@/lib/monitoring/logger";
import { decrementResource } from "@/lib/subscription/feature-gate-service";
import type { ExpenseChangeValues } from "@/types/expense-history";
import { getCurrentUserCompanyId } from "./expenses-shared";

const logger = createLogger("expenses-history-delete-action");

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
    const isAdmin = userRole === "ADMIN";

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
    logger.error("Failed to get expense history", { error, expenseId: id });
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
      logger.error("Failed to decrement usage after expense deletion", {
        companyId: expense.companyId,
        error: usageError,
        expenseId: id,
      });
    }

    revalidatePath("/dashboard");
    invalidateCompanyExpenseReadModels(expense.companyId);

    // Notify expense owner if admin deleted their expense
    if (!isOwner && isAdmin) {
      try {
        const userName = session.user.name || session.user.email || "Admin";
        await createNotification(expense.userId, {
          type: "ERROR",
          title: "Expense Deleted by Admin",
          message: `${userName} deleted your expense "${expense.description}" (${expenseAmount})`,
        });
      } catch (notifyError) {
        logger.error("Failed to send expense deletion notification", {
          error: notifyError,
          expenseId: id,
          targetUserId: expense.userId,
        });
      }
    }

    return { success: true };
  } catch (error) {
    logger.error("Failed to delete expense", { error, expenseId: id });
    return {
      error: error instanceof Error ? error.message : "Failed to delete expense",
    };
  }
}
