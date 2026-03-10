import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BudgetExhaustionPolicy,
  BudgetPolicyEvaluation,
  BudgetSummary,
  CompanyBudgetSettings,
  UpsertBudgetInput,
} from "@/lib/budget/types";
import { BUDGET_EXHAUSTION_POLICY } from "@/lib/budget/types";

const DEFAULT_BUDGET_CURRENCY = "USD";

function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function getBudgetHealth(usagePercent: number): BudgetSummary["health"] {
  if (usagePercent > 100) {
    return "OVER_BUDGET";
  }

  if (usagePercent >= 100) {
    return "EXHAUSTED";
  }

  if (usagePercent >= 80) {
    return "WARNING";
  }

  return "HEALTHY";
}

function normalizeCurrency(input: string): string {
  const value = input.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) {
    return DEFAULT_BUDGET_CURRENCY;
  }
  return value;
}

function toBudgetSettings(record: {
  id: string;
  companyId: string;
  monthlyBudget: { toNumber(): number };
  currency: string;
  exhaustionPolicy: BudgetExhaustionPolicy;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CompanyBudgetSettings {
  return {
    id: record.id,
    companyId: record.companyId,
    monthlyBudget: record.monthlyBudget.toNumber(),
    currency: record.currency,
    exhaustionPolicy: record.exhaustionPolicy,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getCompanyBudgetSettings(
  companyId: string
): Promise<CompanyBudgetSettings | null> {
  const record = await prisma.companyBudget.findUnique({
    where: { companyId },
    select: {
      id: true,
      companyId: true,
      monthlyBudget: true,
      currency: true,
      exhaustionPolicy: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!record) {
    return null;
  }

  return toBudgetSettings(record);
}

export async function upsertCompanyBudgetSettings(
  input: UpsertBudgetInput
): Promise<CompanyBudgetSettings> {
  const normalizedCurrency = normalizeCurrency(input.currency);
  const normalizedBudget = Number(input.monthlyBudget.toFixed(2));

  const record = await prisma.companyBudget.upsert({
    where: { companyId: input.companyId },
    update: {
      monthlyBudget: normalizedBudget,
      currency: normalizedCurrency,
      exhaustionPolicy: input.exhaustionPolicy,
      isActive: input.isActive,
      updatedBy: input.actorUserId,
    },
    create: {
      companyId: input.companyId,
      monthlyBudget: normalizedBudget,
      currency: normalizedCurrency,
      exhaustionPolicy: input.exhaustionPolicy,
      isActive: input.isActive,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    },
    select: {
      id: true,
      companyId: true,
      monthlyBudget: true,
      currency: true,
      exhaustionPolicy: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return toBudgetSettings(record);
}

export async function getBudgetSummary(
  companyId: string,
  monthDate: Date = new Date()
): Promise<BudgetSummary> {
  const [settings, thisMonthSpent] = await Promise.all([
    getCompanyBudgetSettings(companyId),
    getCompanyMonthSpent(companyId, monthDate),
  ]);

  return buildBudgetSummary(settings, thisMonthSpent);
}

export function buildBudgetSummary(
  settings: CompanyBudgetSettings | null,
  thisMonthSpent: number
): BudgetSummary {
  if (!settings || !settings.isActive) {
    return {
      hasBudget: false,
      thisMonthSpent,
      budgetAmount: null,
      remaining: null,
      usagePercent: null,
      health: "HEALTHY",
      currency: settings?.currency ?? DEFAULT_BUDGET_CURRENCY,
      exhaustionPolicy: settings?.exhaustionPolicy ?? BUDGET_EXHAUSTION_POLICY.WARN_ONLY,
      isActive: settings?.isActive ?? false,
    };
  }

  const budgetAmount = settings.monthlyBudget;
  const remaining = Number((budgetAmount - thisMonthSpent).toFixed(2));
  const usagePercent = budgetAmount <= 0 ? 0 : (thisMonthSpent / budgetAmount) * 100;

  return {
    hasBudget: true,
    thisMonthSpent,
    budgetAmount,
    remaining,
    usagePercent,
    health: getBudgetHealth(usagePercent),
    currency: settings.currency,
    exhaustionPolicy: settings.exhaustionPolicy,
    isActive: settings.isActive,
  };
}

async function getCompanyMonthSpent(companyId: string, monthDate: Date): Promise<number> {
  const monthBounds = getMonthBounds(monthDate);
  const monthSpentAggregate = await prisma.expense.aggregate({
    where: {
      companyId,
      date: {
        gte: monthBounds.start,
        lt: monthBounds.end,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return Number(monthSpentAggregate._sum.amount ?? 0);
}

export async function getBudgetSummaryWithSettings(
  companyId: string,
  settings: CompanyBudgetSettings | null,
  monthDate: Date = new Date()
): Promise<BudgetSummary> {
  const thisMonthSpent = await getCompanyMonthSpent(companyId, monthDate);
  return buildBudgetSummary(settings, thisMonthSpent);
}

export async function evaluateBudgetPolicyForExpenseChange(input: {
  companyId: string;
  actorRole: UserRole;
  amountDelta: number;
}): Promise<BudgetPolicyEvaluation> {
  const { companyId, actorRole, amountDelta } = input;
  const summary = await getBudgetSummary(companyId);

  if (!summary.hasBudget || amountDelta <= 0 || summary.budgetAmount === null) {
    return { allowed: true, reason: null, summary };
  }

  const projectedSpent = summary.thisMonthSpent + amountDelta;
  const projectedOverBudget = projectedSpent > summary.budgetAmount;

  if (!projectedOverBudget) {
    return { allowed: true, reason: null, summary };
  }

  if (summary.exhaustionPolicy === BUDGET_EXHAUSTION_POLICY.WARN_ONLY) {
    return { allowed: true, reason: null, summary };
  }

  if (
    summary.exhaustionPolicy === BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN &&
    actorRole === UserRole.ADMIN
  ) {
    return { allowed: true, reason: null, summary };
  }

  return {
    allowed: false,
    reason:
      summary.exhaustionPolicy === BUDGET_EXHAUSTION_POLICY.BLOCK_NON_ADMIN
        ? "Budget exhausted. Only admins can add expenses over budget."
        : "Budget exhausted. New expenses are currently blocked by company policy.",
    summary,
  };
}
