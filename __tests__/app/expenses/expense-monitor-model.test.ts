import {
  createExpenseMonitorViewModel,
  getExpenseMonitorAlertIds,
  getExpenseMonitorMode,
  shouldAutoOpenExpenseAlertSurface,
} from "@/app/(dashboard)/dashboard/expenses/expense-monitor-model";
import type { ExpenseCopilotAlert } from "@/app/actions/expenses";

function createAlert(id: string): ExpenseCopilotAlert {
  return {
    confidence: 0.82,
    createdAt: new Date("2026-02-01T00:00:00.000Z"),
    expense: {
      amount: 125,
      categoryName: "Software",
      date: new Date("2026-02-01T00:00:00.000Z"),
      description: "Subscription",
      id,
      userDisplayName: "Alex Example",
      userId: "user-1",
    },
    expenseId: id,
    id,
    reason: "Amount is unusually high for Software.",
    ruleType: "UNUSUAL_SPEND",
    severity: 74,
    status: "OPEN",
  };
}

describe("expense monitor view model", () => {
  it("returns empty mode when no alerts are active", () => {
    expect(getExpenseMonitorMode(0)).toBe("empty");
  });

  it("returns standard mode for one or two alerts", () => {
    expect(getExpenseMonitorMode(1)).toBe("standard");
    expect(getExpenseMonitorMode(2)).toBe("standard");
  });

  it("returns dense mode for three or more alerts", () => {
    expect(getExpenseMonitorMode(3)).toBe("dense");
    expect(getExpenseMonitorMode(5)).toBe("dense");
  });

  it("builds a view model without changing alert semantics", () => {
    const alerts = [createAlert("alert-1"), createAlert("alert-2")];
    const viewModel = createExpenseMonitorViewModel({
      alerts,
      canResolve: true,
      isPending: true,
    });

    expect(viewModel).toEqual({
      alertCount: 2,
      alerts,
      canResolve: true,
      isPending: true,
      mode: "standard",
    });
  });

  it("returns alert ids in their current render order", () => {
    const alerts = [createAlert("alert-2"), createAlert("alert-1")];

    expect(getExpenseMonitorAlertIds(alerts)).toEqual(["alert-2", "alert-1"]);
  });

  it("auto-opens when alerts appear for the first time", () => {
    expect(shouldAutoOpenExpenseAlertSurface([], ["alert-1"])).toBe(true);
  });

  it("stays collapsed when the same alerts return", () => {
    expect(shouldAutoOpenExpenseAlertSurface(["alert-1"], ["alert-1"])).toBe(false);
  });

  it("stays collapsed when alerts are only removed", () => {
    expect(shouldAutoOpenExpenseAlertSurface(["alert-1", "alert-2"], ["alert-1"])).toBe(false);
  });

  it("re-opens when a new unresolved alert appears", () => {
    expect(shouldAutoOpenExpenseAlertSurface(["alert-1"], ["alert-1", "alert-3"])).toBe(true);
  });
});
