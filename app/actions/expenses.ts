"use server";

import {
  deleteCategoryExpensePolicyThreshold as deleteCategoryExpensePolicyThresholdAction,
  getExpenseCopilotAlerts as getExpenseCopilotAlertsAction,
  getExpensePolicyConfigForCompany as getExpensePolicyConfigForCompanyAction,
  resolveExpenseCopilotAlert as resolveExpenseCopilotAlertAction,
  updateGlobalExpensePolicyThreshold as updateGlobalExpensePolicyThresholdAction,
  upsertCategoryExpensePolicyThreshold as upsertCategoryExpensePolicyThresholdAction,
} from "./expenses-copilot-policy";
import type {
  GetExpenseCopilotAlertsResult,
  GetExpensePolicyConfigResult,
  ResolveExpenseCopilotAction,
  ResolveExpenseCopilotAlertResult,
  UpdateExpensePolicyResult,
} from "./expenses-copilot-policy";
import {
  getCategories as getCategoriesAction,
  getExpensesByCompany as getExpensesByCompanyAction,
  getPaginatedExpenses as getPaginatedExpensesAction,
} from "./expenses-core-queries";
import { getAnalyticsData as getAnalyticsDataAction, getDashboardStats as getDashboardStatsAction, getExpenseStats as getExpenseStatsAction } from "./expenses-analytics";
import { createExpense as createExpenseAction } from "./expenses-create";
import { updateExpense as updateExpenseAction } from "./expenses-update";
import { deleteExpense as deleteExpenseAction, getExpenseHistory as getExpenseHistoryAction } from "./expenses-history-delete";
import {
  exportExpensesCSV as exportExpensesCSVAction,
  getExpensesSummary as getExpensesSummaryAction,
  getExpensesWithFilters as getExpensesWithFiltersAction,
} from "./expenses-filtering";
import { bulkDeleteExpenses as bulkDeleteExpensesAction, bulkUpdateCategory as bulkUpdateCategoryAction } from "./expenses-bulk";
import type {
  ExpenseFilters,
} from "./expenses-types";
export type {
  ExpenseCopilotAlert,
  ExpensePolicyConfigView,
  ExpensePolicyRuleView,
  ResolveExpenseCopilotAction,
} from "./expenses-copilot-policy";
export type { SerializedExpense } from "./expenses-types";

type GetExpensesByCompanyResult = Awaited<ReturnType<typeof getExpensesByCompanyAction>>;
type GetPaginatedExpensesActionResult = Awaited<ReturnType<typeof getPaginatedExpensesAction>>;
type GetExpenseStatsResult = Awaited<ReturnType<typeof getExpenseStatsAction>>;
type GetDashboardStatsResult = Awaited<ReturnType<typeof getDashboardStatsAction>>;
type GetAnalyticsDataResult = Awaited<ReturnType<typeof getAnalyticsDataAction>>;
type CreateExpenseActionResult = Awaited<ReturnType<typeof createExpenseAction>>;
type UpdateExpenseActionResult = Awaited<ReturnType<typeof updateExpenseAction>>;
type GetExpenseHistoryResult = Awaited<ReturnType<typeof getExpenseHistoryAction>>;
type DeleteExpenseResult = Awaited<ReturnType<typeof deleteExpenseAction>>;
type GetCategoriesResult = Awaited<ReturnType<typeof getCategoriesAction>>;
type GetExpensesWithFiltersResult = Awaited<ReturnType<typeof getExpensesWithFiltersAction>>;
type GetExpensesSummaryResult = Awaited<ReturnType<typeof getExpensesSummaryAction>>;
type BulkDeleteExpensesResult = Awaited<ReturnType<typeof bulkDeleteExpensesAction>>;
type BulkUpdateCategoryResult = Awaited<ReturnType<typeof bulkUpdateCategoryAction>>;
type ExportExpensesCsvResult = Awaited<ReturnType<typeof exportExpensesCSVAction>>;

type CursorPaginationParams = { cursor?: string | null; limit?: number };
type ExportExpensesCsvFilters = Omit<ExpenseFilters, "sort">;

async function executeExpenseAction<TResult>(
  actionName: string,
  action: () => Promise<TResult>
): Promise<TResult> {
  try {
    return await action();
  } catch (error) {
    console.error(`[expenses.actions] ${actionName} failed`, error);
    throw error;
  }
}

export async function getExpenseCopilotAlerts(): Promise<GetExpenseCopilotAlertsResult> {
  return executeExpenseAction("getExpenseCopilotAlerts", () => getExpenseCopilotAlertsAction());
}

