"use server";

import { prisma } from "@/lib/prisma";
import { buildMonthlyTrend, normalizeAnalyticsDays } from "@/lib/analytics/monthly-trend";
import { getDashboardStatsForCompany } from "@/lib/dashboard/queries";
import { checkFeatureLimit } from "@/lib/subscription/feature-gate-service";
import { getCurrentUserCompanyId } from "./expenses-shared";

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
    console.error("Failed to fetch expense stats:", error);
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
    console.error("Failed to fetch dashboard stats:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    };
  }
}

/**
 * Get analytics data for charts and visualizations
 * Returns monthly trends, category distribution, and user spending
 */
export async function getAnalyticsData(days: number = 90) {
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

    const normalizedDays = normalizeAnalyticsDays(days, 90);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - normalizedDays);

    // Fetch expenses with relations
    const expenses = await prisma.expense.findMany({
      where: {
        companyId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    if (expenses.length === 0) {
      return {
        data: {
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
        },
      };
    }

    const monthlyTrend = buildMonthlyTrend(
      expenses.map((expense) => ({
        date: new Date(expense.date),
        amount: Number(expense.amount),
      })),
      endDate,
      normalizedDays
    );

    // Calculate category distribution
    const categoryMap = new Map<string, { name: string; color: string; amount: number }>();

    for (const expense of expenses) {
      const categoryName = expense.category?.name || "Uncategorized";
      const categoryColor = expense.category?.color || "#888888";

      const existing = categoryMap.get(categoryName);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        categoryMap.set(categoryName, {
          name: categoryName,
          color: categoryColor,
          amount: Number(expense.amount),
        });
      }
    }

    const categoryDistribution = Array.from(categoryMap.values()).sort(
      (a, b) => b.amount - a.amount
    );

    // Calculate user spending
    const userMap = new Map<string, { name: string; email: string; amount: number; count: number }>();

    for (const expense of expenses) {
      const email = expense.user?.email || "unknown";
      const name = expense.user?.name || email;

      const existing = userMap.get(email);
      if (existing) {
        existing.amount += Number(expense.amount);
        existing.count += 1;
      } else {
        userMap.set(email, {
          name,
          email,
          amount: Number(expense.amount),
          count: 1,
        });
      }
    }

    const userSpending = Array.from(userMap.values()).sort((a, b) => b.amount - a.amount);

    // Calculate summary
    const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      data: {
        monthlyTrend,
        categoryDistribution,
        userSpending,
        summary: {
          totalAmount,
          totalCount: expenses.length,
          averageExpense: totalAmount / expenses.length,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    };
  } catch (error) {
    console.error("Failed to fetch analytics data:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch analytics data",
    };
  }
}

