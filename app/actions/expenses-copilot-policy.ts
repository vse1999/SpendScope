"use server";

import type {
  ExpenseCopilotAlert as ExpenseCopilotAlertType,
  ExpensePolicyConfigView as ExpensePolicyConfigViewType,
  ExpensePolicyRuleView as ExpensePolicyRuleViewType,
  GetExpenseCopilotAlertsResult as GetExpenseCopilotAlertsResultType,
  GetExpensePolicyConfigResult as GetExpensePolicyConfigResultType,
  ResolveExpenseCopilotAction as ResolveExpenseCopilotActionType,
  ResolveExpenseCopilotAlertResult as ResolveExpenseCopilotAlertResultType,
  UpdateExpensePolicyResult as UpdateExpensePolicyResultType,
} from "./expenses-copilot-types";
import { getExpenseCopilotAlerts as getExpenseCopilotAlertsAction, resolveExpenseCopilotAlert as resolveExpenseCopilotAlertAction } from "./expenses-copilot-alerts";
import {
  deleteCategoryExpensePolicyThreshold as deleteCategoryExpensePolicyThresholdAction,
  getExpensePolicyConfigForCompany as getExpensePolicyConfigForCompanyAction,
  updateGlobalExpensePolicyThreshold as updateGlobalExpensePolicyThresholdAction,
  upsertCategoryExpensePolicyThreshold as upsertCategoryExpensePolicyThresholdAction,
} from "./expenses-policy-thresholds";

export type ExpenseCopilotAlert = ExpenseCopilotAlertType;
export type ExpensePolicyConfigView = ExpensePolicyConfigViewType;
export type ExpensePolicyRuleView = ExpensePolicyRuleViewType;
export type GetExpenseCopilotAlertsResult = GetExpenseCopilotAlertsResultType;
export type GetExpensePolicyConfigResult = GetExpensePolicyConfigResultType;
export type ResolveExpenseCopilotAction = ResolveExpenseCopilotActionType;
export type ResolveExpenseCopilotAlertResult = ResolveExpenseCopilotAlertResultType;
export type UpdateExpensePolicyResult = UpdateExpensePolicyResultType;

export async function getExpenseCopilotAlerts(): Promise<GetExpenseCopilotAlertsResult> {
  return getExpenseCopilotAlertsAction();
}

export async function getExpensePolicyConfigForCompany(): Promise<GetExpensePolicyConfigResult> {
  return getExpensePolicyConfigForCompanyAction();
}

export async function updateGlobalExpensePolicyThreshold(
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  return updateGlobalExpensePolicyThresholdAction(thresholdUsd);
}

export async function upsertCategoryExpensePolicyThreshold(
  categoryId: string,
  thresholdUsd: number
): Promise<UpdateExpensePolicyResult> {
  return upsertCategoryExpensePolicyThresholdAction(categoryId, thresholdUsd);
}

export async function deleteCategoryExpensePolicyThreshold(
  categoryId: string
): Promise<UpdateExpensePolicyResult> {
  return deleteCategoryExpensePolicyThresholdAction(categoryId);
}

export async function resolveExpenseCopilotAlert(
  alertId: string,
  action: ResolveExpenseCopilotAction
): Promise<ResolveExpenseCopilotAlertResult> {
  return resolveExpenseCopilotAlertAction(alertId, action);
}

