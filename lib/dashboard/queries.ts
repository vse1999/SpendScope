import {
  type DashboardBudgetStateResult,
  type DashboardCategoriesResult,
  type DashboardStatsData,
  type DashboardStatsResult,
  getDashboardCategoryBreakdownForCompany,
  getDashboardCriticalReadModelForCompany,
} from "@/lib/dashboard/read-model"
import { createLogger } from "@/lib/monitoring/logger"

export type {
  DashboardBudgetStateResult,
  DashboardCategoriesResult,
  DashboardCategoryBreakdownData,
  DashboardCriticalReadModelData,
  DashboardCriticalStatsData,
  DashboardStatsCategory,
  DashboardStatsData,
  DashboardStatsResult,
} from "@/lib/dashboard/read-model"

const logger = createLogger("dashboard-queries")

export async function getCategoriesForCompany(companyId: string): Promise<DashboardCategoriesResult> {
  try {
    const readModel = await getDashboardCriticalReadModelForCompany(companyId)
    return readModel.categories
  } catch (error) {
    logger.error("Failed to fetch categories", { companyId, error })
    return {
      error: error instanceof Error ? error.message : "Failed to fetch categories",
    }
  }
}

export async function getCompanyBudgetStateForCompany(
  companyId: string
): Promise<DashboardBudgetStateResult> {
  try {
    const readModel = await getDashboardCriticalReadModelForCompany(companyId)
    return {
      settings: readModel.budgetSettings,
      success: true,
      summary: readModel.budgetSummary,
    }
  } catch (error) {
    return {
      code: "VALIDATION_ERROR",
      error: error instanceof Error ? error.message : "Failed to fetch budget",
      success: false,
    }
  }
}

export async function getDashboardStatsForCompany(companyId: string): Promise<DashboardStatsResult> {
  try {
    const [criticalReadModel, categoryBreakdown] = await Promise.all([
      getDashboardCriticalReadModelForCompany(companyId),
      getDashboardCategoryBreakdownForCompany(companyId),
    ])

    const data: DashboardStatsData = {
      ...criticalReadModel.stats,
      byCategory: categoryBreakdown.byCategory,
    }

    return { data }
  } catch (error) {
    logger.error("Failed to fetch dashboard stats", { companyId, error })
    return {
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    }
  }
}
