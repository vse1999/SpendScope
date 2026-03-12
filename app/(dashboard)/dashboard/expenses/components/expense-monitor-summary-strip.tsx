import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpenseMonitorMode } from "../expense-monitor-model";

interface ExpenseMonitorSummaryStripProps {
  alertCount: number;
  isAlertSurfaceOpen: boolean;
  isPending: boolean;
  mode: ExpenseMonitorMode;
  onAlertSurfaceToggle: () => void;
}

function getSummaryCopy(mode: ExpenseMonitorMode, alertCount: number): string {
  if (mode === "empty") {
    return "No active alerts. Recent expense activity looks normal.";
  }

  if (mode === "dense") {
    return `${alertCount} alerts are waiting in the review queue.`;
  }

  return `${alertCount} alert${alertCount === 1 ? "" : "s"} need review.`;
}

function getStatusLabel(mode: ExpenseMonitorMode, alertCount: number): string {
  if (mode === "empty") {
    return "No alerts";
  }

  if (mode === "dense") {
    return `${alertCount} queued`;
  }

  return `${alertCount} active`;
}

export function ExpenseMonitorSummaryStrip({
  alertCount,
  isAlertSurfaceOpen,
  isPending,
  mode,
  onAlertSurfaceToggle,
}: ExpenseMonitorSummaryStripProps): React.JSX.Element {
  const hasAlerts = alertCount > 0;
  const alertButtonLabel = isAlertSurfaceOpen ? "Hide alerts" : "Show alerts";

  return (
    <Card className={mode === "empty" ? "" : "border-amber-300/60"}>
      <CardContent className="flex min-h-[5.75rem] flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {mode === "empty" ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            )}
            <span className="font-medium">Expense Monitor</span>
            <Badge variant={mode === "empty" ? "outline" : "secondary"}>
              {getStatusLabel(mode, alertCount)}
            </Badge>
            {isPending && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{getSummaryCopy(mode, alertCount)}</p>
        </div>

        {hasAlerts && (
          <div className="flex flex-wrap gap-2">
            <Button variant={isAlertSurfaceOpen ? "outline" : "default"} onClick={onAlertSurfaceToggle}>
              {alertButtonLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
