/**
 * Rate Limiting Configuration
 *
 * Enterprise-grade rate limiting tiers for different endpoint types.
 * Designed for Vercel Edge compatibility and distributed deployments.
 */

/**
 * Rate limit tier definitions
 * Window format: "1m" = 1 minute, "1h" = 1 hour, "1d" = 1 day
 */
export const RATE_LIMITS = {
  /** Strict limits for authentication endpoints (login, register, etc.) */
  auth: { requests: 5, window: "1m" },
  /** Standard limits for general API endpoints */
  api: { requests: 100, window: "1m" },
  /** Generous limits for webhook endpoints */
  webhook: { requests: 1000, window: "1m" },
  /** Strict limits for server actions */
  action: { requests: 30, window: "1m" },
} as const;

/**
 * Type representing valid rate limit tiers
 */
export type RateLimitTier = keyof typeof RATE_LIMITS;

/**
 * Rate limit configuration for a specific tier
 */
export interface RateLimitConfig {
  requests: number;
  window: string;
}

/**
 * Parse window string to milliseconds
 * @param window - Window string (e.g., "1m", "1h", "1d")
 * @returns Window duration in milliseconds
 */
export function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Expected format: 1m, 1h, 1d`);
  }

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  switch (unit) {
    case "s":
      return numValue * 1000;
    case "m":
      return numValue * 60 * 1000;
    case "h":
      return numValue * 60 * 60 * 1000;
    case "d":
      return numValue * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Get rate limit configuration for a specific tier
 * @param tier - Rate limit tier
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(tier: RateLimitTier): RateLimitConfig {
  const config = RATE_LIMITS[tier];
  if (!config) {
    throw new Error(`Unknown rate limit tier: ${tier}`);
  }
  return config;
}

/**
 * Redis key prefixes for rate limiting
 */
export const RATE_LIMIT_KEY_PREFIXES = {
  /** General API rate limit keys */
  api: "ratelimit:api",
  /** Authentication endpoint rate limit keys */
  auth: "ratelimit:auth",
  /** Server action rate limit keys */
  action: "ratelimit:action",
  /** Webhook rate limit keys */
  webhook: "ratelimit:webhook",
} as const;

/**
 * HTTP headers for rate limit responses
 */
export const RATE_LIMIT_HEADERS = {
  /** Remaining requests in current window */
  remaining: "X-RateLimit-Remaining",
  /** Total limit for the tier */
  limit: "X-RateLimit-Limit",
  /** Unix timestamp when the limit resets */
  reset: "X-RateLimit-Reset",
  /** Seconds until retry is allowed (when rate limited) */
  retryAfter: "Retry-After",
} as const;

/**
 * Default rate limit options
 */
export const DEFAULT_RATE_LIMIT_OPTIONS: RateLimitOptions = {
  tier: "api",
  keyPrefix: RATE_LIMIT_KEY_PREFIXES.api,
  identifierGenerator: defaultIdentifierGenerator,
};

/**
 * Options for rate limiting
 */
export interface RateLimitOptions {
  /** Rate limit tier to use */
  tier: RateLimitTier;
  /** Custom key prefix for Redis keys */
  keyPrefix?: string;
  /** Custom identifier generator function */
  identifierGenerator?: (request: Request) => string;
}

/**
 * Default identifier generator - uses IP address and User-Agent hash
 * @param request - Next.js request object
 * @returns Unique identifier for rate limiting
 */
export function defaultIdentifierGenerator(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() ??
    realIp ??
    "unknown";

  const userAgent = request.headers.get("user-agent") ?? "unknown";

  // Create a deterministic identifier from IP and User-Agent
  return `${ip}:${hashString(userAgent)}`;
}

/**
 * Simple string hash function for creating deterministic identifiers
 * @param str - String to hash
 * @returns Hashed string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
