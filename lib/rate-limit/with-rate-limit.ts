/**
 * Higher-Order Function for Rate Limiting Server Actions
 *
 * Wraps server actions with rate limiting to protect against abuse.
 *
 * Usage:
 * ```typescript
 * const protectedAction = withRateLimit(
 *   async (data: FormData) => {
 *     // Your server action logic
 *     return { success: true };
 *   },
 *   { tier: "action", identifier: async () => "user-id-or-ip" }
 * );
 * ```
 */

import { checkRateLimit, type RateLimitResult } from "./rate-limiter";
import {
  type RateLimitTier,
  RATE_LIMIT_KEY_PREFIXES,
} from "./config";
import { headers } from "next/headers";

/**
 * Options for withRateLimit HOF
 */
export interface WithRateLimitOptions {
  /** Rate limit tier to use */
  tier: RateLimitTier;
  /** Custom key prefix */
  keyPrefix?: string;
  /**
   * Function to generate the rate limit identifier.
   * Can return a string directly or a Promise<string>.
   * Defaults to using IP address from headers.
   */
  identifier?: () => string | Promise<string>;
  /**
   * Custom error message when rate limited
   * @default "Too many requests. Please try again later."
   */
  errorMessage?: string;
  /**
   * Custom error handler
   * @param result - Rate limit result
   * @returns Error to throw
   */
  onRateLimit?: (result: RateLimitResult & { allowed: false }) => Error;
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  readonly retryAfter: number;
  readonly resetTime: number;

  constructor(message: string, retryAfter: number, resetTime: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.resetTime = resetTime;
  }
}

/**
 * Default identifier generator using request headers
 * Extracts IP from x-forwarded-for or x-real-ip headers
 */
async function defaultIdentifierFromHeaders(): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() ??
    realIp ??
    "unknown";
}

/**
 * Higher-order function that wraps a server action with rate limiting
 *
 * @typeParam T - Function type to wrap
 * @param action - Server action to wrap
 * @param options - Rate limit options
 * @returns Wrapped action with rate limiting
 *
 * @example
 * ```typescript
 * // Basic usage with default IP-based identification
 * export const createExpense = withRateLimit(
 *   async (data: CreateExpenseInput) => {
 *     // Create expense logic
 *     return prisma.expense.create({ data });
 *   },
 *   { tier: "action" }
 * );
 *
 * // With user ID identification
 * export const updateProfile = withRateLimit(
 *   async (userId: string, data: ProfileData) => {
 *     // Update profile logic
 *   },
 *   {
 *     tier: "action",
 *     identifier: async () => {
 *       const session = await auth();
 *       return session?.user?.id ?? "anonymous";
 *     }
 *   }
 * );
 *
 * // With custom error handling
 * export const sendEmail = withRateLimit(
 *   async (to: string, content: string) => {
 *     // Send email logic
 *   },
 *   {
 *     tier: "api",
 *     onRateLimit: (result) => {
 *       return new Error(`Email rate limit exceeded. Try again in ${result.retryAfter}s`);
 *     }
 *   }
 * );
 * ```
 */
export function withRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>
>(
  action: T,
  options: WithRateLimitOptions
): T {
  const {
    tier,
    keyPrefix = RATE_LIMIT_KEY_PREFIXES[tier],
    identifier = defaultIdentifierFromHeaders,
    errorMessage = "Too many requests. Please try again later.",
    onRateLimit,
  } = options;

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Get identifier for rate limiting
    const id = await identifier();

    // Check rate limit
    const result = await checkRateLimit(id, {
      tier,
      keyPrefix,
    });

    if (!result.allowed) {
      // Rate limit exceeded
      if (onRateLimit) {
        throw onRateLimit(result);
      }
      throw new RateLimitError(
        errorMessage,
        result.retryAfter,
        result.resetTime
      );
    }

    // Execute the original action
    return action(...args) as ReturnType<T>;
  }) as T;
}

/**
 * Create a rate-limited action with preset configuration
 * Useful for creating reusable rate limit configurations
 *
 * @param presetOptions - Default options for the preset
 * @returns Function to create rate-limited actions
 *
 * @example
 * ```typescript
 * // Create a preset for user-scoped actions
 * const withUserRateLimit = createRateLimitPreset({
 *   tier: "action",
 *   identifier: async () => {
 *     const session = await auth();
 *     return session?.user?.id ?? "anonymous";
 *   }
 * });
 *
 * // Use the preset
 * export const updateUser = withUserRateLimit(
 *   async (data: UserData) => {
 *     // Update user logic
 *   }
 * );
 * ```
 */
export function createRateLimitPreset(
  presetOptions: Omit<WithRateLimitOptions, "errorMessage" | "onRateLimit">
) {
  return <T extends (...args: unknown[]) => Promise<unknown>>(
    action: T,
    overrideOptions?: Partial<Pick<WithRateLimitOptions, "errorMessage" | "onRateLimit">>
  ): T => {
    return withRateLimit(action, {
      ...presetOptions,
      ...overrideOptions,
    });
  };
}

/**
 * Preset for user-scoped rate limiting (uses authenticated user ID)
 * Requires authentication to be set up
 *
 * @example
 * ```typescript
 * export const createPost = withUserRateLimit(
 *   async (data: PostData) => {
 *     // Create post logic
 *   },
 *   { tier: "action" }
 * );
 * ```
 */
export function withUserRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>
>(
  action: T,
  options: Pick<WithRateLimitOptions, "tier" | "errorMessage" | "onRateLimit">
): T {
  return withRateLimit(action, {
    ...options,
    identifier: async () => {
      // Try to get user ID from headers (set by middleware/auth)
      const headersList = await headers();
      const userId = headersList.get("x-user-id");

      if (userId) {
        return userId;
      }

      // Fallback to IP-based identification
      return defaultIdentifierFromHeaders();
    },
  });
}

/**
 * Preset for IP-based rate limiting (good for public endpoints)
 *
 * @example
 * ```typescript
 * export const publicSearch = withIPRateLimit(
 *   async (query: string) => {
 *     // Search logic
 *   },
 *   { tier: "api" }
 * );
 * ```
 */
export function withIPRateLimit<
  T extends (...args: unknown[]) => Promise<unknown>
>(
  action: T,
  options: Pick<WithRateLimitOptions, "tier" | "errorMessage" | "onRateLimit">
): T {
  return withRateLimit(action, {
    ...options,
    identifier: defaultIdentifierFromHeaders,
  });
}

/**
 * Helper to check if an error is a rate limit error
 * @param error - Error to check
 * @returns True if error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/**
 * Extract rate limit info from error
 * @param error - Error to extract info from
 * @returns Rate limit info or null
 */
export function getRateLimitInfo(error: unknown): {
  retryAfter: number;
  resetTime: number;
} | null {
  if (isRateLimitError(error)) {
    return {
      retryAfter: error.retryAfter,
      resetTime: error.resetTime,
    };
  }
  return null;
}
