"use server";

import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { detectExpenseAnomalies, type CopilotExpenseSignal } from "@/lib/expenses/copilot";
import { getExpensePolicyConfig } from "@/lib/expenses/policy-service";
import { revalidatePath } from "next/cache";
import type {
  ExpenseAnomalyRuleType,
  ExpenseAnomalyStatus,
  ExpenseCopilotAlert,
  GetExpenseCopilotAlertsResult,
  ResolveExpenseCopilotAction,
  ResolveExpenseCopilotAlertResult,
} from "./expenses-copilot-types";
import { getCurrentUserCompanyAccess } from "./expenses-shared";

const COPILOT_LOOKBACK_DAYS = 120;
const COPILOT_MAX_ALERTS = 25;

function toCopilotStatus(action: ResolveExpenseCopilotAction): ExpenseAnomalyStatus {
  if (action === "APPROVE") {
    return "APPROVED";
  }

  return "DISMISSED";
}

export async function getExpenseCopilotAlerts(): Promise<GetExpenseCopilotAlertsResult> {
  try {
    const access = await getCurrentUserCompanyAccess();

    if (access.state === "unauthenticated") {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    if (access.state !== "ready") {
      return { success: false, error: "User not assigned to company", code: "UNAUTHORIZED" };
    }
    const { companyId } = access;

    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - COPILOT_LOOKBACK_DAYS);

    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: { gte: lookbackStart },
      },
      select: {
        id: true,
        amount: true,
        description: true,
        date: true,
        categoryId: true,
        userId: true,
        category: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: "desc" },
    });

    const signals: CopilotExpenseSignal[] = expenses.map((expense) => ({
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      date: expense.date,
      categoryId: expense.categoryId,
      categoryName: expense.category.name,
      userId: expense.userId,
      userDisplayName: expense.user.name ?? expense.user.email ?? "Unknown",
    }));

    const policyConfig = await getExpensePolicyConfig(companyId);
    const candidates = detectExpenseAnomalies(signals, {
      globalThresholdUsd: policyConfig.globalThresholdUsd,
      categoryThresholds: policyConfig.categoryThresholds,
    });
    if (candidates.length === 0) {
      return { success: true, alerts: [] };
    }

    const candidateExpenseIds = [...new Set(candidates.map((candidate) => candidate.expenseId))];
    const copilotHistory = await prisma.expenseHistory.findMany({
      where: {
        expenseId: { in: candidateExpenseIds },
        changeType: { startsWith: "COPILOT_" },
      },
      select: {
        expenseId: true,
        reason: true,
        changeType: true,
        editedAt: true,
      },
      orderBy: { editedAt: "desc" },
    });

    const resolvedByKey = new Map<string, ExpenseAnomalyStatus>();
    for (const historyEntry of copilotHistory) {
      const ruleType = historyEntry.reason as ExpenseAnomalyRuleType | null;
      if (!ruleType) {
        continue;
      }
      const key = `${historyEntry.expenseId}|${ruleType}`;
      if (resolvedByKey.has(key)) {
        continue;
      }
      if (historyEntry.changeType === "COPILOT_APPROVED") {
        resolvedByKey.set(key, "APPROVED");
      } else if (historyEntry.changeType === "COPILOT_DISMISSED") {
        resolvedByKey.set(key, "DISMISSED");
      } else if (historyEntry.changeType === "COPILOT_RECEIPT_REQUESTED") {
        resolvedByKey.set(key, "DISMISSED");
      }
    }

    const expenseMap = new Map(
      expenses.map((expense) => [
        expense.id,
        {
          id: expense.id,
          amount: Number(expense.amount),
          description: expense.description,
          date: expense.date,
          userId: expense.userId,
          categoryName: expense.category.name,
          userDisplayName: expense.user.name ?? expense.user.email ?? "Unknown",
        },
      ])
    );

    const openAlerts = candidates
      .filter((candidate) => !resolvedByKey.has(`${candidate.expenseId}|${candidate.ruleType}`))
      .map((candidate) => {
        const expense = expenseMap.get(candidate.expenseId);
        if (!expense) {
          return null;
        }
        return {
          id: `${candidate.expenseId}:${candidate.ruleType}`,
          expenseId: candidate.expenseId,
          ruleType: candidate.ruleType,
          status: "OPEN" as ExpenseAnomalyStatus,
          severity: candidate.severity,
          confidence: candidate.confidence,
          reason: candidate.reason,
          createdAt: expense.date,
          expense,
        };
      })
      .filter((alert): alert is ExpenseCopilotAlert => alert !== null)
      .sort((a, b) => b.severity - a.severity)
      .slice(0, COPILOT_MAX_ALERTS);

    return {
      success: true,
      alerts: openAlerts,
    };
  } catch (error) {
    console.error("Failed to get expense monitor alerts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get expense monitor alerts",
    };
  }
}

export async function resolveExpenseCopilotAlert(
  alertId: string,
  action: ResolveExpenseCopilotAction
): Promise<ResolveExpenseCopilotAlertResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated", code: "UNAUTHORIZED" };
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        companyId: true,
        name: true,
        email: true,
      },
    });

    if (!actor?.companyId || actor.role !== UserRole.ADMIN) {
      return { success: false, error: "Only admins can resolve expense monitor alerts", code: "UNAUTHORIZED" };
    }

    const [expenseId, ruleTypeRaw] = alertId.split(":");
    const ruleType = (ruleTypeRaw ?? "") as ExpenseAnomalyRuleType;
    if (!expenseId || !["DUPLICATE", "POLICY_BREACH", "UNUSUAL_SPEND"].includes(ruleType)) {
      return { success: false, error: "Alert not found", code: "NOT_FOUND" };
    }

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        companyId: actor.companyId,
      },
      select: {
        id: true,
      },
    });

    if (!expense) {
      return { success: false, error: "Alert not found", code: "NOT_FOUND" };
    }

    const latestResolution = await prisma.expenseHistory.findFirst({
      where: {
        expenseId,
        reason: ruleType,
        changeType: { startsWith: "COPILOT_" },
      },
      select: {
        id: true,
      },
      orderBy: { editedAt: "desc" },
    });

    if (latestResolution) {
      return { success: false, error: "Alert is already resolved", code: "INVALID_STATE" };
    }

    const nextStatus = toCopilotStatus(action);
    const changeType = nextStatus === "APPROVED" ? "COPILOT_APPROVED" : "COPILOT_DISMISSED";

    await prisma.expenseHistory.create({
      data: {
        expenseId,
        editedBy: actor.id,
        editedByName: actor.name ?? actor.email ?? "Admin",
        oldValues: JSON.stringify({ status: "OPEN" }),
        newValues: JSON.stringify({
          status: nextStatus,
          ruleType,
          resolvedBy: actor.id,
          resolvedAt: new Date().toISOString(),
        }),
        changeType,
        reason: ruleType,
      },
    });

    revalidatePath("/dashboard/expenses");
    return { success: true, alertId, status: nextStatus };
  } catch (error) {
    console.error("Failed to resolve expense monitor alert:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resolve expense monitor alert",
    };
  }
}
