import { unstable_cache } from "next/cache";
import { Prisma, type Category } from "@prisma/client";
import type { SerializedExpense } from "@/app/actions/expenses-types";
import {
  getBudgetSummaryWithSettings,
  getCompanyBudgetSettings,
} from "@/lib/budget/service";
import type {
  BudgetSummary,
  CompanyBudgetSettings,
} from "@/lib/budget/types";
import {
  COMPANY_CACHE_TTL_SECONDS,
  getCompanyReadModelCacheTags,
} from "@/lib/cache/company-read-model-cache";
import { serializeExpense } from "@/lib/expenses/action-helpers";
import { createLogger } from "@/lib/monitoring/logger";
import { prisma } from "@/lib/prisma";

type DashboardTrend = "up" | "down";
type DashboardBudgetErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR";
const logger = createLogger("dashboard-queries");

export interface DashboardStatsCategory {
  amount: number;
  color: string;
  name: string;
}

export interface DashboardStatsData {
  averageExpense: number;
  byCategory: DashboardStatsCategory[];
  categoryCount: number;
  expenseCount: number;
  largestExpense: number;
  monthlyChangePercent: string;
  monthlyTrend: DashboardTrend;
  previousMonth: number;
  recentExpenses: SerializedExpense[];
  thisMonth: number;
  totalExpenses: number;
}

export type DashboardBudgetStateResult =
  | { success: true; settings: CompanyBudgetSettings | null; summary: BudgetSummary }
  | { success: false; error: string; code: DashboardBudgetErrorCode };

export type DashboardCategoriesResult = Category[] | { error: string };

export type DashboardStatsResult =
  | { data: DashboardStatsData }
  | { error: string };

interface DashboardBudgetStateData {
  settings: CompanyBudgetSettings | null;
  summary: BudgetSummary;
}

interface DashboardStatsSummaryRow {
  expenseCount: number | bigint | string;
  largestExpense: Prisma.Decimal | number | string | null;
  previousMonth: Prisma.Decimal | number | string | null;
  thisMonth: Prisma.Decimal | number | string | null;
  totalExpenses: Prisma.Decimal | number | string | null;
}

interface DashboardStatsCategoryRow {
  amount: Prisma.Decimal | number | string | null;
  color: string | null;
  name: string | null;
}

function toNumericValue(
  value: Prisma.Decimal | number | string | bigint | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return Number(value);
}

async function readCategoriesForCompanyFromDatabase(
  companyId: string
): Promise<Category[]> {
  const startedAt = Date.now();
  const categories = await prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  logger.debug("categories_read_model_cache_miss", {
    companyId,
    durationMs: Date.now() - startedAt,
    categoryCount: categories.length,
  });
  return categories;
}

function getCachedCategoriesForCompany(companyId: string): Promise<Category[]> {
  const tags = getCompanyReadModelCacheTags(companyId);

  return unstable_cache(
    async (): Promise<Category[]> => readCategoriesForCompanyFromDatabase(companyId),
    ["dashboard-categories", companyId],
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.categories,
      tags: [tags.categories],
    }
  )();
}

export async function getCategoriesForCompany(companyId: string): Promise<DashboardCategoriesResult> {
  try {
    return await getCachedCategoriesForCompany(companyId);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch categories",
    };
  }
}

export async function getCompanyBudgetStateForCompany(
  companyId: string
): Promise<DashboardBudgetStateResult> {
  try {
    const budgetState = await getCachedCompanyBudgetStateForCompany(companyId);
    return { success: true, ...budgetState };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch budget",
      code: "VALIDATION_ERROR",
    };
  }
}

function getCurrentMonthCacheKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

async function readCompanyBudgetStateForCompanyFromDatabase(
  companyId: string
): Promise<DashboardBudgetStateData> {
  const startedAt = Date.now();
  const settings = await getCompanyBudgetSettings(companyId);
  const summary = await getBudgetSummaryWithSettings(companyId, settings);
  logger.debug("budget_state_read_model_cache_miss", {
    companyId,
    durationMs: Date.now() - startedAt,
  });
  return { settings, summary };
}

