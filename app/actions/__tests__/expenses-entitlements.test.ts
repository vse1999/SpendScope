import { getAnalyticsData } from "@/app/actions/expenses-analytics";
import { exportExpensesCSV } from "@/app/actions/expenses-filtering";

const mockGetCurrentUserCompanyId = jest.fn();
const mockCheckFeatureLimit = jest.fn();
const mockExpenseFindMany = jest.fn();

jest.mock("@/app/actions/expenses-shared", () => ({
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100,
  getCurrentUserCompanyId: (...args: unknown[]) => mockGetCurrentUserCompanyId(...args),
}));

jest.mock("@/lib/subscription/feature-gate-service", () => ({
  checkFeatureLimit: (...args: unknown[]) => mockCheckFeatureLimit(...args),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    expense: {
      findMany: (...args: unknown[]) => mockExpenseFindMany(...args),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}));

describe("expense action entitlement guards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks analytics data retrieval for plans without analytics feature", async (): Promise<void> => {
    mockGetCurrentUserCompanyId.mockResolvedValue("company-1");
    mockCheckFeatureLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      reason: "analytics is not available on your current plan",
    });

    const result = await getAnalyticsData(90);

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("FORBIDDEN_FEATURE");
      expect(result.error).toContain("analytics");
    }
    expect(mockExpenseFindMany).not.toHaveBeenCalled();
  });

  it("blocks CSV export for plans without export feature", async (): Promise<void> => {
    mockGetCurrentUserCompanyId.mockResolvedValue("company-1");
    mockCheckFeatureLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      reason: "export is not available on your current plan",
    });

    const result = await exportExpensesCSV({});

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.code).toBe("FORBIDDEN_FEATURE");
      expect(result.error).toContain("export");
    }
    expect(mockExpenseFindMany).not.toHaveBeenCalled();
  });
});
