import { buildYAxisTicks, computeYAxisMax, formatAxisCurrencyTick } from "@/lib/analytics/chart-scale";

describe("chart scale helpers", () => {
  it("provides a sensible minimum axis max for empty or zero values", (): void => {
    expect(computeYAxisMax([])).toBe(100);
    expect(computeYAxisMax([0, 0, 0])).toBe(100);
  });

  it("rounds low and high values to readable upper bounds", (): void => {
    expect(computeYAxisMax([1930])).toBe(2500);
    expect(computeYAxisMax([15234])).toBe(20000);
  });

  it("formats currency axis labels with grouping", (): void => {
    expect(formatAxisCurrencyTick(0)).toBe("$0");
    expect(formatAxisCurrencyTick(4000)).toBe("$4,000");
    expect(formatAxisCurrencyTick(16500)).toBe("$16,500");
  });

  it("builds evenly distributed ticks from 0 to axis max", (): void => {
    expect(buildYAxisTicks(2500)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    expect(buildYAxisTicks(20000, 6)).toEqual([0, 4000, 8000, 12000, 16000, 20000]);
  });
});
