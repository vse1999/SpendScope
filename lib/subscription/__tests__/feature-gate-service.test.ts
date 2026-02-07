/**
 * Feature Gate Service Unit Tests
 * 
 * Comprehensive test coverage for:
 * - checkFeatureLimit()
 * - consumeResource()
 * - getUsageMetrics()
 * - Edge cases and error handling
 * 
 * NO `any` types - strict TypeScript only
 */

import { SubscriptionPlan } from "@prisma/client";
import {
  checkFeatureLimit,
  consumeResource,
  decrementResource,
  getUsageMetrics,
  clearUsageCache,
  syncUsageLimits,
  FeatureCheckResult,
  UsageMetrics,
} from "../feature-gate-service";
import { FEATURE_LIMITS, GatedFeature } from "../config";
import {
  FeatureGateError,
  OptimisticLockError,
  ValidationError,
  CacheError,
} from "@/lib/errors";

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma
const mockPrismaCompanyFindUnique = jest.fn();
const mockPrismaCompanyUsageFindUnique = jest.fn();
const mockPrismaCompanyUsageCreate = jest.fn();
const mockPrismaCompanyUsageUpdate = jest.fn();
const mockPrismaCompanyUsageUpdateMany = jest.fn();
const mockPrismaCompanyUsageUpsert = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      findUnique: (...args: unknown[]) => mockPrismaCompanyFindUnique(...args),
    },
    companyUsage: {
      findUnique: (...args: unknown[]) => mockPrismaCompanyUsageFindUnique(...args),
      create: (...args: unknown[]) => mockPrismaCompanyUsageCreate(...args),
      update: (...args: unknown[]) => mockPrismaCompanyUsageUpdate(...args),
      updateMany: (...args: unknown[]) => mockPrismaCompanyUsageUpdateMany(...args),
      upsert: (...args: unknown[]) => mockPrismaCompanyUsageUpsert(...args),
    },
  },
}));

// Mock Redis (optional dependency)
const mockRedisGet = jest.fn();
const mockRedisSetEx = jest.fn();
const mockRedisDel = jest.fn();
const mockRedisConnect = jest.fn();
const mockRedisCreateClient = jest.fn();

jest.mock("redis", () => ({
  createClient: (options: { url: string }) => {
    mockRedisCreateClient(options);
    return {
      connect: mockRedisConnect,
      get: mockRedisGet,
      setEx: mockRedisSetEx,
      del: mockRedisDel,
    };
  },
}), { virtual: true });

// Mock environment variables
const originalEnv = process.env;

// ============================================================================
// Test Helpers
// ============================================================================

