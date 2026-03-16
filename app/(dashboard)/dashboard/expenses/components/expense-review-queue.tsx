import { format } from "date-fns";
import {
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResolveExpenseCopilotAction } from "@/app/actions/expenses";
import type { ExpenseMonitorViewModel } from "../expense-monitor-model";
import { getCopilotRuleLabel, getSeverityVariant } from "../expenses-client-helpers";

interface ExpenseReviewQueueProps {
  onResolveAlert: (alertId: string, action: ResolveExpenseCopilotAction) => Promise<void>;
  resolvingAlerts: Record<string, boolean>;
  viewModel: ExpenseMonitorViewModel;
}

export function ExpenseReviewQueue({
  onResolveAlert,
  resolvingAlerts,
  viewModel,
}: ExpenseReviewQueueProps): React.JSX.Element {
  if (viewModel.mode === "empty") {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No active review alerts. New alerts will appear here when monitor rules detect something worth triaging.
      </div>
    );
  }

  return (
    <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
      {viewModel.alerts.map((alert) => {
        const isResolving = resolvingAlerts[alert.id] === true;
        const isDisabled = isResolving || viewModel.isPending;

        return (
          <article
            key={alert.id}
            className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getSeverityVariant(alert.severity)}>
                  {getCopilotRuleLabel(alert.ruleType)}
                </Badge>
                <Badge variant="outline">Severity {alert.severity}</Badge>
                <Badge variant="outline">
                  Rule score {(alert.confidence * 100).toFixed(0)}%
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm font-medium leading-6">{alert.reason}</p>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {alert.expense.userDisplayName} | {alert.expense.categoryName} |{" "}
                {format(new Date(alert.expense.date), "MMM d, yyyy")} | $
                {alert.expense.amount.toLocaleString()}
              </p>
            </div>

            {viewModel.canResolve ? (
              <div className="flex flex-wrap gap-2 lg:w-[20rem] lg:justify-end">
                <Button
                  size="sm"
                  className="min-w-[8.5rem] justify-center"
                  disabled={isDisabled}
                  onClick={() => onResolveAlert(alert.id, "APPROVE")}
                >
                  {isResolving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Mark Valid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-w-[8.5rem] justify-center"
                  disabled={isDisabled}
                  onClick={() => onResolveAlert(alert.id, "DISMISS")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  False Alarm
                </Button>
              </div>
            ) : (
              <div className="flex items-center text-xs text-muted-foreground lg:justify-end">
                Only admins can resolve these alerts.
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
