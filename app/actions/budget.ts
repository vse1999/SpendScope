"use server";

import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  getBudgetSummary,
  upsertCompanyBudgetSettings,
} from "@/lib/budget/service";
import {
  BUDGET_EXHAUSTION_POLICY,
  type BudgetExhaustionPolicy,
  type BudgetSummary,
  type CompanyBudgetSettings,
} from "@/lib/budget/types";
import { invalidateCompanyBudgetReadModels } from "@/lib/cache/company-read-model-cache";
import { getCompanyBudgetStateForCompany } from "@/lib/dashboard/queries";
import { prisma } from "@/lib/prisma";

type BudgetActionErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR";

export type GetBudgetSettingsResult =
  | { success: true; settings: CompanyBudgetSettings | null; summary: BudgetSummary }
  | { success: false; error: string; code: BudgetActionErrorCode };

export type UpsertBudgetSettingsResult =
  | { success: true; settings: CompanyBudgetSettings; summary: BudgetSummary }
  | { success: false; error: string; code: BudgetActionErrorCode };

async function getCurrentUserCompany(): Promise<{ userId: string; companyId: string; role: UserRole } | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, companyId: true, role: true },
  });

  if (!user?.companyId) {
    return null;
  }

  return {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
  };
}

function parseBudgetAmount(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Number(parsed.toFixed(2));
}

function parseBudgetPolicy(value: string | null): BudgetExhaustionPolicy | null {
  if (!value) {
    return null;
  }

  if (value === BUDGET_EXHAUSTION_POLICY.WARN_ONLY) {
    return BUDGET_EXHAUSTION_POLICY.WARN_ONLY;
  }

  if (value === BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN) {
    return BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN;
  }

  if (value === BUDGET_EXHAUSTION_POLICY.BLOCK_ALL) {
    return BUDGET_EXHAUSTION_POLICY.BLOCK_ALL;
  }

  return null;
}

export async function getCompanyBudgetState(): Promise<GetBudgetSettingsResult> {
  try {
    const context = await getCurrentUserCompany();
    if (!context) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }
    return getCompanyBudgetStateForCompany(context.companyId);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch budget",
      code: "VALIDATION_ERROR",
    };
  }
}

export async function upsertCompanyBudget(formData: FormData): Promise<UpsertBudgetSettingsResult> {
  try {
    const context = await getCurrentUserCompany();
    if (!context) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    if (context.role !== UserRole.ADMIN) {
      return {
        success: false,
        error: "Only admins can update company budget settings",
        code: "UNAUTHORIZED",
      };
    }

    const budgetAmount = parseBudgetAmount(formData.get("monthlyBudget")?.toString() ?? null);
    const policy = parseBudgetPolicy(formData.get("exhaustionPolicy")?.toString() ?? null);
    const currency = formData.get("currency")?.toString() ?? "USD";
    const isActive = formData.get("isActive")?.toString() === "true";

    if (budgetAmount === null) {
      return {
        success: false,
        error: "Monthly budget must be a number greater than 0",
        code: "VALIDATION_ERROR",
      };
    }

    if (!policy) {
      return {
        success: false,
        error: "Invalid budget policy",
        code: "VALIDATION_ERROR",
      };
    }

    const settings = await upsertCompanyBudgetSettings({
      companyId: context.companyId,
      actorUserId: context.userId,
      monthlyBudget: budgetAmount,
      currency,
      exhaustionPolicy: policy,
      isActive,
    });

    const summary = await getBudgetSummary(context.companyId);

    invalidateCompanyBudgetReadModels(context.companyId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/expenses");

    return { success: true, settings, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update budget",
      code: "VALIDATION_ERROR",
    };
  }
}
