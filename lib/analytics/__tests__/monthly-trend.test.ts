import { buildMonthlyTrend, getMonthlyBucketCount, normalizeAnalyticsDays } from "@/lib/analytics/monthly-trend";

describe("monthly trend bucketing", () => {
  it("normalizes invalid day values to fallback", (): void => {
    expect(normalizeAnalyticsDays(Number.NaN)).toBe(90);
    expect(normalizeAnalyticsDays(0)).toBe(90);
    expect(normalizeAnalyticsDays(-30)).toBe(90);
    expect(normalizeAnalyticsDays(45.9)).toBe(45);
  });

  it("returns expected month bucket counts for presets", (): void => {
    expect(getMonthlyBucketCount(30)).toBe(2);
    expect(getMonthlyBucketCount(90)).toBe(3);
    expect(getMonthlyBucketCount(180)).toBe(6);
    expect(getMonthlyBucketCount(365)).toBe(12);
  });

  it("fills missing months with zeros for sparse 180-day data", (): void => {
    const endDate = new Date(Date.UTC(2026, 1, 20, 12, 0, 0));
    const trend = buildMonthlyTrend(
      [
        { date: new Date(Date.UTC(2025, 9, 12, 12, 0, 0)), amount: 450 },
        { date: new Date(Date.UTC(2026, 1, 7, 12, 0, 0)), amount: 1950 },
      ],
      endDate,
      180
    );

    expect(trend.map((point) => point.bucketKey)).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(trend.every((point) => point.bucketType === "month")).toBe(true);
    expect(trend.map((point) => point.amount)).toEqual([0, 450, 0, 0, 0, 1950]);
  });

  it("returns zero-valued buckets when there are no expenses", (): void => {
    const endDate = new Date(Date.UTC(2026, 1, 20, 12, 0, 0));
    const trend = buildMonthlyTrend([], endDate, 90);

    expect(trend).toHaveLength(3);
    expect(trend.every((point) => point.amount === 0)).toBe(true);
    expect(trend.map((point) => point.bucketKey)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
