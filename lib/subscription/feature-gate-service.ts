/**
 * Feature Gating Service
 * 
 * Enforces subscription limits with:
 * - Optimistic locking for concurrent requests
 * - Graceful Redis cache fallback
 * - Automatic month rollover
 * - Atomic operations
 * 
 * NO `any` types allowed - strict TypeScript only
 */

import { prisma } from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";
import { 
  FeatureGateError, 
  OptimisticLockError,
  CacheError,
  ValidationError 
} from "@/lib/errors";
import { 
  FEATURE_LIMITS, 
  getNumericLimits, 
  GatedFeature,
  FEATURE_LIMIT_KEYS,
  NumericLimits,
  CACHE_TTL,
  LOCK_CONFIG
} from "./config";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of checking if a feature is allowed
 */
export interface FeatureCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
  upgradeUrl?: string;
}

/**
 * Usage metrics for a company
 */
export interface UsageMetrics {
  companyId: string;
  currentMonth: number;
  expenses: {
    used: number;
    limit: number;
    remaining: number;
  };
  users: {
    used: number;
    limit: number;
    remaining: number;
  };
  categories: {
    used: number;
    limit: number;
    remaining: number;
  };
  plan: SubscriptionPlan;
}

/**
 * Raw CompanyUsage record from database
 */
interface CompanyUsageRecord {
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

/**
 * Company with subscription info
 */
interface CompanyWithSubscription {
  id: string;
  subscription: {
    plan: SubscriptionPlan;
  } | null;
  _count: {
    users: number;
    categories: number;
  };
}

/**
 * Cache provider interface - allows for Redis or in-memory fallback
 */
interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory cache implementation (fallback when Redis unavailable)
 */
class InMemoryCache implements CacheProvider {
  private store: Map<string, { value: unknown; expiresAt: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// ============================================================================
// Cache Initialization
// ============================================================================

/**
 * Get the current month in YYYYMM format
 */
function getCurrentMonth(): number {
  const now = new Date();
  return now.getFullYear() * 100 + (now.getMonth() + 1);
}

/**
 * Create cache key for usage metrics
 */
function createUsageCacheKey(companyId: string): string {
  return `usage:${companyId}:${getCurrentMonth()}`;
}

// Global cache instance (in-memory fallback)
const inMemoryCache = new InMemoryCache();

// Attempt to use Redis if available, otherwise fallback to in-memory
let cacheProvider: CacheProvider = inMemoryCache;
let redisAvailable = false;

// Redis client interface for type safety when dynamically imported
interface RedisClient {
  get: (key: string) => Promise<string | null>;
  setEx: (key: string, ttlSeconds: number, value: string) => Promise<void>;
  del: (key: string) => Promise<void>;
  connect: () => Promise<void>;
}

// Redis module type (used with eval require)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RedisModule = {
  createClient: (options: { url: string }) => RedisClient;
};

// Lazy-load Redis to avoid startup failures
async function getCacheProvider(): Promise<CacheProvider> {
  if (redisAvailable) {
    return cacheProvider;
  }

  // Try to initialize Redis if not already attempted
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      // Use eval require to prevent webpack from bundling redis
      const redis = eval('require')('redis');
      const client = redis.createClient({ url: redisUrl });
      await client.connect();
      
      // Wrap Redis client in our CacheProvider interface
      cacheProvider = {
        get: async <T>(key: string): Promise<T | null> => {
          const value = await client.get(key) as string | null;
          return value ? JSON.parse(value) as T : null;
        },
        set: async <T>(key: string, value: T, ttlSeconds: number): Promise<void> => {
          await client.setEx(key, ttlSeconds, JSON.stringify(value));
        },
        delete: async (key: string): Promise<void> => {
          await client.del(key);
        },
      };
      redisAvailable = true;
    } catch {
      // Redis not available, use in-memory cache
      redisAvailable = false;
    }
  }

  return cacheProvider;
}

// ============================================================================
// Core Service Functions
// ============================================================================

/**
 * Get or initialize company usage record
 * Handles month rollover automatically
 */
