import { renderToStaticMarkup } from "react-dom/server";
import ExpensesLoading from "@/app/(dashboard)/dashboard/expenses/loading";
import * as expensesPageSkeletonModule from "@/app/(dashboard)/dashboard/expenses/expenses-page-skeleton";

jest.mock("@/app/(dashboard)/dashboard/expenses/expenses-page-skeleton", () => ({
  ExpensesPageSkeleton: jest.fn(() => {
    const React = jest.requireActual<typeof import("react")>("react");
    return React.createElement("div", null, "expenses-page-skeleton");
  }),
}));

const mockExpensesPageSkeleton = jest.mocked(expensesPageSkeletonModule.ExpensesPageSkeleton);

describe("expenses route loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the expenses-specific page skeleton", () => {
    const markup = renderToStaticMarkup(ExpensesLoading());

    expect(markup).toContain("expenses-page-skeleton");
    expect(mockExpensesPageSkeleton).toHaveBeenCalledTimes(1);
  });
});
