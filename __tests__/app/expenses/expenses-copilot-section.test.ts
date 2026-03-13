import { renderToStaticMarkup } from "react-dom/server";
import {
  ExpenseReviewSection,
  ExpenseReviewSectionSkeleton,
} from "@/app/(dashboard)/dashboard/expenses/expenses-copilot-section";
import {
  getExpenseCopilotAlerts,
  getExpensePolicyConfigForCompany,
} from "@/app/actions/expenses";
import * as reviewPanelModule from "@/app/(dashboard)/dashboard/expenses/components/expense-review-panel-section";

jest.mock("@/app/actions/expenses", () => ({
  getExpenseCopilotAlerts: jest.fn(),
  getExpensePolicyConfigForCompany: jest.fn(),
}));

jest.mock("@/app/(dashboard)/dashboard/expenses/components/expense-review-panel-section", () => ({
  ExpenseReviewPanelSection: jest.fn(() => null),
}));

const mockGetExpenseCopilotAlerts = jest.mocked(getExpenseCopilotAlerts);
const mockGetExpensePolicyConfigForCompany = jest.mocked(getExpensePolicyConfigForCompany);
const mockExpenseReviewPanelSection = jest.mocked(reviewPanelModule.ExpenseReviewPanelSection);

describe("expense review server section", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads alerts and admin policy config for admin users", async () => {
    const alert = {
      confidence: 0.77,
      createdAt: new Date("2026-02-10T00:00:00.000Z"),
      expense: {
        amount: 400,
        categoryName: "Software",
        date: new Date("2026-02-10T00:00:00.000Z"),
        description: "Team tooling",
        id: "expense-1",
        userDisplayName: "Sebo Varga",
        userId: "user-1",
      },
      expenseId: "expense-1",
      id: "alert-1",
      reason: "Amount is unusually high for Software.",
      ruleType: "UNUSUAL_SPEND" as const,
      severity: 74,
      status: "OPEN" as const,
    };
    const categories = [{ color: "#3b82f6", id: "category-1", name: "Travel" }];

    mockGetExpenseCopilotAlerts.mockResolvedValue({
      success: true,
      alerts: [alert],
    });
    mockGetExpensePolicyConfigForCompany.mockResolvedValue({
      success: true,
      config: {
        categoryThresholds: { "category-1": 250 },
        globalThresholdUsd: 1000,
      },
      rules: [],
    });

    const element = await ExpenseReviewSection({ categories, isAdmin: true });
    renderToStaticMarkup(element);

    expect(mockGetExpenseCopilotAlerts).toHaveBeenCalledTimes(1);
    expect(mockGetExpensePolicyConfigForCompany).toHaveBeenCalledTimes(1);
    expect(mockExpenseReviewPanelSection).toHaveBeenCalledWith(
      {
        categories,
        initialAlerts: [alert],
        initialPolicyConfig: {
          categoryThresholds: { "category-1": 250 },
          globalThresholdUsd: 1000,
        },
        isAdmin: true,
      },
      undefined
    );
  });

  it("skips the policy fetch for members and falls back to the default policy config", async () => {
    const categories = [{ color: "#3b82f6", id: "category-1", name: "Travel" }];

    mockGetExpenseCopilotAlerts.mockResolvedValue({
      success: true,
      alerts: [],
    });

    const element = await ExpenseReviewSection({ categories, isAdmin: false });
    renderToStaticMarkup(element);

    expect(mockGetExpenseCopilotAlerts).toHaveBeenCalledTimes(1);
    expect(mockGetExpensePolicyConfigForCompany).not.toHaveBeenCalled();
    expect(mockExpenseReviewPanelSection).toHaveBeenCalledWith(
      {
        categories,
        initialAlerts: [],
        initialPolicyConfig: {
          categoryThresholds: {},
          globalThresholdUsd: 1000,
        },
        isAdmin: false,
      },
      undefined
    );
  });

  it("renders the admin fallback shell with policy controls", () => {
    const markup = renderToStaticMarkup(ExpenseReviewSectionSkeleton({ isAdmin: true }));

    expect(markup).not.toContain("Expense Monitor");
    expect(markup).toContain("Policy Threshold Controls");
    expect(markup).toContain("Global Threshold (USD)");
    expect(markup).not.toContain("Expense Alerts");
  });

  it("omits policy controls from the member fallback shell", () => {
    const markup = renderToStaticMarkup(ExpenseReviewSectionSkeleton({ isAdmin: false }));

    expect(markup).not.toContain("Expense Monitor");
    expect(markup).not.toContain("Policy Threshold Controls");
    expect(markup).not.toContain("Expense Alerts");
  });
});
