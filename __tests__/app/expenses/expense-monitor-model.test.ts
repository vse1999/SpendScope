import {
  createExpenseMonitorViewModel,
  getExpenseMonitorMode,
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
});