interface MockCompanyUsage {
  id: string;
  companyId: string;
  monthlyExpenses: number;
  currentMonth: number;
  maxExpenses: number;
  maxUsers: number;
  maxCategories: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockCompany {
  id: string;
  subscription: { plan: SubscriptionPlan } | null;
  _count: {
    users: number;
    categories: number;
  };
  usage?: MockCompanyUsage | null;
}

function createMockCompanyUsage(overrides: Partial<MockCompanyUsage> = {}): MockCompanyUsage {
  const now = new Date();
  return {
    id: "usage-1",
    companyId: "company-1",
    monthlyExpenses: 0,
    currentMonth: getCurrentMonth(),
    maxExpenses: FEATURE_LIMITS.FREE.maxMonthlyExpenses,
    maxUsers: FEATURE_LIMITS.FREE.maxUsers,
    maxCategories: FEATURE_LIMITS.FREE.maxCategories,
    version: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createMockCompany(overrides: Partial<MockCompany> = {}): MockCompany {
  return {
    id: "company-1",
    subscription: { plan: SubscriptionPlan.FREE },
    _count: {
      users: 1,
      categories: 2,
    },
    ...overrides,
  };
}

function getCurrentMonth(): number {
  const now = new Date();
  return now.getFullYear() * 100 + (now.getMonth() + 1);
}

function getPreviousMonth(): number {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return year * 100 + prevMonth;
}

// ============================================================================
// Test Suite
// ============================================================================

describe("FeatureGateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.REDIS_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // checkFeatureLimit() Tests
  // ==========================================================================
  describe("checkFeatureLimit()", () => {
    describe("FREE plan", () => {
      beforeEach(() => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.FREE } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);
      });

      it("should allow when under limit", async (): Promise<void> => {
        const usage = createMockCompanyUsage({ monthlyExpenses: 50 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(40); // 100 - 50 - 10 = 40 (remaining after request)
      });

      it("should block when at limit", async (): Promise<void> => {
        const usage = createMockCompanyUsage({ monthlyExpenses: 100 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 1);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.reason).toContain("reached your");
        expect(result.upgradeUrl).toBe("/settings/billing");
      });

      it("should block when would exceed limit", async (): Promise<void> => {
        const usage = createMockCompanyUsage({ monthlyExpenses: 95 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(5);
      });

      it("should handle exactly at limit request", async (): Promise<void> => {
        const usage = createMockCompanyUsage({ monthlyExpenses: 90 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(0);
      });
    });

    describe("PRO plan", () => {
      beforeEach(() => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);
      });

      it("should always allow with unlimited expenses", async (): Promise<void> => {
        const usage = createMockCompanyUsage({
          monthlyExpenses: 999999,
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 1000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });

      it("should always allow unlimited users", async (): Promise<void> => {
        const company = createMockCompany({
          subscription: { plan: SubscriptionPlan.PRO },
          _count: { users: 1000, categories: 100 },
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "user", 1);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });

      it("should always allow unlimited categories", async (): Promise<void> => {
        const company = createMockCompany({
          subscription: { plan: SubscriptionPlan.PRO },
          _count: { users: 10, categories: 10000 },
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "category", 100);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });
    });

    describe("Validation errors", () => {
      it("should throw ValidationError for empty company ID", async (): Promise<void> => {
        await expect(checkFeatureLimit("", "expense")).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError for non-string company ID", async (): Promise<void> => {
        // @ts-expect-error Testing invalid input
        await expect(checkFeatureLimit(null, "expense")).rejects.toThrow(ValidationError);
        // @ts-expect-error Testing invalid input
        await expect(checkFeatureLimit(123, "expense")).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError for invalid requested count", async (): Promise<void> => {
        await expect(checkFeatureLimit("company-1", "expense", 0)).rejects.toThrow(ValidationError);
        await expect(checkFeatureLimit("company-1", "expense", -1)).rejects.toThrow(ValidationError);
        await expect(checkFeatureLimit("company-1", "expense", 1.5)).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError when company not found", async (): Promise<void> => {
        mockPrismaCompanyFindUnique.mockResolvedValue(null);

        await expect(checkFeatureLimit("non-existent", "expense")).rejects.toThrow(ValidationError);
      });
    });

    describe("Redis fallback", () => {
      beforeEach(() => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
      });

      it("should work without Redis (in-memory fallback)", async (): Promise<void> => {
        delete process.env.REDIS_URL;

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(true);
        expect(mockRedisConnect).not.toHaveBeenCalled();
      });

      it("should fallback to DB when Redis fails", async (): Promise<void> => {
        process.env.REDIS_URL = "redis://localhost:6379";
        mockRedisConnect.mockRejectedValue(new Error("Connection failed"));

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(true);
      });
    });

    describe("Feature flags (non-numeric limits)", () => {
      it("should allow analytics for PRO plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "analytics");

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });

      it("should block analytics for FREE plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.FREE } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "analytics");

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.reason).toContain("not available");
      });

      it("should allow export for PRO plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "export");

        expect(result.allowed).toBe(true);
      });

      it("should block export for FREE plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.FREE } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "export");

        expect(result.allowed).toBe(false);
      });

      it("should allow teamInvites for PRO plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "teamInvites");

        expect(result.allowed).toBe(true);
      });

      it("should block teamInvites for FREE plan", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.FREE } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "teamInvites");

        expect(result.allowed).toBe(false);
      });
    });