function getCachedCompanyBudgetStateForCompany(
  companyId: string
): Promise<DashboardBudgetStateData> {
  const tags = getCompanyReadModelCacheTags(companyId);
  const currentMonthCacheKey = getCurrentMonthCacheKey();

  return unstable_cache(
    async (): Promise<DashboardBudgetStateData> =>
      readCompanyBudgetStateForCompanyFromDatabase(companyId),
    ["dashboard-budget-state", companyId, currentMonthCacheKey],
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.dashboard,
      tags: [tags.dashboard, tags.expenses],
    }
  )();
}

async function readDashboardStatsForCompanyFromDatabase(
  companyId: string
): Promise<DashboardStatsData> {
  const startedAt = Date.now();
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [summaryRows, byCategoryRows, recentExpenses] = await Promise.all([
    prisma.$queryRaw<DashboardStatsSummaryRow[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(e."amount"), 0) AS "totalExpenses",
        COUNT(*)::int AS "expenseCount",
        COALESCE(SUM(
          CASE
            WHEN e."date" >= ${startOfCurrentMonth} THEN e."amount"
            ELSE 0
          END
        ), 0) AS "thisMonth",
        COALESCE(SUM(
          CASE
            WHEN e."date" >= ${startOfPreviousMonth} AND e."date" < ${startOfCurrentMonth}
              THEN e."amount"
            ELSE 0
          END
        ), 0) AS "previousMonth",
        COALESCE(MAX(e."amount"), 0) AS "largestExpense"
      FROM "Expense" e
      WHERE e."companyId" = ${companyId}
    `),
    prisma.$queryRaw<DashboardStatsCategoryRow[]>(Prisma.sql`
      SELECT
        COALESCE(c."name", 'Uncategorized') AS "name",
        COALESCE(c."color", '#888888') AS "color",
        COALESCE(SUM(e."amount"), 0) AS "amount"
      FROM "Expense" e
      LEFT JOIN "Category" c ON c."id" = e."categoryId"
      WHERE e."companyId" = ${companyId}
      GROUP BY c."id", c."name", c."color"
      ORDER BY COALESCE(SUM(e."amount"), 0) DESC
    `),
    prisma.expense.findMany({
      where: { companyId },
      include: {
        category: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const summaryRow = summaryRows[0];
  const totalExpenses = toNumericValue(summaryRow?.totalExpenses);
  const expenseCount = toNumericValue(summaryRow?.expenseCount);
  const thisMonth = toNumericValue(summaryRow?.thisMonth);
  const previousMonth = toNumericValue(summaryRow?.previousMonth);
  const largestExpense = toNumericValue(summaryRow?.largestExpense);
  const byCategory = byCategoryRows
    .map((row) => ({
      amount: toNumericValue(row.amount),
      color: row.color ?? "#888888",
      name: row.name ?? "Uncategorized",
    }))
    .sort((left, right) => right.amount - left.amount);
  const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;
  const monthlyTrend: DashboardTrend = thisMonth >= previousMonth ? "up" : "down";
  const monthlyChangePercent =
    previousMonth > 0
      ? `${Math.abs(((thisMonth - previousMonth) / previousMonth) * 100).toFixed(1)}%`
      : expenseCount > 0
        ? "N/A"
        : "0%";

  logger.debug("dashboard_stats_read_model_cache_miss", {
    companyId,
    durationMs: Date.now() - startedAt,
    categoryCount: byCategory.length,
    recentExpenseCount: recentExpenses.length,
  });

  return {
    averageExpense,
    byCategory,
    categoryCount: byCategory.length,
    expenseCount,
    largestExpense,
    monthlyChangePercent,
    monthlyTrend,
    previousMonth,
    recentExpenses: recentExpenses.map(serializeExpense),
    thisMonth,
    totalExpenses,
  };
}

function getCachedDashboardStatsForCompany(
  companyId: string
): Promise<DashboardStatsData> {
  const tags = getCompanyReadModelCacheTags(companyId);

  return unstable_cache(
    async (): Promise<DashboardStatsData> =>
      readDashboardStatsForCompanyFromDatabase(companyId),
    ["dashboard-stats", companyId],
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.dashboard,
      tags: [tags.dashboard, tags.expenses, tags.analytics, tags.categories],
    }
  )();
}

export async function getDashboardStatsForCompany(
  companyId: string
): Promise<DashboardStatsResult> {
  try {
    const data = await getCachedDashboardStatsForCompany(companyId);
    return { data };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    };
  }
}
