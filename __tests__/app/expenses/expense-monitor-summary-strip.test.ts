import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ExpenseMonitorSummaryStrip,
  ExpenseMonitorSummaryStripSkeleton,
} from "@/app/(dashboard)/dashboard/expenses/components/expense-monitor-summary-strip";

describe("expense monitor summary strip", () => {
  it("renders a stable all-clear action slot when no alerts are active", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ExpenseMonitorSummaryStrip, {
        alertCount: 0,
        alertPanelId: "expense-alerts-panel",
        isAlertSurfaceOpen: false,
        isPending: false,
        mode: "empty",
        onAlertSurfaceToggle: () => undefined,
      })
    );

    expect(markup).toContain("All clear");
    expect(markup).toContain("Expense Monitor");
    expect(markup).toContain('data-testid="expense-monitor-slot"');
    expect(markup).toContain('data-state="ready"');
    expect(markup).toContain("w-full sm:w-28");
    expect(markup).toContain("inline-flex w-[6rem] justify-center font-semibold");
    expect(markup).toContain("block h-6 w-[6.5rem]");
    expect(markup).toContain("min-h-10 max-w-[22rem]");
    expect(markup).toContain("Review queue is clear");
    expect(markup).toContain("Recent expense activity looks normal.");
    expect(markup).toContain("flex min-h-10 flex-col justify-center");
  });

  it("shares the deterministic shell geometry with the loading skeleton", () => {
    const skeletonMarkup = renderToStaticMarkup(
      React.createElement(ExpenseMonitorSummaryStripSkeleton)
    );
    const liveMarkup = renderToStaticMarkup(
      React.createElement(ExpenseMonitorSummaryStrip, {
        alertCount: 2,
        alertPanelId: "expense-alerts-panel",
        isAlertSurfaceOpen: false,
        isPending: false,
        mode: "standard",
        onAlertSurfaceToggle: () => undefined,
      })
    );

    expect(skeletonMarkup).toContain(
      "grid min-h-[5.75rem] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    );
    expect(liveMarkup).toContain(
      "grid min-h-[5.75rem] gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    );
    expect(skeletonMarkup).toContain('data-testid="expense-monitor-slot"');
    expect(skeletonMarkup).toContain('data-state="loading"');
    expect(liveMarkup).toContain('data-testid="expense-monitor-slot"');
    expect(liveMarkup).toContain('data-state="ready"');
    expect(skeletonMarkup).toContain("min-w-[6rem]");
    expect(liveMarkup).toContain("min-w-[6rem]");
    expect(skeletonMarkup).not.toContain("Expense Monitor");
    expect(skeletonMarkup).toContain("h-5 w-32 rounded");
    expect(skeletonMarkup).toContain('data-testid="expense-monitor-description"');
    expect(liveMarkup).toContain('data-testid="expense-monitor-description"');
    expect(skeletonMarkup).toContain("min-h-10 max-w-[22rem]");
    expect(liveMarkup).toContain("min-h-10 max-w-[22rem]");
    expect(liveMarkup).toContain("Review alerts");
    expect(liveMarkup).toContain("2 alerts need your review");
    expect(liveMarkup).toContain("Open the queue to review the flagged expenses.");
  });
});
