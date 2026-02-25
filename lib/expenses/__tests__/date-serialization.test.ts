import {
  formatBusinessDate,
  parseExpenseDateInput,
} from "@/lib/expenses/date-serialization";

describe("expense date serialization", () => {
  it("formats date values as YYYY-MM-DD", () => {
    const value = new Date(2026, 1, 3, 23, 59, 59);

    expect(formatBusinessDate(value)).toBe("2026-02-03");
  });

  it("parses business-date strings without day drift", () => {
    const parsed = parseExpenseDateInput("2026-02-03");

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(1);
    expect(parsed.getDate()).toBe(3);
  });

  it("parses ISO date-time strings for backward compatibility", () => {
    const parsed = parseExpenseDateInput("2026-02-03T12:30:00.000Z");

    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
