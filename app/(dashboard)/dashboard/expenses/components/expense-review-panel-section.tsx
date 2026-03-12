"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ExpenseCopilotAlert,
  ExpensePolicyConfigView,
} from "@/app/actions/expenses";
import type { Category } from "../expenses-client-types";
import {
  getExpenseMonitorAlertIds,
  shouldAutoOpenExpenseAlertSurface,
} from "../expense-monitor-model";
import { useExpenseMonitorState } from "../use-expense-monitor-state";
import { ExpenseMonitorSummaryStrip } from "./expense-monitor-summary-strip";
import { ExpensePolicyControlsCard } from "./expense-policy-controls-card";
import { ExpenseReviewQueue } from "./expense-review-queue";

interface ExpenseReviewPanelSectionProps {
  categories: Category[];
  initialAlerts: ExpenseCopilotAlert[];
  initialPolicyConfig: ExpensePolicyConfigView;
  isAdmin: boolean;
}

export function ExpenseReviewPanelSection({
  categories,
  initialAlerts,
  initialPolicyConfig,
  isAdmin,
}: ExpenseReviewPanelSectionProps): React.JSX.Element {
  const { resolvingAlerts, resolveCopilotAlert, viewModel } = useExpenseMonitorState({
    initialAlerts,
    isAdmin,
  });
  const [collapsedAlertIds, setCollapsedAlertIds] = useState<string[]>([]);
  const alertIds = useMemo(
    () => getExpenseMonitorAlertIds(viewModel.alerts),
    [viewModel.alerts]
  );
  const isAlertSurfaceOpen = shouldAutoOpenExpenseAlertSurface(collapsedAlertIds, alertIds);

  const handleAlertSurfaceToggle = (): void => {
    if (isAlertSurfaceOpen) {
      setCollapsedAlertIds(alertIds);
      return;
    }

    setCollapsedAlertIds([]);
  };

  return (
    <div className="space-y-4">
      <ExpenseMonitorSummaryStrip
        alertCount={viewModel.alertCount}
        isAlertSurfaceOpen={isAlertSurfaceOpen}
        isPending={viewModel.isPending}
        mode={viewModel.mode}
        onAlertSurfaceToggle={handleAlertSurfaceToggle}
      />

      {isAlertSurfaceOpen && (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Expense Alerts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review flagged expenses without disturbing the main expenses workflow.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={viewModel.mode === "empty" ? "outline" : "secondary"}>
                  {viewModel.alertCount} open
                </Badge>
                {viewModel.isPending && (
                  <Badge variant="outline">Syncing</Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <ExpenseReviewQueue
              resolvingAlerts={resolvingAlerts}
              onResolveAlert={resolveCopilotAlert}
              viewModel={viewModel}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <ExpensePolicyControlsCard
          categories={categories}
          initialPolicyConfig={initialPolicyConfig}
        />
      )}
    </div>
  );
}
