"use server";

import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import {
  COMPANY_CACHE_TTL_SECONDS,
  getCompanyReadModelCacheTags,
} from "@/lib/cache/company-read-model-cache";
import { getAnalyticsPeriodBounds, parseAnalyticsDaysParam } from "@/lib/analytics/date-range";
import { prisma } from "@/lib/prisma";
import type { AnalyticsData } from "@/types/analytics";
import { buildMonthlyTrend, normalizeAnalyticsDays } from "@/lib/analytics/monthly-trend";
import { getDashboardStatsForCompany } from "@/lib/dashboard/queries";
import { createLogger } from "@/lib/monitoring/logger";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { getCurrentUserCompanyId } from "./expenses-shared";

interface AnalyticsMonthlyTotalRow {
  monthStart: Date;
  totalAmount: Prisma.Decimal | number | string | null;
}

interface AnalyticsCategoryDistributionRow {
  amount: Prisma.Decimal | number | string | null;
  color: string | null;
  name: string;
}

interface AnalyticsUserSpendingRow {
  amount: Prisma.Decimal | number | string | null;
  count: number | bigint;
  email: string;
  name: string;
}

interface GetAnalyticsDataResult {
  code?: "FORBIDDEN_FEATURE";
  data?: AnalyticsData;
  error?: string;
}
const logger = createLogger("expenses-analytics-action");

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

/**
 * Get expense statistics for the current user's company
 * Returns total expenses, this month's expenses, and breakdown by category
 */
export async function getExpenseStats() {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    // Get start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all expenses for the company
    const expenses = await prisma.expense.findMany({
      where: { companyId },
      include: {
        category: true,
      },
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    // Calculate this month's expenses
    const thisMonth = expenses
      .filter((expense) => expense.date >= startOfMonth)
      .reduce((sum, expense) => sum + Number(expense.amount), 0);

    // Group by category
    const byCategoryMap = new Map<
      string,
      { name: string; color: string; amount: number }
    >();

    for (const expense of expenses) {
      const categoryName = expense.category.name;
      const categoryColor = expense.category.color;
      const current = byCategoryMap.get(categoryName) || {
        name: categoryName,
        color: categoryColor,
        amount: 0,
      };
      current.amount += Number(expense.amount);
      byCategoryMap.set(categoryName, current);
    }

    const byCategory = Array.from(byCategoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    return {
      totalExpenses,
      thisMonth,
      byCategory,
    };
  } catch (error) {
    logger.error("Failed to fetch expense stats", { error });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch expense stats",
    };
  }
}

/**
 * Get all dashboard data efficiently using DB aggregation
 * Replaces the need for separate getExpensesByCompany() + getExpenseStats() calls
 */
export async function getDashboardStats() {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }
    return getDashboardStatsForCompany(companyId);
  } catch (error) {
    logger.error("Failed to fetch dashboard stats", { error });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    };
  }
}

