"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { createNotification } from "@/app/actions/notifications";
import { evaluateBudgetPolicyForExpenseChange } from "@/lib/budget/service";
import { invalidateCompanyExpenseReadModels } from "@/lib/cache/company-read-model-cache";
import { serializeExpense } from "@/lib/expenses/action-helpers";
import { createLogger } from "@/lib/monitoring/logger";

const logger = createLogger("expenses-update-action");

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

    const amountDelta = Number(validated.amount) - Number(existingExpense.amount);
    if (amountDelta > 0) {
      const budgetPolicyCheck = await evaluateBudgetPolicyForExpenseChange({
        companyId: existingExpense.companyId,
        actorRole: userRole,
        amountDelta,
      });

      if (!budgetPolicyCheck.allowed) {
        return {
          error: budgetPolicyCheck.reason ?? "Budget policy does not allow increasing this expense.",
          code: "BUDGET_EXCEEDED",
        };
      }
    }

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
    invalidateCompanyExpenseReadModels(existingExpense.companyId);

    logger.info("Expense updated", {
      expenseId: id,
      userName,
      userRole,
    });

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
        });
      } catch (notifyError) {
        logger.error("Failed to send notification", { error: notifyError });
      }
    }

    return {
      success: true,
      expense: serializeExpense(updatedExpense)
    };
  } catch (error) {
    logger.error("Failed to update expense", { error });
    return {
      error: error instanceof Error ? error.message : "Failed to update expense",
    };
  }
}
