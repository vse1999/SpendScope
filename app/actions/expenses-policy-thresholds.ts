"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { createLogger } from "@/lib/monitoring/logger";
import { prisma } from "@/lib/prisma";
import {
  deleteCategoryExpensePolicyRule,
  getExpensePolicyConfig,
  listExpensePolicyRules,
  upsertCategoryExpensePolicyRule,
  upsertGlobalExpensePolicyRule,
} from "@/lib/expenses/policy-service";
import type {
  GetExpensePolicyConfigResult,
  UpdateExpensePolicyResult,
} from "./expenses-copilot-types";
import { getCurrentUserCompanyAccess } from "./expenses-shared";

interface AdminActorContext {
  id: string;
  companyId: string;
}
const logger = createLogger("expenses-policy-thresholds-action");

async function getAdminActorContext(): Promise<AdminActorContext | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      companyId: true,
    },
  });

  if (!actor?.companyId || actor.role !== UserRole.ADMIN) {
    return null;
  }

  return {
    id: actor.id,
    companyId: actor.companyId,
  };
}

export async function getExpensePolicyConfigForCompany(): Promise<GetExpensePolicyConfigResult> {
  try {
    const access = await getCurrentUserCompanyAccess();

    if (access.state === "unauthenticated") {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    if (access.state !== "ready") {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }
    const { companyId } = access;

    const [config, rules] = await Promise.all([
      getExpensePolicyConfig(companyId),
      listExpensePolicyRules(companyId),
    ]);

    return {
      success: true,
      config: {
        globalThresholdUsd: config.globalThresholdUsd,
        categoryThresholds: config.categoryThresholds,
      },
      rules: rules.map((rule) => ({
        id: rule.id,
        scopeType: rule.scopeType,
        categoryId: rule.categoryId,
        thresholdUsd: rule.thresholdUsd,
        requiresReceiptAboveUsd: rule.requiresReceiptAboveUsd,
        updatedAt: rule.updatedAt,
      })),
    };
  } catch (error) {
    logger.error("Failed to get expense policy config", { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get expense policy config",
    };
  }
}

export async function updateGlobalExpensePolicyThreshold(
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  try {
    if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) {
      return { success: false, error: "Threshold must be greater than 0", code: "VALIDATION_ERROR" };
    }

    const admin = await getAdminActorContext();
    if (!admin) {
      return { success: false, error: "Only admins can update policy thresholds", code: "UNAUTHORIZED" };
    }

    await upsertGlobalExpensePolicyRule(
      admin.companyId,
      thresholdUsd,
      null,
      admin.id
    );

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to update global expense policy threshold", { error, thresholdUsd });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update global threshold",
    };
  }
}

export async function upsertCategoryExpensePolicyThreshold(
  categoryId: string,
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  try {
    if (!categoryId) {
      return { success: false, error: "Category is required", code: "VALIDATION_ERROR" };
    }
    if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) {
      return { success: false, error: "Threshold must be greater than 0", code: "VALIDATION_ERROR" };
    }

    const admin = await getAdminActorContext();
    if (!admin) {
      return { success: false, error: "Only admins can update policy thresholds", code: "UNAUTHORIZED" };
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        companyId: admin.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return { success: false, error: "Category not found", code: "VALIDATION_ERROR" };
    }

    await upsertCategoryExpensePolicyRule(
      admin.companyId,
      categoryId,
      thresholdUsd,
      null,
      admin.id
    );

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to upsert category expense policy threshold", {
      categoryId,
      error,
      thresholdUsd,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update category threshold",
    };
  }
}

export async function deleteCategoryExpensePolicyThreshold(
  categoryId: string
): Promise<UpdateExpensePolicyResult> {
  try {
    if (!categoryId) {
      return { success: false, error: "Category is required", code: "VALIDATION_ERROR" };
    }

    const admin = await getAdminActorContext();
    if (!admin) {
      return { success: false, error: "Only admins can update policy thresholds", code: "UNAUTHORIZED" };
    }

    await deleteCategoryExpensePolicyRule(admin.companyId, categoryId);

    revalidatePath("/dashboard/expenses");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete category expense policy threshold", { categoryId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete category threshold",
    };
  }
}
