export type ExpenseAnomalyRuleType = "DUPLICATE" | "POLICY_BREACH" | "UNUSUAL_SPEND";
export type ExpenseAnomalyStatus = "OPEN" | "APPROVED" | "DISMISSED";

export interface ExpenseCopilotAlert {
  id: string;
  expenseId: string;
  ruleType: ExpenseAnomalyRuleType;
  status: ExpenseAnomalyStatus;
  severity: number;
  confidence: number;
  reason: string;
  createdAt: Date;
  expense: {
    id: string;
    amount: number;
    description: string;
    date: Date;
    categoryName: string;
    userDisplayName: string;
    userId: string;
  };
}

export type GetExpenseCopilotAlertsResult =
  | { success: true; alerts: ExpenseCopilotAlert[] }
  | { success: false; error: string; code?: "UNAUTHORIZED" };

export type ResolveExpenseCopilotAction = "APPROVE" | "DISMISS";

export type ResolveExpenseCopilotAlertResult =
  | { success: true; alertId: string; status: ExpenseAnomalyStatus }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_STATE" };

export interface ExpensePolicyRuleView {
  id: string;
  scopeType: "GLOBAL" | "CATEGORY";
  categoryId: string | null;
  thresholdUsd: number;
  requiresReceiptAboveUsd: number | null;
  updatedAt: Date;
}

export interface ExpensePolicyConfigView {
  globalThresholdUsd: number;
  categoryThresholds: Record<string, number>;
}

export type GetExpensePolicyConfigResult =
  | { success: true; config: ExpensePolicyConfigView; rules: ExpensePolicyRuleView[] }
  | { success: false; error: string; code?: "UNAUTHORIZED" };

export type UpdateExpensePolicyResult =
  | { success: true }
  | { success: false; error: string; code?: "UNAUTHORIZED" | "VALIDATION_ERROR" };

