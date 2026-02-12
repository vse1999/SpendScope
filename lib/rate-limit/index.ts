/**
 * Rate Limiting Module
 *
 * Enterprise-grade rate limiting for SpendScope.
 *
 * Features:
 * - Distributed rate limiting via Redis (Upstash)
 * - Sliding window algorithm
 * - Graceful fallback to memory if Redis unavailable
 * - Vercel Edge compatible (stateless)
 * - TypeScript strict mode compliant
 *
 * @example
 * ```typescript
 * // API Route
 * import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
 *
 * export async function GET(request: Request) {
 *   const identifier = getClientIP(request);
 *   const result = await checkRateLimit(identifier, { tier: "api" });
 *
 *   if (!result.allowed) {
 *     return new Response("Rate limit exceeded", {
 *       status: 429,
 *       headers: createRateLimitHeaders(result)
 *     });
 *   }
 *
 *   return Response.json(data);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Server Action
 * import { withRateLimit, RateLimitError } from "@/lib/rate-limit";
 *
 * export const createExpense = withRateLimit(
 *   async (data: ExpenseData) => {
 *     // Your logic here
 *   },
 *   { tier: "action" }
 * );
 * ```
 */

// Configuration exports
export {
  RATE_LIMITS,
  RATE_LIMIT_KEY_PREFIXES,
  RATE_LIMIT_HEADERS,
  DEFAULT_RATE_LIMIT_OPTIONS,
  parseWindowToMs,
  getRateLimitConfig,
  defaultIdentifierGenerator,
  type RateLimitTier,
  type RateLimitConfig,
  type RateLimitOptions,
} from "./config";

// Rate limiter exports
export {
  checkRateLimit,
  getRateLimitStatus,
  resetRateLimit,
  createRateLimitHeaders,
  isRedisConfigured,
  type RateLimitResult,
} from "./rate-limiter";

// HOF exports
export {
  withRateLimit,
  withUserRateLimit,
  withIPRateLimit,
  createRateLimitPreset,
  isRateLimitError,
  getRateLimitInfo,
  RateLimitError,
  type WithRateLimitOptions,
} from "./with-rate-limit";
