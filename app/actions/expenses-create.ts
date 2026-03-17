"use server";

import type { Expense } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { createExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { invalidateCompanyExpenseReadModels } from "@/lib/cache/company-read-model-cache";
import {
  checkFeatureLimit,
  consumeResource,
  type FeatureCheckResult
} from "@/lib/subscription/feature-gate-service";
import { FeatureGateError } from "@/lib/errors";
import { createLogger } from "@/lib/monitoring/logger";
import { createNotification } from "@/app/actions/notifications";
import { evaluateBudgetPolicyForExpenseChange } from "@/lib/budget/service";
import { serializeExpense } from "@/lib/expenses/action-helpers";
import { getCurrentUserCompanyId } from "./expenses-shared";
import type { CreateExpenseResult } from "./expenses-types";

const LIMIT_CHECK_UNAVAILABLE_MESSAGE =
  "Unable to verify plan limits right now. Please try again.";
const logger = createLogger("expenses-create-action");

/**
 * Create a new expense with feature limit enforcement and rate limiting
 * Validates input data and creates expense for current user's company
 */
export async function createExpense(formData: FormData): Promise<CreateExpenseResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const [actionLimit, userLimit] = await Promise.all([
      checkRateLimit("expense-action", { tier: "action" }),
      checkRateLimit(`expense-user:${session.user.id}`, { tier: "action" }),
    ]);

    if (!actionLimit.allowed || !userLimit.allowed) {
      return { success: false, error: "Too many requests. Please try again later.", code: "RATE_LIMITED" };
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

    const budgetPolicyCheck = await evaluateBudgetPolicyForExpenseChange({
      companyId,
      actorRole: session.user.role,
      amountDelta: Number(validated.amount),
    });

    if (!budgetPolicyCheck.allowed) {
      return {
        success: false,
        error: budgetPolicyCheck.reason ?? "Budget policy does not allow this expense.",
        code: "BUDGET_EXCEEDED",
      };
    }

    // Check feature limit before creating
    let limitCheck: FeatureCheckResult;
    try {
      limitCheck = await checkFeatureLimit(companyId, "expense", 1);
    } catch (error) {
      const checkedError = error instanceof Error ? error : new Error(String(error));
      logger.error("entitlement_check_failed", {
        event: "entitlement_check_failed",
        action: "createExpense",
        companyId,
        userId: session.user.id,
        errorName: checkedError.name,
        message: checkedError.message,
      });
      return {
        success: false,
        error: LIMIT_CHECK_UNAVAILABLE_MESSAGE,
        code: "LIMIT_CHECK_UNAVAILABLE",
      };
    }

    if (!limitCheck.allowed) {
      return {
        success: false,
        error: limitCheck.reason ?? "Monthly expense limit exceeded",
        code: "LIMIT_EXCEEDED",
      };
    }

    // Use transaction: consume resource + create expense atomically
    let expense: Expense;
    try {
      expense = await prisma.$transaction(async (tx) => {
        await consumeResource(companyId, "expense", 1);

        return tx.expense.create({
          data: {
            amount: validated.amount,
            description: validated.description,
            date: new Date(validated.date),
            categoryId: validated.categoryId,
            userId: session.user.id,
            companyId: companyId,
          },
        });
      });
    } catch (error) {
      if (error instanceof FeatureGateError) {
        return {
          success: false,
          error: error.message,
          code: "LIMIT_EXCEEDED",
        };
      }

      const consumeError = error instanceof Error ? error : new Error(String(error));
      logger.error("entitlement_consume_failed", {
        event: "entitlement_consume_failed",
        action: "createExpense",
        companyId,
        userId: session.user.id,
        errorName: consumeError.name,
        message: consumeError.message,
      });
      return {
        success: false,
        error: LIMIT_CHECK_UNAVAILABLE_MESSAGE,
        code: "LIMIT_CHECK_UNAVAILABLE",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");
    invalidateCompanyExpenseReadModels(companyId);

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
          });
        }
      }
    } catch (notifyError) {
      logger.error("Failed to send expense notifications", { companyId, error: notifyError });
      // Don't fail the expense creation if notifications fail
    }

    // Return serialized expense (Decimal -> string)
    return { success: true, expense: serializeExpense(expense) };
  } catch (error) {
    logger.error("Failed to create expense", { error });

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
