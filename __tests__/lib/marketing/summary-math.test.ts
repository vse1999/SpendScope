import {
  formatSharePercentage,
  getTotalAmount,
} from "@/lib/marketing/summary-math";

describe("summary-math", () => {
  it("sums the full dataset total", () => {
    expect(
      getTotalAmount([
        { amount: 120 },
        { amount: 80 },
        { amount: 50 },
        { amount: 25 },
      ])
    ).toBe(275);
  });

  it("formats share percentages against the full total", () => {
    expect(formatSharePercentage(120, 275)).toBe("44%");
  });

  it("returns 0 percent when the total is zero", () => {
    expect(formatSharePercentage(120, 0)).toBe("0%");
  });
});
