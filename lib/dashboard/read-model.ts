import { cache } from "react"
import { unstable_cache } from "next/cache"
import { Prisma, type Category } from "@prisma/client"
import type { SerializedExpense } from "@/app/actions/expenses-types"
import { buildBudgetSummary, getCompanyBudgetSettings } from "@/lib/budget/service"
import type { BudgetSummary, CompanyBudgetSettings } from "@/lib/budget/types"
import {
  COMPANY_CACHE_TTL_SECONDS,
  getCompanyReadModelCacheTags,
} from "@/lib/cache/company-read-model-cache"
import { serializeExpense } from "@/lib/expenses/action-helpers"
import { createLogger } from "@/lib/monitoring/logger"
import { prisma } from "@/lib/prisma"

type DashboardTrend = "up" | "down"
type DashboardBudgetErrorCode = "UNAUTHORIZED" | "VALIDATION_ERROR"
type DashboardCacheOutcome = "hit" | "miss" | "stale"

const logger = createLogger("dashboard-read-model")

export interface DashboardStatsCategory {
  amount: number
  color: string
  name: string
}

export interface DashboardStatsData {
  averageExpense: number
  byCategory: DashboardStatsCategory[]
  categoryCount: number
  expenseCount: number
  largestExpense: number
  monthlyChangePercent: string
  monthlyTrend: DashboardTrend
  previousMonth: number
  recentExpenses: SerializedExpense[]
  thisMonth: number
  totalExpenses: number
}

export type DashboardBudgetStateResult =
  | { success: true; settings: CompanyBudgetSettings | null; summary: BudgetSummary }
  | { success: false; error: string; code: DashboardBudgetErrorCode }

export type DashboardCategoriesResult = Category[] | { error: string }

export type DashboardStatsResult =
  | { data: DashboardStatsData }
  | { error: string }

export interface DashboardCriticalStatsData {
  averageExpense: number
  categoryCount: number
  expenseCount: number
  largestExpense: number
  monthlyChangePercent: string
  monthlyTrend: DashboardTrend
  previousMonth: number
  recentExpenses: SerializedExpense[]
  thisMonth: number
  totalExpenses: number
}

export interface DashboardCriticalReadModelData {
  budgetSettings: CompanyBudgetSettings | null
  budgetSummary: BudgetSummary
  categories: Category[]
  stats: DashboardCriticalStatsData
}

export interface DashboardCategoryBreakdownData {
  byCategory: DashboardStatsCategory[]
}

interface DashboardCacheEnvelope<T> {
  fetchedAt: string
  value: T
}

interface DashboardStatsSummaryRow {
  categoryCount: number | bigint | string
  expenseCount: number | bigint | string
  largestExpense: Prisma.Decimal | number | string | null
  previousMonth: Prisma.Decimal | number | string | null
  thisMonth: Prisma.Decimal | number | string | null
  totalExpenses: Prisma.Decimal | number | string | null
}

interface DashboardStatsCategoryRow {
  amount: Prisma.Decimal | number | string | null
  color: string | null
  name: string | null
}

function toNumericValue(
  value: Prisma.Decimal | number | string | bigint | null | undefined
): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === "number") {
    return value
  }

  if (typeof value === "bigint") {
    return Number(value)
  }

  return Number(value)
}

function getCurrentMonthCacheKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${date.getFullYear()}-${month}`
}

function resolveDashboardCacheOutcome<T>(
  cacheMiss: boolean,
  ttlSeconds: number,
  envelope: DashboardCacheEnvelope<T>
): { cacheAgeMs: number; cacheOutcome: DashboardCacheOutcome } {
  const fetchedAtMs = new Date(envelope.fetchedAt).getTime()
  const cacheAgeMs = Number.isNaN(fetchedAtMs) ? 0 : Math.max(0, Date.now() - fetchedAtMs)

  if (cacheMiss) {
    return {
      cacheAgeMs,
      cacheOutcome: "miss",
    }
  }

  return {
    cacheAgeMs,
    cacheOutcome: cacheAgeMs >= ttlSeconds * 1000 ? "stale" : "hit",
  }
}

function createDashboardCacheEnvelope<T>(value: T): DashboardCacheEnvelope<T> {
  return {
    fetchedAt: new Date().toISOString(),
    value,
  }
}

async function measureDashboardStage<T>(
  stageName: string,
  details: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()

  try {
    const result = await fn()

    logger.info("dashboard_read_model_stage", {
      ...details,
      durationMs: Date.now() - startedAt,
      stageName,
    })

    return result
  } catch (error) {
    logger.error("dashboard_read_model_stage_failed", {
      ...details,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown error",
      stageName,
    })

    throw error
  }
}

function logDashboardCacheResult<T>(input: {
  cacheKey: string[]
  cacheMiss: boolean
  cacheName: string
  companyId: string
  envelope: DashboardCacheEnvelope<T>
  tags: string[]
  ttlSeconds: number
}): void {
  const { cacheAgeMs, cacheOutcome } = resolveDashboardCacheOutcome(
    input.cacheMiss,
    input.ttlSeconds,
    input.envelope
  )

  logger.info("dashboard_read_model_cache", {
    cacheAgeMs,
    cacheKey: input.cacheKey.join(":"),
    cacheName: input.cacheName,
    cacheOutcome,
    companyId: input.companyId,
    fetchedAt: input.envelope.fetchedAt,
    tags: input.tags,
    ttlSeconds: input.ttlSeconds,
  })
}

async function readDashboardCriticalReadModelFromDatabase(
  companyId: string
): Promise<DashboardCriticalReadModelData> {
  const startedAt = Date.now()
  const now = new Date()
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [summaryRows, recentExpenses, categories, budgetSettings] = await Promise.all([
    measureDashboardStage("dashboard_summary_sql", { companyId }, async () =>
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
          COALESCE(MAX(e."amount"), 0) AS "largestExpense",
          COUNT(DISTINCT e."categoryId")::int AS "categoryCount"
        FROM "Expense" e
        WHERE e."companyId" = ${companyId}
      `)
    ),
    measureDashboardStage("dashboard_recent_expenses_query", { companyId }, async () =>
      prisma.expense.findMany({
        where: { companyId },
        include: {
          category: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      })
    ),
    measureDashboardStage("dashboard_categories_query", { companyId }, async () =>
      prisma.category.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      })
    ),
    measureDashboardStage("dashboard_budget_settings_query", { companyId }, async () =>
      getCompanyBudgetSettings(companyId)
    ),
  ])

  const summaryRow = summaryRows[0]
  const totalExpenses = toNumericValue(summaryRow?.totalExpenses)
  const expenseCount = toNumericValue(summaryRow?.expenseCount)
  const thisMonth = toNumericValue(summaryRow?.thisMonth)
  const previousMonth = toNumericValue(summaryRow?.previousMonth)
  const largestExpense = toNumericValue(summaryRow?.largestExpense)
  const categoryCount = toNumericValue(summaryRow?.categoryCount)
  const averageExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0
  const monthlyTrend: DashboardTrend = thisMonth >= previousMonth ? "up" : "down"
  const monthlyChangePercent =
    previousMonth > 0
      ? `${Math.abs(((thisMonth - previousMonth) / previousMonth) * 100).toFixed(1)}%`
      : expenseCount > 0
        ? "N/A"
        : "0%"

  const stats: DashboardCriticalStatsData = {
    averageExpense,
    categoryCount,
    expenseCount,
    largestExpense,
    monthlyChangePercent,
    monthlyTrend,
    previousMonth,
    recentExpenses: recentExpenses.map(serializeExpense),
    thisMonth,
    totalExpenses,
  }

  logger.info("dashboard_critical_read_model_refreshed", {
    activeCategoryCount: categoryCount,
    categoryCatalogCount: categories.length,
    companyId,
    durationMs: Date.now() - startedAt,
    recentExpenseCount: recentExpenses.length,
  })

  return {
    budgetSettings,
    budgetSummary: buildBudgetSummary(budgetSettings, thisMonth),
    categories,
    stats,
  }
}

