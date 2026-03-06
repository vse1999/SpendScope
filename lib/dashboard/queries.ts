import { unstable_cache } from "next/cache";
import { type Category } from "@prisma/client";
import type { SerializedExpense } from "@/app/actions/expenses-types";
import {
  getBudgetSummary,
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
import { prisma } from "@/lib/prisma";

type DashboardTrend = "up" | "down";
type DashboardBudgetErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR";

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

async function readCategoriesForCompanyFromDatabase(
  companyId: string
): Promise<Category[]> {
  return prisma.category.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
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
    const [settings, summary] = await Promise.all([
      getCompanyBudgetSettings(companyId),
      getBudgetSummary(companyId),
    ]);

    return { success: true, settings, summary };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch budget",
      code: "VALIDATION_ERROR",
    };
  }
}

async function readDashboardStatsForCompanyFromDatabase(
  companyId: string
): Promise<DashboardStatsData> {
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalAgg,
    totalCount,
    thisMonthAgg,
    previousMonthAgg,
    categoryGroups,
    recentExpenses,
    largestExpenseAgg,
  ] = await Promise.all([
    prisma.expense.aggregate({
      where: { companyId },
      _sum: { amount: true },
    }),
    prisma.expense.count({
      where: { companyId },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: startOfCurrentMonth } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: {
        companyId,
        date: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
      },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { companyId },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: { companyId },
      include: {
        category: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.expense.aggregate({
      where: { companyId },
      _max: { amount: true },
    }),
  ]);

  const categoryIds = categoryGroups.map((group) => group.categoryId);
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true },
      })
    : [];

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const byCategory = categoryGroups
    .map((group) => {
      const category = categoryMap.get(group.categoryId);
      return {
        amount: Number(group._sum.amount ?? 0),
        color: category?.color || "#888888",
        name: category?.name || "Uncategorized",
      };
    })
    .sort((left, right) => right.amount - left.amount);

  const totalExpenses = Number(totalAgg._sum.amount ?? 0);
  const thisMonth = Number(thisMonthAgg._sum.amount ?? 0);
  const previousMonth = Number(previousMonthAgg._sum.amount ?? 0);
  const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
  const largestExpense = Number(largestExpenseAgg._max.amount ?? 0);
  const monthlyTrend: DashboardTrend = thisMonth >= previousMonth ? "up" : "down";
  const monthlyChangePercent =
    previousMonth > 0
      ? `${Math.abs(((thisMonth - previousMonth) / previousMonth) * 100).toFixed(1)}%`
      : totalCount > 0
        ? "N/A"
        : "0%";

  return {
    averageExpense,
    byCategory,
    categoryCount: byCategory.length,
    expenseCount: totalCount,
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
