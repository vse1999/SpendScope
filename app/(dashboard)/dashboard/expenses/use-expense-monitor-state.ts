"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  resolveExpenseCopilotAlert,
  type ExpenseCopilotAlert,
  type ResolveExpenseCopilotAction,
} from "@/app/actions/expenses";
import { createExpenseMonitorViewModel, type ExpenseMonitorViewModel } from "./expense-monitor-model";

const EXPENSE_MONITOR_RESOLUTION_ERROR_MESSAGE =
  "Couldn't update the expense alert. Please try again.";

interface UseExpenseMonitorStateArgs {
  initialAlerts: ExpenseCopilotAlert[];
  isAdmin: boolean;
}

interface UseExpenseMonitorStateResult {
  resolvingAlerts: Record<string, boolean>;
  resolveCopilotAlert: (alertId: string, action: ResolveExpenseCopilotAction) => Promise<void>;
  viewModel: ExpenseMonitorViewModel;
}

export function useExpenseMonitorState({
  initialAlerts,
  isAdmin,
}: UseExpenseMonitorStateArgs): UseExpenseMonitorStateResult {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [copilotAlerts, setCopilotAlerts] = useState<ExpenseCopilotAlert[]>(initialAlerts);
  const [resolvingAlerts, setResolvingAlerts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCopilotAlerts(initialAlerts);
  }, [initialAlerts]);

  const viewModel = useMemo(
    () =>
      createExpenseMonitorViewModel({
        alerts: copilotAlerts,
        canResolve: isAdmin,
        isPending: isRefreshing,
      }),
    [copilotAlerts, isAdmin, isRefreshing]
  );

  const resolveCopilotAlert = async (
    alertId: string,
    action: ResolveExpenseCopilotAction
  ): Promise<void> => {
    setResolvingAlerts((previous) => ({ ...previous, [alertId]: true }));
    try {
      const result = await resolveExpenseCopilotAlert(alertId, action);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setCopilotAlerts((previous) => previous.filter((alert) => alert.id !== alertId));
      toast.success(
        action === "APPROVE" ? "Alert marked as valid" : "Alert marked as false alarm"
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(EXPENSE_MONITOR_RESOLUTION_ERROR_MESSAGE);
    } finally {
      setResolvingAlerts((previous) => {
        const next = { ...previous };
        delete next[alertId];
        return next;
      });
    }
  };

  return {
    resolvingAlerts,
    resolveCopilotAlert,
    viewModel,
  };
}