async function readAnalyticsDataForCompany(
  companyId: string,
  normalizedDays: number
): Promise<AnalyticsData> {
  const { endDate, endExclusive, startDate } = getAnalyticsPeriodBounds(normalizedDays);
  const whereClause = {
    companyId,
    date: {
      gte: startDate,
      lt: endExclusive,
    },
  };
  const monthBucketSql = Prisma.sql`date_trunc('month', "date" AT TIME ZONE 'UTC')`;

  // Keep the output shape identical, but aggregate in the database instead of
  // materializing every expense row and related record in Node.js.
  const [summaryResult, monthlyTotalRows, categoryDistributionRows, userSpendingRows] = await Promise.all([
    prisma.expense.aggregate({
      where: whereClause,
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.$queryRaw<AnalyticsMonthlyTotalRow[]>(Prisma.sql`
      SELECT
        ${monthBucketSql} AS "monthStart",
        COALESCE(SUM("amount"), 0) AS "totalAmount"
      FROM "Expense"
      WHERE "companyId" = ${companyId}
        AND "date" >= ${startDate}
        AND "date" < ${endExclusive}
      GROUP BY ${monthBucketSql}
      ORDER BY ${monthBucketSql} ASC
    `),
    prisma.$queryRaw<AnalyticsCategoryDistributionRow[]>(Prisma.sql`
      SELECT
        c."name" AS "name",
        c."color" AS "color",
        COALESCE(SUM(e."amount"), 0) AS "amount"
      FROM "Expense" e
      INNER JOIN "Category" c ON c."id" = e."categoryId"
      WHERE e."companyId" = ${companyId}
        AND e."date" >= ${startDate}
        AND e."date" < ${endExclusive}
      GROUP BY c."id", c."name", c."color"
      ORDER BY "amount" DESC, c."name" ASC
    `),
    prisma.$queryRaw<AnalyticsUserSpendingRow[]>(Prisma.sql`
      SELECT
        COALESCE(u."name", u."email", 'unknown') AS "name",
        COALESCE(u."email", 'unknown') AS "email",
        COALESCE(SUM(e."amount"), 0) AS "amount",
        COUNT(*)::int AS "count"
      FROM "Expense" e
      LEFT JOIN "User" u ON u."id" = e."userId"
      WHERE e."companyId" = ${companyId}
        AND e."date" >= ${startDate}
        AND e."date" < ${endExclusive}
      GROUP BY u."id", u."name", u."email"
      ORDER BY "amount" DESC, "email" ASC
    `),
  ]);
  const totalCount = summaryResult._count._all;
  const totalAmount = Number(summaryResult._sum.amount ?? 0);

  if (totalCount === 0) {
    return {
      monthlyTrend: buildMonthlyTrend([], endDate, normalizedDays),
      categoryDistribution: [],
      userSpending: [],
      summary: {
        totalAmount: 0,
        totalCount: 0,
        averageExpense: 0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  const monthlyTrend = buildMonthlyTrend(
    monthlyTotalRows.map((row) => ({
      date: new Date(row.monthStart),
      amount: toNumericValue(row.totalAmount),
    })),
    endDate,
    normalizedDays
  );
  const categoryDistribution = categoryDistributionRows.map((row) => ({
    name: row.name,
    color: row.color ?? "#888888",
    amount: toNumericValue(row.amount),
  }));
  const userSpending = userSpendingRows.map((row) => ({
    name: row.name,
    email: row.email,
    amount: toNumericValue(row.amount),
    count: toNumericValue(row.count),
  }));

  return {
    monthlyTrend,
    categoryDistribution,
    userSpending,
    summary: {
      totalAmount,
      totalCount,
      averageExpense: totalAmount / totalCount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
}

function getCachedAnalyticsDataForCompany(
  companyId: string,
  normalizedDays: number
): Promise<AnalyticsData> {
  const tags = getCompanyReadModelCacheTags(companyId);

  return unstable_cache(
    async (): Promise<AnalyticsData> =>
      readAnalyticsDataForCompany(companyId, normalizedDays),
    ["analytics-data", companyId, normalizedDays.toString()],
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.analytics,
      tags: [tags.analytics, tags.expenses, tags.categories],
    }
  )();
}

/**
 * Get analytics data for charts and visualizations
 * Returns monthly trends, category distribution, and user spending
 */
export async function getAnalyticsData(days: number = 90): Promise<GetAnalyticsDataResult> {
  try {
    const companyId = await getCurrentUserCompanyId();

    if (!companyId) {
      return { error: "User not assigned to company" };
    }

    const analyticsAccess = await checkFeatureLimit(companyId, "analytics");
    if (!analyticsAccess.allowed) {
      return {
        error: analyticsAccess.reason ?? "Advanced analytics is available on the Pro plan",
        code: "FORBIDDEN_FEATURE" as const,
      };
    }

    const normalizedDays = normalizeAnalyticsDays(
      parseAnalyticsDaysParam(days, 90),
      90
    );
    const data = await getCachedAnalyticsDataForCompany(companyId, normalizedDays);
    return {
      data,
    };
  } catch (error) {
    logger.error("Failed to fetch analytics data", { error, days });
    return {
      error: error instanceof Error ? error.message : "Failed to fetch analytics data",
    };
  }
}

