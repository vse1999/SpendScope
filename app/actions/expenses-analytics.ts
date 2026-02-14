"use server";

import { prisma } from "@/lib/prisma";
import { serializeExpense } from "@/lib/expenses/action-helpers";
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

    // Get start of current and previous month for trend calculation
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Run all queries in parallel using DB aggregation
    const [
      totalAgg,
      totalCount,
      thisMonthAgg,
      previousMonthAgg,
      categoryGroups,
      recentExpenses,
      largestExpenseAgg,
    ] = await Promise.all([
      // Total amount across all expenses
      prisma.expense.aggregate({
        where: { companyId },
        _sum: { amount: true },
      }),
      // Total count of expenses
      prisma.expense.count({
        where: { companyId },
      }),
      // This month's total
      prisma.expense.aggregate({
        where: { companyId, date: { gte: startOfCurrentMonth } },
        _sum: { amount: true },
      }),
      // Previous month's total (for trend calculation)
      prisma.expense.aggregate({
        where: {
          companyId,
          date: { gte: startOfPreviousMonth, lt: startOfCurrentMonth },
        },
        _sum: { amount: true },
      }),
      // Group by category for breakdown
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { companyId },
        _sum: { amount: true },
      }),
      // Recent 10 expenses for the table
      prisma.expense.findMany({
        where: { companyId },
        include: {
          category: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      }),
      // Largest single expense
      prisma.expense.aggregate({
        where: { companyId },
        _max: { amount: true },
      }),
    ]);

    // Resolve category names for the breakdown
    const categoryIds = categoryGroups.map((g) => g.categoryId);
    const categories = categoryIds.length > 0
      ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true },
      })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const byCategory = categoryGroups
      .map((g) => {
        const cat = categoryMap.get(g.categoryId);
        return {
          name: cat?.name || "Uncategorized",
          color: cat?.color || "#888888",
          amount: Number(g._sum.amount ?? 0),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Compute stats
    const totalExpenses = Number(totalAgg._sum.amount ?? 0);
    const thisMonth = Number(thisMonthAgg._sum.amount ?? 0);
    const previousMonth = Number(previousMonthAgg._sum.amount ?? 0);
    const averageExpense = totalCount > 0 ? totalExpenses / totalCount : 0;
    const largestExpense = Number(largestExpenseAgg._max.amount ?? 0);

    // Compute trend
    const monthlyTrend: "up" | "down" = thisMonth >= previousMonth ? "up" : "down";
    const monthlyChangePercent =
      previousMonth > 0
        ? Math.abs(((thisMonth - previousMonth) / previousMonth) * 100).toFixed(1) + "%"
        : totalCount > 0
          ? "N/A"
          : "0%";

    // Serialize recent expenses
    const serializedExpenses = recentExpenses.map(serializeExpense);

    return {
      data: {
        totalExpenses,
        thisMonth,
        previousMonth,
        monthlyTrend,
        monthlyChangePercent,
        expenseCount: totalCount,
        averageExpense,
        largestExpense,
        byCategory,
        recentExpenses: serializedExpenses,
        categoryCount: byCategory.length,
      },
    };
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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

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
          monthlyTrend: [],
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

    // Calculate monthly trend
    const monthlyMap = new Map<string, { month: string; amount: number; monthKey: string }>();

    for (const expense of expenses) {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      const existing = monthlyMap.get(monthKey);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        monthlyMap.set(monthKey, {
          month: monthName,
          amount: Number(expense.amount),
          monthKey,
        });
      }
    }

    const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey)
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

