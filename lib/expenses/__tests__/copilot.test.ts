import { detectExpenseAnomalies, type CopilotExpenseSignal } from "@/lib/expenses/copilot";

function expense(overrides: Partial<CopilotExpenseSignal>): CopilotExpenseSignal {
  return {
    id: "exp-1",
    amount: 100,
    description: "Coffee",
    date: new Date("2026-02-10T10:00:00.000Z"),
    categoryId: "cat-1",
    categoryName: "Meals",
    userId: "user-1",
    userDisplayName: "Alex",
    ...overrides,
  };
}

describe("expense copilot detector", () => {
  it("flags likely duplicates", (): void => {
    const anomalies = detectExpenseAnomalies([
      expense({ id: "exp-1", amount: 44.5, description: "Airport Taxi" }),
      expense({ id: "exp-2", amount: 44.5, description: "airport   taxi", date: new Date("2026-02-11T09:00:00.000Z") }),
    ]);

    expect(anomalies.some((item) => item.expenseId === "exp-2" && item.ruleType === "DUPLICATE")).toBe(true);
  });

  it("flags policy breaches", (): void => {
    const anomalies = detectExpenseAnomalies([
      expense({ id: "exp-1", amount: 1520, description: "Laptop replacement" }),
    ]);

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].ruleType).toBe("POLICY_BREACH");
    expect(anomalies[0].severity).toBeGreaterThanOrEqual(80);
  });

  it("uses category override threshold when provided", (): void => {
    const anomalies = detectExpenseAnomalies(
      [
        expense({ id: "exp-1", amount: 1200, categoryId: "cat-1", categoryName: "Meals" }),
      ],
      {
        globalThresholdUsd: 1500,
        categoryThresholds: { "cat-1": 1000 },
      }
    );

    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].ruleType).toBe("POLICY_BREACH");
    expect(anomalies[0].reason).toContain("$1,000.00");
  });

  it("flags unusual spend against user-category baseline", (): void => {
    const baseline = [
      expense({ id: "exp-1", amount: 60 }),
      expense({ id: "exp-2", amount: 70 }),
      expense({ id: "exp-3", amount: 65 }),
      expense({ id: "exp-4", amount: 75 }),
      expense({ id: "exp-5", amount: 80 }),
    ];

    const anomalies = detectExpenseAnomalies([
      ...baseline,
      expense({ id: "exp-6", amount: 260, description: "Emergency vendor purchase" }),
    ]);

    expect(anomalies.some((item) => item.expenseId === "exp-6" && item.ruleType === "UNUSUAL_SPEND")).toBe(true);
  });
});
