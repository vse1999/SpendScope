/**
 * Rate Limiter Service
 *
 * Enterprise-grade rate limiting with Redis (Upstash) support.
 * Falls back to memory-based rate limiting for development/local environments.
 *
 * Features:
 * - Distributed rate limiting via Redis
 * - Sliding window algorithm
 * - Graceful Redis fallback with warnings
 * - Vercel Edge compatible (stateless)
 */

import { Redis } from "@upstash/redis";
import {
  getRateLimitConfig,
  parseWindowToMs,
  type RateLimitConfig,
  type RateLimitOptions,
  DEFAULT_RATE_LIMIT_OPTIONS,
  RATE_LIMIT_KEY_PREFIXES,
  RATE_LIMIT_HEADERS,
} from "./config";

/**
 * Result of a rate limit check
 */
export type RateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetTime: number;
    }
  | {
      allowed: false;
      remaining: 0;
      resetTime: number;
      retryAfter: number;
    };

/**
 * Memory-based rate limit store for fallback mode
 */
interface MemoryStoreEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for fallback rate limiting
 * Note: This is not distributed and resets on server restart
 */
const memoryStore = new Map<string, MemoryStoreEntry>();

/**
 * Flag to track if Redis is available
 */
let redisAvailable = true;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  try {
    return new Redis({
      url,
      token,
    });
  } catch {
    return null;
  }
}

/**
 * Log warning about using memory fallback
 */
function logMemoryFallbackWarning(): void {
  if (process.env.NODE_ENV === "production" && redisAvailable) {
    console.warn(
      "[RATE LIMIT] Redis not configured. Using in-memory rate limiting. " +
      "This is NOT suitable for production with multiple instances!"
    );
    redisAvailable = false;
  }
}

/**
 * Clean expired entries from memory store
 */
function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.resetTime <= now) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Check rate limit using memory store (fallback mode)
 * @param key - Unique identifier for the rate limit bucket
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  logMemoryFallbackWarning();
  cleanupMemoryStore();

  const windowMs = parseWindowToMs(config.window);
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetTime <= now) {
    // First request or window expired - create new entry
    const newEntry: MemoryStoreEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    memoryStore.set(key, newEntry);

    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Window still active
  if (entry.count >= config.requests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: config.requests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Check rate limit using Redis (distributed mode)
 * Implements sliding window algorithm using Redis sorted sets
 * @param redis - Redis client
 * @param key - Unique identifier for the rate limit bucket
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
async function checkRedisRateLimit(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowMs = parseWindowToMs(config.window);
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    const requestMember = `${now}-${Math.random()}`;

    // Remove entries outside the current window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count entries in current window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, { score: now, member: requestMember });

    // Set expiry on the key
    pipeline.pexpire(key, windowMs);

    type PipelineResult = [unknown, { result: number }, unknown, unknown];
    const results = await pipeline.exec() as PipelineResult | null;

    // Get the count from results (second command - zcard)
    const count = results?.[1]?.result ?? 0;
    const totalRequests = count + 1;

    const resetTime = now + windowMs;

    if (totalRequests > config.requests) {
      // Rate limit exceeded - remove the request we just added
      await redis.zrem(key, requestMember);

      // Get oldest entry to calculate accurate retry-after
      const oldestEntries = await redis.zrange(key, 0, 0, { withScores: true });
      const oldestTimestamp = oldestEntries[1] ? parseInt(oldestEntries[1] as string, 10) : windowStart;
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestTimestamp + windowMs,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, config.requests - totalRequests),
      resetTime,
    };
  } catch (error) {
    // Redis error - fall back to memory
    console.error("[RATE LIMIT] Redis error, falling back to memory:", error);
    return checkMemoryRateLimit(key, config);
  }
}

/**
 * Check if a request is allowed based on rate limits
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param options - Rate limit options
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  options: Partial<RateLimitOptions> = {}
): Promise<RateLimitResult> {
  const tier = options.tier ?? DEFAULT_RATE_LIMIT_OPTIONS.tier;
  const config = getRateLimitConfig(tier);
  const keyPrefix = options.keyPrefix ?? RATE_LIMIT_KEY_PREFIXES[tier];
  const key = `${keyPrefix}:${identifier}`;

  const redis = getRedisClient();

  if (redis) {
    return checkRedisRateLimit(redis, key, config);
  }

  return checkMemoryRateLimit(key, config);
}

/**
 * Get current rate limit status without consuming a request
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param options - Rate limit options
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  identifier: string,
  options: Partial<RateLimitOptions> = {}
): Promise<Omit<RateLimitResult, "allowed" | "retryAfter"> & { limit: number }> {
  const tier = options.tier ?? DEFAULT_RATE_LIMIT_OPTIONS.tier;
  const config = getRateLimitConfig(tier);
  const keyPrefix = options.keyPrefix ?? RATE_LIMIT_KEY_PREFIXES[tier];
  const key = `${keyPrefix}:${identifier}`;

  const redis = getRedisClient();
  const windowMs = parseWindowToMs(config.window);
  const now = Date.now();
  const resetTime = now + windowMs;

  if (redis) {
    try {
      // Remove old entries and count current
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      pipeline.zcard(key);
      type PipelineResult = [unknown, { result: number }];
      const results = await pipeline.exec() as PipelineResult | null;

      const count = results?.[1]?.result ?? 0;

      return {
        limit: config.requests,
        remaining: Math.max(0, config.requests - count),
        resetTime,
      };
    } catch (error) {
      console.error("[RATE LIMIT] Redis error getting status:", error);
    }
  }

  // Memory fallback
  cleanupMemoryStore();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetTime <= now) {
    return {
      limit: config.requests,
      remaining: config.requests,
      resetTime,
    };
  }

  return {
    limit: config.requests,
    remaining: Math.max(0, config.requests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier
 * @param identifier - Unique identifier
 * @param options - Rate limit options
 */
export async function resetRateLimit(
  identifier: string,
  options: Partial<RateLimitOptions> = {}
): Promise<void> {
  const tier = options.tier ?? DEFAULT_RATE_LIMIT_OPTIONS.tier;
  const keyPrefix = options.keyPrefix ?? RATE_LIMIT_KEY_PREFIXES[tier];
  const key = `${keyPrefix}:${identifier}`;

  const redis = getRedisClient();

  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.error("[RATE LIMIT] Redis error resetting limit:", error);
    }
  }

  // Also clear from memory
  memoryStore.delete(key);
}

/**
 * Create rate limit headers for HTTP responses
 * @param result - Rate limit result
 * @returns Headers object
 */
export function createRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  const headers: Record<string, string> = {
    [RATE_LIMIT_HEADERS.remaining]: String(result.remaining),
    [RATE_LIMIT_HEADERS.reset]: String(Math.ceil(result.resetTime / 1000)),
  };

  if (!result.allowed) {
    headers[RATE_LIMIT_HEADERS.retryAfter] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Check if rate limiting is configured with Redis
 * @returns True if Redis is available
 */
export function isRedisConfigured(): boolean {
  return getRedisClient() !== null;
}