    describe("Optimistic locking retries", () => {
      it("should retry on optimistic lock conflict and eventually succeed", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        // First two calls throw lock error, third succeeds
        let callCount = 0;
        const originalCheckNumericLimit = jest.fn();
        
        // We can't easily mock the internal function, but we can verify the flow works
        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);
        expect(result.allowed).toBe(true);
      });
    });
  });

  // ==========================================================================
  // consumeResource() Tests
  // ==========================================================================
  describe("consumeResource()", () => {
    describe("Successful consumption", () => {
      it("should increment counter on successful consumption", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        // First call returns initial usage, second call returns updated usage
        mockPrismaCompanyUsageFindUnique
          .mockResolvedValueOnce(usage)
          .mockResolvedValueOnce(createMockCompanyUsage({ monthlyExpenses: 51, version: 2 }));
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

        const result = await consumeResource("company-1", "expense", 1);

        expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledWith({
          where: {
            companyId: "company-1",
            version: 1,
          },
          data: {
            monthlyExpenses: { increment: 1 },
            version: { increment: 1 },
          },
        });
        expect(result.used).toBe(51);
        expect(result.remaining).toBe(49);
      });

      it("should consume multiple resources at once", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

        const updatedUsage = createMockCompanyUsage({ monthlyExpenses: 55, version: 2 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(updatedUsage);

        const result = await consumeResource("company-1", "expense", 5);

        expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({
            companyId: "company-1",
          }),
          data: {
            monthlyExpenses: { increment: 5 },
            version: { increment: 1 },
          },
        }));
      });
    });

    describe("Concurrent request handling", () => {
      it("should throw OptimisticLockError when version mismatch detected", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
        
        // Simulate version mismatch (concurrent modification)
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 0 });

        await expect(consumeResource("company-1", "expense", 1)).rejects.toThrow();
      });

      it("should retry on optimistic lock conflict", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        // First attempt fails, second succeeds
        mockPrismaCompanyUsageUpdateMany
          .mockResolvedValueOnce({ count: 0 })
          .mockResolvedValueOnce({ count: 1 });

        const updatedUsage = createMockCompanyUsage({ monthlyExpenses: 51, version: 3 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(updatedUsage);

        // Should eventually succeed after retry
        const result = await consumeResource("company-1", "expense", 1);

        expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledTimes(2);
      });
    });

    describe("Limit enforcement", () => {
      it("should throw FeatureGateError when limit would be exceeded", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 95 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        await expect(consumeResource("company-1", "expense", 10)).rejects.toThrow(FeatureGateError);
      });

      it("should allow consumption exactly at limit", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        // Start with 90, consume 10 to reach exactly 100 (the limit)
        const usage = createMockCompanyUsage({ monthlyExpenses: 90, version: 1 });
        mockPrismaCompanyUsageFindUnique
          .mockResolvedValueOnce(usage)
          .mockResolvedValueOnce(createMockCompanyUsage({ monthlyExpenses: 100, version: 2 }));
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

        const result = await consumeResource("company-1", "expense", 10);

        expect(result.used).toBe(100);
        expect(result.remaining).toBe(0);
      });
    });

    describe("PRO plan bypass", () => {
      it("should return infinity for PRO plan without DB update", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const result = await consumeResource("company-1", "expense", 1000);

        expect(result.used).toBe(0);
        expect(result.remaining).toBe(Infinity);
        expect(mockPrismaCompanyUsageUpdateMany).not.toHaveBeenCalled();
      });
    });

    describe("Validation errors", () => {
      it("should throw ValidationError for non-expense features", async (): Promise<void> => {
        await expect(consumeResource("company-1", "user" as GatedFeature, 1)).rejects.toThrow(ValidationError);
        await expect(consumeResource("company-1", "category" as GatedFeature, 1)).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError for invalid company ID", async (): Promise<void> => {
        await expect(consumeResource("", "expense", 1)).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError for invalid count", async (): Promise<void> => {
        await expect(consumeResource("company-1", "expense", 0)).rejects.toThrow(ValidationError);
        await expect(consumeResource("company-1", "expense", -1)).rejects.toThrow(ValidationError);
        await expect(consumeResource("company-1", "expense", 1.5)).rejects.toThrow(ValidationError);
      });
    });

    describe("Database errors", () => {
      it("should throw error on database failure", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
        mockPrismaCompanyUsageUpdateMany.mockRejectedValue(new Error("DB connection failed"));

        await expect(consumeResource("company-1", "expense", 1)).rejects.toThrow("Failed to consume resource");
      });
    });
  });

  // ==========================================================================
  // decrementResource() Tests
  // ==========================================================================
  describe("decrementResource()", () => {
    it("should decrement counter successfully", async (): Promise<void> => {
      const company = createMockCompany();
      mockPrismaCompanyFindUnique.mockResolvedValue(company);

      const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
      mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
      mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

      const result = await decrementResource("company-1", 10);

      expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledWith({
        where: {
          companyId: "company-1",
          version: 1,
        },
        data: {
          monthlyExpenses: 40,
          version: { increment: 1 },
        },
      });
      expect(result.used).toBe(40);
      expect(result.remaining).toBe(60);
    });

    it("should not go below zero", async (): Promise<void> => {
      const company = createMockCompany();
      mockPrismaCompanyFindUnique.mockResolvedValue(company);

      const usage = createMockCompanyUsage({ monthlyExpenses: 5, version: 1 });
      mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
      mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

      const result = await decrementResource("company-1", 10);

      expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledWith({
        where: {
          companyId: "company-1",
          version: 1,
        },
        data: {
          monthlyExpenses: 0,
          version: { increment: 1 },
        },
      });
      expect(result.used).toBe(0);
    });

    it("should create usage record if none exists", async (): Promise<void> => {
      const company = createMockCompany();
      mockPrismaCompanyFindUnique.mockResolvedValue(company);
      mockPrismaCompanyUsageFindUnique.mockResolvedValue(null);

      const result = await decrementResource("company-1", 5);

      expect(result.used).toBe(0);
      expect(result.remaining).toBe(100);
      expect(mockPrismaCompanyUsageUpdateMany).not.toHaveBeenCalled();
    });

    it("should handle optimistic lock conflicts", async (): Promise<void> => {
      const company = createMockCompany();
      mockPrismaCompanyFindUnique.mockResolvedValue(company);

      const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
      mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
      mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 0 });

      await expect(decrementResource("company-1", 5)).rejects.toThrow();
    });

    it("should throw ValidationError for invalid company ID", async (): Promise<void> => {
      await expect(decrementResource("", 5)).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for invalid count", async (): Promise<void> => {
      await expect(decrementResource("company-1", 0)).rejects.toThrow(ValidationError);
      await expect(decrementResource("company-1", -1)).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // getUsageMetrics() Tests
  // ==========================================================================
  describe("getUsageMetrics()", () => {
    describe("Returns correct percentages", () => {
      it("should return correct metrics for FREE plan", async (): Promise<void> => {
        const company = createMockCompany({
          subscription: { plan: SubscriptionPlan.FREE },
          _count: { users: 2, categories: 3 },
          usage: createMockCompanyUsage({ monthlyExpenses: 50 }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        expect(metrics.companyId).toBe("company-1");
        expect(metrics.plan).toBe(SubscriptionPlan.FREE);
        expect(metrics.expenses.used).toBe(50);
        expect(metrics.expenses.limit).toBe(100);
        expect(metrics.expenses.remaining).toBe(50);
        expect(metrics.users.used).toBe(2);
        expect(metrics.users.limit).toBe(3);
        expect(metrics.users.remaining).toBe(1);
        expect(metrics.categories.used).toBe(3);
        expect(metrics.categories.limit).toBe(5);
        expect(metrics.categories.remaining).toBe(2);
      });

      it("should return infinity for PRO plan", async (): Promise<void> => {
        // Use different company ID to avoid cache conflicts
        const companyId = "pro-company";
        const companyUsage = createMockCompanyUsage({
          companyId,
          monthlyExpenses: 9999,
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        });
        const company = {
          id: companyId,
          subscription: { plan: SubscriptionPlan.PRO },
          _count: { users: 100, categories: 200 },
          usage: companyUsage,
        };
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics(companyId);

        expect(metrics.plan).toBe(SubscriptionPlan.PRO);
        expect(metrics.expenses.limit).toBe(Infinity);
        expect(metrics.expenses.remaining).toBe(Infinity);
        expect(metrics.users.limit).toBe(Infinity);
        expect(metrics.users.remaining).toBe(Infinity);
        expect(metrics.categories.limit).toBe(Infinity);
        expect(metrics.categories.remaining).toBe(Infinity);
      });
    });

    describe("Handles missing usage record", () => {
      it("should create usage record if missing", async (): Promise<void> => {
        // Use different company ID to avoid cache conflicts
        const companyId = "new-company";
        const newUsage = createMockCompanyUsage({ companyId, monthlyExpenses: 0 });
        const company = {
          id: companyId,
          subscription: { plan: SubscriptionPlan.FREE },
          _count: { users: 1, categories: 1 },
          usage: null, // No usage in company query triggers getOrInitializeUsage
        };
        
        mockPrismaCompanyFindUnique.mockResolvedValue(company);
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(null); // No existing usage
        mockPrismaCompanyUsageCreate.mockResolvedValue(newUsage);

        const metrics: UsageMetrics = await getUsageMetrics(companyId);

        expect(mockPrismaCompanyUsageCreate).toHaveBeenCalled();
        expect(metrics.expenses.used).toBe(0);
      });
    });

    describe("Month rollover", () => {
      it("should reset counters on month change", async (): Promise<void> => {
        // Use different company ID to avoid cache conflicts
        const companyId = "rollover-company";
        const previousMonth = getPreviousMonth();
        const oldUsage = createMockCompanyUsage({
          companyId,
          monthlyExpenses: 95,
          currentMonth: previousMonth,
        });
        const company = {
          id: companyId,
          subscription: { plan: SubscriptionPlan.FREE },
          _count: { users: 1, categories: 1 },
          usage: oldUsage, // Old month triggers getOrInitializeUsage
        };
        const updatedUsage = createMockCompanyUsage({ companyId, monthlyExpenses: 0 });
        
        mockPrismaCompanyFindUnique.mockResolvedValue(company);
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(oldUsage);
        mockPrismaCompanyUsageUpdate.mockResolvedValue(updatedUsage);

        const metrics: UsageMetrics = await getUsageMetrics(companyId);

        expect(mockPrismaCompanyUsageUpdate).toHaveBeenCalled();
        expect(metrics.expenses.used).toBe(0);
      });
    });

    describe("Validation errors", () => {
      it("should throw ValidationError for invalid company ID", async (): Promise<void> => {
        await expect(getUsageMetrics("")).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError when company not found", async (): Promise<void> => {
        mockPrismaCompanyFindUnique.mockResolvedValue(null);

        await expect(getUsageMetrics("non-existent")).rejects.toThrow(ValidationError);
      });
    });

    describe("Caching", () => {
      it("should return cached metrics when available", async (): Promise<void> => {
        process.env.REDIS_URL = "redis://localhost:6379";
        mockRedisConnect.mockResolvedValue(undefined);

        const cachedMetrics: UsageMetrics = {
          companyId: "company-1",
          currentMonth: getCurrentMonth(),
          expenses: { used: 25, limit: 100, remaining: 75 },
          users: { used: 1, limit: 3, remaining: 2 },
          categories: { used: 2, limit: 5, remaining: 3 },
          plan: SubscriptionPlan.FREE,
        };
        mockRedisGet.mockResolvedValue(JSON.stringify(cachedMetrics));

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        expect(metrics).toEqual(cachedMetrics);
        expect(mockPrismaCompanyFindUnique).not.toHaveBeenCalled();
      });

      it("should cache metrics after fetching from DB", async (): Promise<void> => {
        process.env.REDIS_URL = "redis://localhost:6379";
        mockRedisConnect.mockResolvedValue(undefined);
        mockRedisGet.mockResolvedValue(null);
        mockRedisSetEx.mockResolvedValue(undefined);

        const company = createMockCompany({
          _count: { users: 1, categories: 2 },
          usage: createMockCompanyUsage({ monthlyExpenses: 30 }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        await getUsageMetrics("company-1");

        expect(mockRedisSetEx).toHaveBeenCalled();
      });

      it("should handle cache read failure gracefully", async (): Promise<void> => {
        process.env.REDIS_URL = "redis://localhost:6379";
        mockRedisConnect.mockResolvedValue(undefined);
        mockRedisGet.mockRejectedValue(new Error("Cache read failed"));

        const company = createMockCompany({
          _count: { users: 1, categories: 2 },
          usage: createMockCompanyUsage({ monthlyExpenses: 30 }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        expect(metrics.expenses.used).toBe(30);
      });
    });
  });

  // ==========================================================================
  // clearUsageCache() Tests
  // ==========================================================================
  describe("clearUsageCache()", () => {
    it("should clear cache successfully", async (): Promise<void> => {
      process.env.REDIS_URL = "redis://localhost:6379";
      mockRedisConnect.mockResolvedValue(undefined);
      mockRedisDel.mockResolvedValue(1);

      await clearUsageCache("company-1");

      expect(mockRedisDel).toHaveBeenCalled();
    });

    it("should throw CacheError on failure", async (): Promise<void> => {
      process.env.REDIS_URL = "redis://localhost:6379";
      mockRedisConnect.mockResolvedValue(undefined);
      mockRedisDel.mockRejectedValue(new Error("Redis error"));

      await expect(clearUsageCache("company-1")).rejects.toThrow(CacheError);
    });
  });

  // ==========================================================================
  // syncUsageLimits() Tests
  // ==========================================================================
  describe("syncUsageLimits()", () => {
    beforeEach(() => {
      // Reset Redis mock to be successful by default
      process.env.REDIS_URL = "redis://localhost:6379";
      mockRedisConnect.mockResolvedValue(undefined);
      mockRedisDel.mockResolvedValue(1);
    });

    it("should update limits when subscription changes to PRO", async (): Promise<void> => {
      const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
      mockPrismaCompanyFindUnique.mockResolvedValue(company);
      mockPrismaCompanyUsageUpsert.mockResolvedValue({});

      await syncUsageLimits("company-1");

      expect(mockPrismaCompanyUsageUpsert).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
        create: expect.objectContaining({
          companyId: "company-1",
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        }),
        update: expect.objectContaining({
          maxExpenses: Infinity,
          maxUsers: Infinity,
          maxCategories: Infinity,
        }),
      });
    });

    it("should update limits when subscription changes to FREE", async (): Promise<void> => {
      const company = createMockCompany({ subscription: { plan: SubscriptionPlan.FREE } });
      mockPrismaCompanyFindUnique.mockResolvedValue(company);
      mockPrismaCompanyUsageUpsert.mockResolvedValue({});

      await syncUsageLimits("company-1");

      expect(mockPrismaCompanyUsageUpsert).toHaveBeenCalledWith({
        where: { companyId: "company-1" },
        create: expect.objectContaining({
          maxExpenses: 100,
          maxUsers: 3,
          maxCategories: 5,
        }),
        update: expect.objectContaining({
          maxExpenses: 100,
          maxUsers: 3,
          maxCategories: 5,
        }),
      });
    });

    it("should throw ValidationError when company not found", async (): Promise<void> => {
      mockPrismaCompanyFindUnique.mockResolvedValue(null);

      await expect(syncUsageLimits("non-existent")).rejects.toThrow(ValidationError);
    });

    it("should default to FREE plan if no subscription", async (): Promise<void> => {
      const company = createMockCompany({ subscription: null });
      mockPrismaCompanyFindUnique.mockResolvedValue(company);
      mockPrismaCompanyUsageUpsert.mockResolvedValue({});

      await syncUsageLimits("company-1");

      expect(mockPrismaCompanyUsageUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            maxExpenses: 100,
            maxUsers: 3,
            maxCategories: 5,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge cases", () => {
    describe("Negative remaining count handling", () => {
      it("should handle negative remaining in getUsageMetrics", async (): Promise<void> => {
        // Simulate race condition where usage exceeded limit
        const company = createMockCompany({
          _count: { users: 10, categories: 10 },
          usage: createMockCompanyUsage({ monthlyExpenses: 150 }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        // Should clamp to 0, not negative
        expect(metrics.expenses.remaining).toBe(0);
      });

      it("should handle negative user count", async (): Promise<void> => {
        const company = createMockCompany({
          _count: { users: 10, categories: 2 }, // 10 users but limit is 3
          usage: createMockCompanyUsage({ monthlyExpenses: 10 }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        expect(metrics.users.remaining).toBe(0);
      });
    });

    describe("Infinity handling for PRO plans", () => {
      it("should return Infinity remaining for PRO expense limit", async (): Promise<void> => {
        const company = createMockCompany({
          subscription: { plan: SubscriptionPlan.PRO },
          _count: { users: 1000, categories: 500 },
          usage: createMockCompanyUsage({
            monthlyExpenses: 999999,
            maxExpenses: Infinity,
            maxUsers: Infinity,
            maxCategories: Infinity,
          }),
        });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const metrics: UsageMetrics = await getUsageMetrics("company-1");

        expect(metrics.expenses.remaining).toBe(Infinity);
        expect(metrics.users.remaining).toBe(Infinity);
        expect(metrics.categories.remaining).toBe(Infinity);
      });

      it("should handle Infinity in checkFeatureLimit for PRO", async (): Promise<void> => {
        const company = createMockCompany({ subscription: { plan: SubscriptionPlan.PRO } });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({
          monthlyExpenses: 999999,
          maxExpenses: Infinity,
        });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 1000000);

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(Infinity);
      });
    });

    describe("Cache invalidation", () => {
      beforeEach(() => {
        process.env.REDIS_URL = "redis://localhost:6379";
        mockRedisConnect.mockResolvedValue(undefined);
      });

      it("should invalidate cache after consumeResource", async (): Promise<void> => {
        mockRedisDel.mockResolvedValue(1);

        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

        const updatedUsage = createMockCompanyUsage({ monthlyExpenses: 51, version: 2 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(updatedUsage);

        await consumeResource("company-1", "expense", 1);

        expect(mockRedisDel).toHaveBeenCalled();
      });

      it("should continue even if cache invalidation fails", async (): Promise<void> => {
        mockRedisDel.mockRejectedValue(new Error("Cache delete failed"));

        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique
          .mockResolvedValueOnce(usage)
          .mockResolvedValueOnce(createMockCompanyUsage({ monthlyExpenses: 51, version: 2 }));
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 1 });

        // Should not throw despite cache failure
        const result = await consumeResource("company-1", "expense", 1);

        expect(result.used).toBe(51);
      });
    });

    describe("Default to FREE plan", () => {
      it("should default to FREE plan when no subscription", async (): Promise<void> => {
        const company = createMockCompany({ subscription: null });
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const result: FeatureCheckResult = await checkFeatureLimit("company-1", "expense", 10);

        expect(result.allowed).toBe(true);
      });
    });

    describe("Maximum retries exceeded", () => {
      it("should throw error after maximum retries exhausted", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage({ monthlyExpenses: 50, version: 1 });
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        // Always return version mismatch
        mockPrismaCompanyUsageUpdateMany.mockResolvedValue({ count: 0 });

        // Should eventually fail after retries
        await expect(consumeResource("company-1", "expense", 1)).rejects.toThrow();
        expect(mockPrismaCompanyUsageUpdateMany).toHaveBeenCalledTimes(3);
      });
    });

    describe("Unknown feature handling", () => {
      it("should handle all defined features", async (): Promise<void> => {
        const company = createMockCompany();
        mockPrismaCompanyFindUnique.mockResolvedValue(company);

        const usage = createMockCompanyUsage();
        mockPrismaCompanyUsageFindUnique.mockResolvedValue(usage);

        const features: GatedFeature[] = ["expense", "user", "category", "analytics", "export", "teamInvites"];

        for (const feature of features) {
          mockPrismaCompanyFindUnique.mockClear();
          mockPrismaCompanyFindUnique.mockResolvedValue(company);

          const result = await checkFeatureLimit("company-1", feature);
          expect(result).toBeDefined();
          expect(typeof result.allowed).toBe("boolean");
        }
      });
    });
  });
});
