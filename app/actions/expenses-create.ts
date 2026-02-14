"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import {
  checkFeatureLimit,
  consumeResource,
  type FeatureCheckResult
} from "@/lib/subscription/feature-gate-service";
import { FeatureGateError } from "@/lib/errors";
import { createNotification } from "@/app/actions/notifications";
import { evaluateBudgetPolicyForExpenseChange } from "@/lib/budget/service";
import { serializeExpense } from "@/lib/expenses/action-helpers";
import { getCurrentUserCompanyId } from "./expenses-shared";
import type { CreateExpenseResult } from "./expenses-types";

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

