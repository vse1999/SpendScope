import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ExpensesPageSkeleton } from "@/app/(dashboard)/dashboard/expenses/expenses-page-skeleton";

describe("expenses page skeleton", () => {
  it("includes the expense monitor shell in the route-level fallback", () => {
    const markup = renderToStaticMarkup(React.createElement(ExpensesPageSkeleton));

    expect(markup).toContain('data-testid="expense-monitor-slot"');
    expect(markup).toContain('data-state="loading"');
    expect(markup).not.toContain("Expense Monitor");
  });
});
