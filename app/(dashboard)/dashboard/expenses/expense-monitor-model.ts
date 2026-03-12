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

export function getExpenseMonitorAlertIds(alerts: ExpenseCopilotAlert[]): string[] {
  return alerts.map((alert) => alert.id);
}

export function shouldAutoOpenExpenseAlertSurface(
  previousAlertIds: string[],
  nextAlertIds: string[]
): boolean {
  if (nextAlertIds.length === 0) {
    return false;
  }

  if (previousAlertIds.length === 0) {
    return true;
  }

  const previousAlertIdSet = new Set(previousAlertIds);
  return nextAlertIds.some((alertId) => !previousAlertIdSet.has(alertId));
}

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