async function getOrInitializeUsage(
  companyId: string,
  plan: SubscriptionPlan
): Promise<CompanyUsageRecord> {
  const currentMonth = getCurrentMonth();
  const limits = getNumericLimits(plan);

  // Try to find existing usage record
  let usage = await prisma.companyUsage.findUnique({
    where: { companyId },
  }) as CompanyUsageRecord | null;

  if (!usage) {
    // Create new usage record
    usage = await prisma.companyUsage.create({
      data: {
        companyId,
        currentMonth,
        monthlyExpenses: 0,
        maxExpenses: limits.maxMonthlyExpenses,
        maxUsers: limits.maxUsers,
        maxCategories: limits.maxCategories,
        version: 0,
      },
    }) as CompanyUsageRecord;
  } else if (usage.currentMonth !== currentMonth) {
    // Month rollover - reset counters
    usage = await prisma.companyUsage.update({
      where: { id: usage.id },
      data: {
        currentMonth,
        monthlyExpenses: 0,
        maxExpenses: limits.maxMonthlyExpenses,
        maxUsers: limits.maxUsers,
        maxCategories: limits.maxCategories,
        version: { increment: 1 },
      },
    }) as CompanyUsageRecord;
  }

  return usage;
}

/**
 * Check if a feature is allowed with optimistic locking and retry
 * @param companyId - The company ID
 * @param feature - The feature to check
 * @param requestedCount - How many of the resource are being requested (default: 1)
 * @returns FeatureCheckResult with allowed status and remaining count
 */
export async function checkFeatureLimit(
  companyId: string,
  feature: GatedFeature,
  requestedCount: number = 1
): Promise<FeatureCheckResult> {
  // Validate inputs
  if (!companyId || typeof companyId !== "string") {
    throw new ValidationError("companyId", companyId, "Invalid company ID");
  }
  if (requestedCount < 1 || !Number.isInteger(requestedCount)) {
    throw new ValidationError("requestedCount", requestedCount, "Requested count must be a positive integer");
  }

  const limitKey = FEATURE_LIMIT_KEYS[feature];
  
  // For feature flags (not numeric limits), check directly
  if (limitKey === null) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { subscription: true },
    }) as { subscription: { plan: SubscriptionPlan } | null } | null;

    if (!company) {
      throw new ValidationError("companyId", companyId, "Company not found");
    }

    const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
    const hasFeatureFlag = FEATURE_LIMITS[plan].features[feature as keyof typeof FEATURE_LIMITS.FREE.features];

    return {
      allowed: hasFeatureFlag,
      remaining: hasFeatureFlag ? Infinity : 0,
      reason: hasFeatureFlag ? undefined : `${feature} is not available on your current plan`,
      upgradeUrl: hasFeatureFlag ? undefined : "/settings/billing",
    };
  }

  // For numeric limits, check with retry logic
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < LOCK_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await checkNumericLimitWithLock(companyId, limitKey, requestedCount);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        lastError = error;
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, LOCK_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  // All retries exhausted
  throw lastError ?? new Error("Failed to check feature limit after maximum retries");
}

/**
 * Internal function to check numeric limit with optimistic locking
 */
async function checkNumericLimitWithLock(
  companyId: string,
  limitKey: keyof NumericLimits,
  requestedCount: number
): Promise<FeatureCheckResult> {
  // Get company with subscription to determine plan
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          categories: true,
        },
      },
    },
  }) as CompanyWithSubscription | null;

  if (!company) {
    throw new ValidationError("companyId", companyId, "Company not found");
  }

  const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
  const limits = getNumericLimits(plan);
  const maxLimit = limits[limitKey];

  // Unlimited plan check
  if (maxLimit === Infinity) {
    return {
      allowed: true,
      remaining: Infinity,
    };
  }

  // Get current usage
  const usage = await getOrInitializeUsage(companyId, plan);

  // Calculate current usage based on limit type
  let currentUsage: number;
  switch (limitKey) {
    case "maxMonthlyExpenses":
      currentUsage = usage.monthlyExpenses;
      break;
    case "maxUsers":
      currentUsage = company._count.users;
      break;
    case "maxCategories":
      currentUsage = company._count.categories;
      break;
    default:
      throw new Error(`Unknown limit key: ${limitKey}`);
  }

  const remaining = maxLimit - currentUsage;
  const allowed = remaining >= requestedCount;

  if (!allowed) {
    return {
      allowed: false,
      remaining: Math.max(0, remaining),
      reason: `You have reached your ${limitKey.replace("max", "").toLowerCase()} limit (${maxLimit}). Upgrade to Pro for unlimited access.`,
      upgradeUrl: "/settings/billing",
    };
  }

  return {
    allowed: true,
    remaining: remaining - requestedCount,
  };
}

/**
 * Consume a resource (for transactional usage like expenses)
 * Uses optimistic locking to prevent over-consumption
 * @param companyId - The company ID
 * @param feature - The feature to consume
 * @param count - How many to consume (default: 1)
 * @returns Updated usage metrics
 * @throws FeatureGateError if limit would be exceeded
 * @throws OptimisticLockError if concurrent modification detected
 */
