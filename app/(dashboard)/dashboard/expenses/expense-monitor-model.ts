import type { ExpenseCopilotAlert } from "@/app/actions/expenses";

export type ExpenseMonitorMode = "empty" | "standard" | "dense";

export interface ExpenseMonitorViewModel {
  alertCount: number;
  alerts: ExpenseCopilotAlert[];
  canResolve: boolean;
  isPending: boolean;
  mode: ExpenseMonitorMode;
}

export interface CreateExpenseMonitorViewModelArgs {
  alerts: ExpenseCopilotAlert[];
  canResolve: boolean;
  isPending?: boolean;
}

export const EXPENSE_MONITOR_DENSE_THRESHOLD = 3;

export function getExpenseMonitorMode(alertCount: number): ExpenseMonitorMode {
  if (alertCount === 0) {
    return "empty";
  }

  if (alertCount >= EXPENSE_MONITOR_DENSE_THRESHOLD) {
    return "dense";
  }

  return "standard";
}

export function createExpenseMonitorViewModel({
  alerts,
  canResolve,
  isPending = false,
}: CreateExpenseMonitorViewModelArgs): ExpenseMonitorViewModel {
  return {
    alertCount: alerts.length,
    alerts,
    canResolve,
    isPending,
    mode: getExpenseMonitorMode(alerts.length),
  };
}