export async function getExpensePolicyConfigForCompany(): Promise<GetExpensePolicyConfigResult> {
  return executeExpenseAction("getExpensePolicyConfigForCompany", () => getExpensePolicyConfigForCompanyAction());
}

export async function updateGlobalExpensePolicyThreshold(
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  return executeExpenseAction(
    "updateGlobalExpensePolicyThreshold",
    () => updateGlobalExpensePolicyThresholdAction(thresholdUsd)
  );
}

export async function upsertCategoryExpensePolicyThreshold(
  categoryId: string,
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  return executeExpenseAction(
    "upsertCategoryExpensePolicyThreshold",
    () => upsertCategoryExpensePolicyThresholdAction(categoryId, thresholdUsd)
  );
}

export async function deleteCategoryExpensePolicyThreshold(
  categoryId: string
): Promise<UpdateExpensePolicyResult> {
  return executeExpenseAction(
    "deleteCategoryExpensePolicyThreshold",
    () => deleteCategoryExpensePolicyThresholdAction(categoryId)
  );
}

export async function resolveExpenseCopilotAlert(
  alertId: string,
  action: ResolveExpenseCopilotAction
): Promise<ResolveExpenseCopilotAlertResult> {
  return executeExpenseAction(
    "resolveExpenseCopilotAlert",
    () => resolveExpenseCopilotAlertAction(alertId, action)
  );
}

export async function getExpensesByCompany(): Promise<GetExpensesByCompanyResult> {
  return executeExpenseAction("getExpensesByCompany", () => getExpensesByCompanyAction());
}

export async function getPaginatedExpenses(
  params: CursorPaginationParams = {}
): Promise<GetPaginatedExpensesActionResult> {
  return executeExpenseAction("getPaginatedExpenses", () => getPaginatedExpensesAction(params));
}

export async function getExpenseStats(): Promise<GetExpenseStatsResult> {
  return executeExpenseAction("getExpenseStats", () => getExpenseStatsAction());
}

export async function getDashboardStats(): Promise<GetDashboardStatsResult> {
  return executeExpenseAction("getDashboardStats", () => getDashboardStatsAction());
}

export async function getAnalyticsData(days: number = 90): Promise<GetAnalyticsDataResult> {
  return executeExpenseAction("getAnalyticsData", () => getAnalyticsDataAction(days));
}

export async function createExpense(formData: FormData): Promise<CreateExpenseActionResult> {
  return executeExpenseAction("createExpense", () => createExpenseAction(formData));
}

export async function updateExpense(id: string, formData: FormData): Promise<UpdateExpenseActionResult> {
  return executeExpenseAction("updateExpense", () => updateExpenseAction(id, formData));
}

export async function getExpenseHistory(id: string): Promise<GetExpenseHistoryResult> {
  return executeExpenseAction("getExpenseHistory", () => getExpenseHistoryAction(id));
}

export async function deleteExpense(id: string): Promise<DeleteExpenseResult> {
  return executeExpenseAction("deleteExpense", () => deleteExpenseAction(id));
}

export async function getCategories(): Promise<GetCategoriesResult> {
  return executeExpenseAction("getCategories", () => getCategoriesAction());
}

export async function getExpensesWithFilters(
  filters: ExpenseFilters,
  params: CursorPaginationParams = {}
): Promise<GetExpensesWithFiltersResult> {
  return executeExpenseAction(
    "getExpensesWithFilters",
    () => getExpensesWithFiltersAction(filters, params)
  );
}

export async function getExpensesSummary(filters: ExpenseFilters = {}): Promise<GetExpensesSummaryResult> {
  return executeExpenseAction("getExpensesSummary", () => getExpensesSummaryAction(filters));
}

export async function bulkDeleteExpenses(expenseIds: string[]): Promise<BulkDeleteExpensesResult> {
  return executeExpenseAction("bulkDeleteExpenses", () => bulkDeleteExpensesAction(expenseIds));
}

export async function bulkUpdateCategory(
  expenseIds: string[],
  categoryId: string
): Promise<BulkUpdateCategoryResult> {
  return executeExpenseAction(
    "bulkUpdateCategory",
    () => bulkUpdateCategoryAction(expenseIds, categoryId)
  );
}

export async function exportExpensesCSV(
  filters: ExportExpensesCsvFilters
): Promise<ExportExpensesCsvResult> {
  return executeExpenseAction("exportExpensesCSV", () => exportExpensesCSVAction(filters));
}