export async function consumeResource(
  companyId: string,
  feature: GatedFeature,
  count: number = 1
): Promise<{ used: number; remaining: number }> {
  // Only allow consumption for expense feature (transactional)
  if (feature !== "expense") {
    throw new ValidationError("feature", feature, "Only 'expense' feature can be consumed transactionally");
  }

  if (!companyId || typeof companyId !== "string") {
    throw new ValidationError("companyId", companyId, "Invalid company ID");
  }
  if (count < 1 || !Number.isInteger(count)) {
    throw new ValidationError("count", count, "Count must be a positive integer");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < LOCK_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await consumeWithLock(companyId, count);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, LOCK_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Failed to consume resource after maximum retries");
}

/**
 * Internal function to consume resource with optimistic locking
 */
async function consumeWithLock(
  companyId: string,
  count: number
): Promise<{ used: number; remaining: number }> {
  // Get company with subscription
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  }) as { subscription: { plan: SubscriptionPlan } | null } | null;

  if (!company) {
    throw new ValidationError("companyId", companyId, "Company not found");
  }

  const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
  const limits = getNumericLimits(plan);

  // Unlimited plan - no need to track
  if (limits.maxMonthlyExpenses === Infinity) {
    return { used: 0, remaining: Infinity };
  }

  // Get current usage with version for optimistic locking
  const usage = await getOrInitializeUsage(companyId, plan);

  // Check if consumption would exceed limit
  if (usage.monthlyExpenses + count > limits.maxMonthlyExpenses) {
    throw new FeatureGateError(
      `Monthly expense limit exceeded. Limit: ${limits.maxMonthlyExpenses}, Current: ${usage.monthlyExpenses}, Requested: ${count}`,
      "expense",
      limits.maxMonthlyExpenses,
      usage.monthlyExpenses,
      "/settings/billing"
    );
  }

  // Attempt to update with optimistic locking
  try {
    const updated = await prisma.companyUsage.updateMany({
      where: {
        companyId,
        version: usage.version, // Optimistic lock check
      },
      data: {
        monthlyExpenses: { increment: count },
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      // Version mismatch - concurrent modification
      throw new OptimisticLockError(
        "CompanyUsage",
        usage.id,
        usage.version,
        usage.version + 1 // We don't know actual version, but it changed
      );
    }

    // Fetch updated record
    const newUsage = await prisma.companyUsage.findUnique({
      where: { companyId },
    }) as CompanyUsageRecord;

    // Invalidate cache
    try {
      const cache = await getCacheProvider();
      await cache.delete(createUsageCacheKey(companyId));
    } catch {
      // Cache invalidation failure is non-critical
    }

    return {
      used: newUsage.monthlyExpenses,
      remaining: limits.maxMonthlyExpenses - newUsage.monthlyExpenses,
    };
  } catch (error) {
    if (error instanceof FeatureGateError || error instanceof OptimisticLockError) {
      throw error;
    }
    throw new Error(`Failed to consume resource: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Decrement a resource (for undo operations like expense deletion)
 * Uses optimistic locking
 * @param companyId - The company ID
 * @param count - How many to decrement (default: 1)
 * @returns Updated usage metrics
 */
export async function decrementResource(
  companyId: string,
  count: number = 1
): Promise<{ used: number; remaining: number }> {
  if (!companyId || typeof companyId !== "string") {
    throw new ValidationError("companyId", companyId, "Invalid company ID");
  }
  if (count < 1 || !Number.isInteger(count)) {
    throw new ValidationError("count", count, "Count must be a positive integer");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < LOCK_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await decrementWithLock(companyId, count);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, LOCK_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Failed to decrement resource after maximum retries");
}

/**
 * Internal function to decrement with optimistic locking
 */
async function decrementWithLock(
  companyId: string,
  count: number
): Promise<{ used: number; remaining: number }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  }) as { subscription: { plan: SubscriptionPlan } | null } | null;

  if (!company) {
    throw new ValidationError("companyId", companyId, "Company not found");
  }

  const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
  const limits = getNumericLimits(plan);

  // Get current usage
  const usage = await prisma.companyUsage.findUnique({
    where: { companyId },
  }) as CompanyUsageRecord | null;

  if (!usage) {
    return { used: 0, remaining: limits.maxMonthlyExpenses };
  }

  // Calculate new value (don't go below 0)
  const newValue = Math.max(0, usage.monthlyExpenses - count);

  // Update with optimistic locking
  const updated = await prisma.companyUsage.updateMany({
    where: {
      companyId,
      version: usage.version,
    },
    data: {
      monthlyExpenses: newValue,
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    throw new OptimisticLockError(
      "CompanyUsage",
      usage.id,
      usage.version,
      usage.version + 1
    );
  }

  // Invalidate cache
  try {
    const cache = await getCacheProvider();
    await cache.delete(createUsageCacheKey(companyId));
  } catch {
    // Cache invalidation failure is non-critical
  }

  return {
    used: newValue,
    remaining: limits.maxMonthlyExpenses - newValue,
  };
}

/**
 * Get current usage metrics for a company
 * Uses caching with fallback to database
 * @param companyId - The company ID
 * @returns Usage metrics
 */
export async function getUsageMetrics(companyId: string): Promise<UsageMetrics> {
  if (!companyId || typeof companyId !== "string") {
    throw new ValidationError("companyId", companyId, "Invalid company ID");
  }

  const cacheKey = createUsageCacheKey(companyId);

  // Try cache first
  try {
    const cache = await getCacheProvider();
    const cached = await cache.get<UsageMetrics>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // Log cache error but continue with database fetch
    console.warn("Cache fetch failed, falling back to database:", error instanceof Error ? error.message : "Unknown error");
  }

  // Fetch from database
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: true,
      usage: true,
      _count: {
        select: {
          users: true,
          categories: true,
        },
      },
    },
  }) as {
    id: string;
    subscription: { plan: SubscriptionPlan } | null;
    usage: CompanyUsageRecord | null;
    _count: {
      users: number;
      categories: number;
    };
  } | null;

  if (!company) {
    throw new ValidationError("companyId", companyId, "Company not found");
  }

  const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
  const limits = getNumericLimits(plan);
  const currentMonth = getCurrentMonth();

  // Handle month rollover if needed
  let usage = company.usage;
  if (!usage || usage.currentMonth !== currentMonth) {
    usage = await getOrInitializeUsage(companyId, plan);
  }

  // Build metrics
  const metrics: UsageMetrics = {
    companyId,
    currentMonth,
    expenses: {
      used: usage.monthlyExpenses,
      limit: limits.maxMonthlyExpenses,
      remaining: limits.maxMonthlyExpenses === Infinity 
        ? Infinity 
        : Math.max(0, limits.maxMonthlyExpenses - usage.monthlyExpenses),
    },
    users: {
      used: company._count.users,
      limit: limits.maxUsers,
      remaining: limits.maxUsers === Infinity 
        ? Infinity 
        : Math.max(0, limits.maxUsers - company._count.users),
    },
    categories: {
      used: company._count.categories,
      limit: limits.maxCategories,
      remaining: limits.maxCategories === Infinity 
        ? Infinity 
        : Math.max(0, limits.maxCategories - company._count.categories),
    },
    plan,
  };

  // Cache the result
  try {
    const cache = await getCacheProvider();
    await cache.set(cacheKey, metrics, CACHE_TTL.USAGE_METRICS);
  } catch (error) {
    // Cache write failure is non-critical
    console.warn("Cache write failed:", error instanceof Error ? error.message : "Unknown error");
  }

  return metrics;
}

/**
 * Clear usage cache for a company
 * @param companyId - The company ID
 */
export async function clearUsageCache(companyId: string): Promise<void> {
  try {
    const cache = await getCacheProvider();
    await cache.delete(createUsageCacheKey(companyId));
  } catch (error) {
    throw new CacheError("delete", error instanceof Error ? error : undefined);
  }
}

/**
 * Sync usage limits with current subscription plan
 * Should be called when subscription changes
 * @param companyId - The company ID
 */
export async function syncUsageLimits(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { subscription: true },
  }) as { subscription: { plan: SubscriptionPlan } | null } | null;

  if (!company) {
    throw new ValidationError("companyId", companyId, "Company not found");
  }

  const plan = company.subscription?.plan ?? SubscriptionPlan.FREE;
  const limits = getNumericLimits(plan);

  // Update usage record with new limits
  await prisma.companyUsage.upsert({
    where: { companyId },
    create: {
      companyId,
      currentMonth: getCurrentMonth(),
      monthlyExpenses: 0,
      maxExpenses: limits.maxMonthlyExpenses,
      maxUsers: limits.maxUsers,
      maxCategories: limits.maxCategories,
    },
    update: {
      maxExpenses: limits.maxMonthlyExpenses,
      maxUsers: limits.maxUsers,
      maxCategories: limits.maxCategories,
    },
  });

  // Clear cache
  await clearUsageCache(companyId);
}

// ============================================================================
// Export types for consumers
// ============================================================================

export type {
  CacheProvider,
  CompanyUsageRecord,
  CompanyWithSubscription,
};
