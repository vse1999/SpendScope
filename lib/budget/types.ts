export const BUDGET_EXHAUSTION_POLICY = {
  WARN_ONLY: "WARN_ONLY",
  BLOCK_NON_ADMIN: "BLOCK_NON_ADMIN",
  BLOCK_ALL: "BLOCK_ALL",
} as const;

export type BudgetExhaustionPolicy =
  (typeof BUDGET_EXHAUSTION_POLICY)[keyof typeof BUDGET_EXHAUSTION_POLICY];

export type BudgetHealth = "HEALTHY" | "WARNING" | "EXHAUSTED" | "OVER_BUDGET";

export interface CompanyBudgetSettings {
  id: string;
  companyId: string;
  monthlyBudget: number;
  currency: string;
  exhaustionPolicy: BudgetExhaustionPolicy;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummary {
  hasBudget: boolean;
  thisMonthSpent: number;
  budgetAmount: number | null;
  remaining: number | null;
  usagePercent: number | null;
  health: BudgetHealth;
  currency: string;
  exhaustionPolicy: BudgetExhaustionPolicy;
  isActive: boolean;
}

export interface UpsertBudgetInput {
  companyId: string;
  actorUserId: string;
  monthlyBudget: number;
  currency: string;
  exhaustionPolicy: BudgetExhaustionPolicy;
  isActive: boolean;
}

export interface BudgetPolicyEvaluation {
  allowed: boolean;
  reason: string | null;
  summary: BudgetSummary;
}