async function readDashboardCategoryBreakdownFromDatabase(
  companyId: string
): Promise<DashboardCategoryBreakdownData> {
  const startedAt = Date.now()
  const byCategoryRows = await measureDashboardStage(
    "dashboard_category_breakdown_sql",
    { companyId },
    async () =>
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
      `)
  )

  const byCategory = byCategoryRows
    .map((row) => ({
      amount: toNumericValue(row.amount),
      color: row.color ?? "#888888",
      name: row.name ?? "Uncategorized",
    }))
    .sort((left, right) => right.amount - left.amount)

  logger.info("dashboard_category_breakdown_refreshed", {
    categoryCount: byCategory.length,
    companyId,
    durationMs: Date.now() - startedAt,
  })

  return { byCategory }
}

async function getCachedDashboardCriticalEnvelope(
  companyId: string
): Promise<DashboardCacheEnvelope<DashboardCriticalReadModelData>> {
  const currentMonthCacheKey = getCurrentMonthCacheKey()
  const tags = getCompanyReadModelCacheTags(companyId)
  const cacheKey = ["dashboard-read-model", "critical", companyId, currentMonthCacheKey]
  const cacheTags = [tags.dashboard, tags.expenses, tags.categories]
  let cacheMiss = false

  const envelope = await unstable_cache(
    async (): Promise<DashboardCacheEnvelope<DashboardCriticalReadModelData>> => {
      cacheMiss = true
      const value = await readDashboardCriticalReadModelFromDatabase(companyId)
      return createDashboardCacheEnvelope(value)
    },
    cacheKey,
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.dashboard,
      tags: cacheTags,
    }
  )()

  logDashboardCacheResult({
    cacheKey,
    cacheMiss,
    cacheName: "dashboard_critical_read_model",
    companyId,
    envelope,
    tags: cacheTags,
    ttlSeconds: COMPANY_CACHE_TTL_SECONDS.dashboard,
  })

  return envelope
}

async function getCachedDashboardCategoryBreakdownEnvelope(
  companyId: string
): Promise<DashboardCacheEnvelope<DashboardCategoryBreakdownData>> {
  const tags = getCompanyReadModelCacheTags(companyId)
  const cacheKey = ["dashboard-read-model", "category-breakdown", companyId]
  const cacheTags = [tags.dashboard, tags.expenses, tags.analytics, tags.categories]
  let cacheMiss = false

  const envelope = await unstable_cache(
    async (): Promise<DashboardCacheEnvelope<DashboardCategoryBreakdownData>> => {
      cacheMiss = true
      const value = await readDashboardCategoryBreakdownFromDatabase(companyId)
      return createDashboardCacheEnvelope(value)
    },
    cacheKey,
    {
      revalidate: COMPANY_CACHE_TTL_SECONDS.dashboard,
      tags: cacheTags,
    }
  )()

  logDashboardCacheResult({
    cacheKey,
    cacheMiss,
    cacheName: "dashboard_category_breakdown",
    companyId,
    envelope,
    tags: cacheTags,
    ttlSeconds: COMPANY_CACHE_TTL_SECONDS.dashboard,
  })

  return envelope
}

const getDashboardCriticalReadModelMemoized = cache(
  async (companyId: string): Promise<DashboardCriticalReadModelData> => {
    const envelope = await getCachedDashboardCriticalEnvelope(companyId)
    return envelope.value
  }
)

const getDashboardCategoryBreakdownMemoized = cache(
  async (companyId: string): Promise<DashboardCategoryBreakdownData> => {
    const envelope = await getCachedDashboardCategoryBreakdownEnvelope(companyId)
    return envelope.value
  }
)

export async function getDashboardCriticalReadModelForCompany(
  companyId: string
): Promise<DashboardCriticalReadModelData> {
  return getDashboardCriticalReadModelMemoized(companyId)
}

export async function getDashboardCategoryBreakdownForCompany(
  companyId: string
): Promise<DashboardCategoryBreakdownData> {
  return getDashboardCategoryBreakdownMemoized(companyId)
}

