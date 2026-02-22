import type { MonthlyTrend } from "@/types/analytics";

const DAYS_PER_MONTH_APPROX = 30;
const MIN_MONTH_BUCKETS = 2;

export interface MonthlyExpensePoint {
  date: Date;
  amount: number;
}

function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function toUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0));
}

function addUtcMonths(date: Date, monthDelta: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + monthDelta, 1, 12, 0, 0));
}

export function normalizeAnalyticsDays(days: number, fallback: number = 90): number {
  if (!Number.isFinite(days) || days <= 0) {
    return fallback;
  }
  return Math.floor(days);
}

export function getMonthlyBucketCount(days: number): number {
  const normalizedDays = normalizeAnalyticsDays(days);
  return Math.max(MIN_MONTH_BUCKETS, Math.round(normalizedDays / DAYS_PER_MONTH_APPROX));
}

export function buildMonthlyTrend(
  expenses: MonthlyExpensePoint[],
  endDate: Date,
  days: number
): MonthlyTrend[] {
  const bucketCount = getMonthlyBucketCount(days);
  const endMonthStart = toUtcMonthStart(endDate);
  const monthlyTotals = new Map<string, number>();

  for (const expense of expenses) {
    const monthKey = toMonthKey(expense.date);
    const existingAmount = monthlyTotals.get(monthKey) ?? 0;
    monthlyTotals.set(monthKey, existingAmount + expense.amount);
  }

  const trend: MonthlyTrend[] = [];
  for (let index = bucketCount - 1; index >= 0; index -= 1) {
    const monthDate = addUtcMonths(endMonthStart, -index);
    const monthKey = toMonthKey(monthDate);
    const label = toMonthLabel(monthDate);

    trend.push({
      label,
      bucketKey: monthKey,
      bucketType: "month",
      month: label,
      monthKey,
      amount: monthlyTotals.get(monthKey) ?? 0,
    });
  }

  return trend;
}
