import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ExpenseMonitorMode } from "../expense-monitor-model";

interface ExpenseMonitorSummaryStripProps {
  alertCount: number;
  alertPanelId?: string;
  isAlertSurfaceOpen: boolean;
  isPending: boolean;
  mode: ExpenseMonitorMode;
  onAlertSurfaceToggle: () => void;
}

interface ExpenseMonitorSummaryStripShellProps {
  actionSlot?: React.ReactNode;
  cardClassName?: string;
  dataState: "loading" | "ready";
  descriptionSlot: React.ReactNode;
  leadingIconSlot: React.ReactNode;
  pendingStatusSlot?: React.ReactNode;
  statusSlot: React.ReactNode;
  titleSlot: React.ReactNode;
}

interface SummaryCopy {
  detail: string;
  headline: string;
}

function getSummaryCopy(mode: ExpenseMonitorMode, alertCount: number): SummaryCopy {
  if (mode === "empty") {
    return {
      detail: "Recent expense activity looks normal.",
      headline: "Review queue is clear",
    };
  }

  if (mode === "dense") {
    return {
      detail: "Open the queue to work through the flagged expenses.",
      headline: `${alertCount} alerts are waiting in review`,
    };
  }

  return {
    detail: "Open the queue to review the flagged expenses.",
    headline: `${alertCount} alert${alertCount === 1 ? "" : "s"} need your review`,
  };
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

function ExpenseMonitorSummaryStripShell({
  actionSlot,
  cardClassName,
  dataState,
  descriptionSlot,
  leadingIconSlot,
  pendingStatusSlot,
  statusSlot,
  titleSlot,
}: ExpenseMonitorSummaryStripShellProps): React.JSX.Element {
  return (
    <Card
      className={cardClassName}
      data-state={dataState}
      data-testid="expense-monitor-slot"
    >
      <CardContent className="relative z-10 grid min-h-[5.75rem] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0 space-y-1">
          <div className="flex min-h-6 flex-wrap items-center gap-2">
            {leadingIconSlot}
            {titleSlot}
            <div className="min-w-[6rem]" data-testid="expense-monitor-status-slot">
              {statusSlot}
            </div>
            <div className="min-w-[6.5rem]" data-testid="expense-monitor-pending-slot">
              {pendingStatusSlot ?? <span aria-hidden className="block h-6 w-[6.5rem]" />}
            </div>
          </div>
          <div className="min-h-10 max-w-[22rem]" data-testid="expense-monitor-description">
            {descriptionSlot}
          </div>
        </div>

        <div className="flex w-full sm:w-[7rem] sm:justify-end" data-testid="expense-monitor-action-slot">
          {actionSlot}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExpenseMonitorSummaryStrip({
  alertCount,
  alertPanelId,
  isAlertSurfaceOpen,
  isPending,
  mode,
  onAlertSurfaceToggle,
}: ExpenseMonitorSummaryStripProps): React.JSX.Element {
  const hasAlerts = alertCount > 0;
  const alertButtonLabel = isAlertSurfaceOpen ? "Hide alerts" : "Review alerts";
  const cardAction = hasAlerts ? alertButtonLabel : "All clear";
  const summaryCopy = getSummaryCopy(mode, alertCount);
  const cardClassName = cn(
    "app-card-strong relative overflow-hidden transition-[border-color,box-shadow] duration-200",
    hasAlerts &&
      "border-amber-200/80 shadow-md shadow-amber-100/50 dark:border-amber-300/15 dark:shadow-none"
  );
  const titleClassName = cn(
    "text-sm font-semibold tracking-tight text-foreground"
  );
  const descriptionHeadlineClassName = cn(
    "line-clamp-1 text-sm font-semibold leading-5 tracking-tight text-foreground"
  );
  const descriptionDetailClassName = cn(
    "line-clamp-1 text-sm leading-5 text-muted-foreground"
  );
  const statusBadgeClassName = cn(
    "inline-flex w-[6rem] justify-center font-semibold",
    hasAlerts &&
      "border-amber-200 bg-amber-100/80 text-amber-900 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100"
  );
  const pendingBadgeClassName = cn(
    "inline-flex w-[6.5rem] justify-center gap-1 font-medium",
    hasAlerts
      ? "border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100"
      : undefined
  );
  const actionButtonClassName = cn(
    "w-full sm:w-28 font-semibold",
    hasAlerts &&
      !isAlertSurfaceOpen &&
      "shadow-sm",
    hasAlerts &&
      isAlertSurfaceOpen &&
      "border-border/80 bg-background"
  );

  return (
    <ExpenseMonitorSummaryStripShell
      actionSlot={
        <Button
          aria-controls={hasAlerts ? alertPanelId : undefined}
          aria-expanded={hasAlerts ? isAlertSurfaceOpen : undefined}
          className={actionButtonClassName}
          disabled={!hasAlerts}
          onClick={hasAlerts ? onAlertSurfaceToggle : undefined}
          variant={hasAlerts ? (isAlertSurfaceOpen ? "outline" : "default") : "outline"}
        >
          {cardAction}
        </Button>
      }
      cardClassName={cardClassName}
      dataState="ready"
      descriptionSlot={
        <div className="flex min-h-10 flex-col justify-center">
          <p className={descriptionHeadlineClassName}>{summaryCopy.headline}</p>
          <p className={descriptionDetailClassName}>{summaryCopy.detail}</p>
        </div>
      }
      leadingIconSlot={
        mode === "empty" ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-muted text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
          </span>
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100">
            <ShieldAlert className="h-4 w-4" />
          </span>
        )
      }
      pendingStatusSlot={
        isPending ? (
          <Badge variant="outline" className={pendingBadgeClassName}>
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating
          </Badge>
        ) : undefined
      }
      statusSlot={
        <Badge
          className={statusBadgeClassName}
          variant={mode === "empty" ? "outline" : "secondary"}
        >
          {getStatusLabel(mode, alertCount)}
        </Badge>
      }
      titleSlot={<span className={titleClassName}>Expense Monitor</span>}
    />
  );
}

export function ExpenseMonitorSummaryStripSkeleton(): React.JSX.Element {
  return (
    <ExpenseMonitorSummaryStripShell
      actionSlot={
        <Skeleton className="h-9 w-full rounded-md sm:w-28" />
      }
      cardClassName="border-border"
      dataState="loading"
      descriptionSlot={
        <div className="space-y-1 pt-0.5">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      }
      leadingIconSlot={<Skeleton className="h-8 w-8 rounded-xl" />}
      pendingStatusSlot={<Skeleton className="h-6 w-[6.5rem] rounded-full" />}
      statusSlot={<Skeleton className="h-6 w-[6rem] rounded-full" />}
      titleSlot={<Skeleton className="h-5 w-32 rounded" />}
    />
  );
}
