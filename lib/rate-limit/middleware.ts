/**
 * Rate Limit Middleware
 *
 * Next.js middleware for applying rate limiting at the edge.
 * Can be used in middleware.ts to protect specific routes.
 *
 * Usage in middleware.ts:
 * ```typescript
 * import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";
 *
 * export async function middleware(request: NextRequest) {
 *   return rateLimitMiddleware(request, {
 *     tier: "api",
 *     pathMatchers: ["/api/"],
 *   });
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  createRateLimitHeaders,
  isRedisConfigured,
} from "./rate-limiter";
import {
  type RateLimitTier,
  RATE_LIMIT_KEY_PREFIXES,
} from "./config";

/**
 * Middleware rate limiting options
 */
export interface MiddlewareRateLimitOptions {
  /** Rate limit tier to use */
  tier: RateLimitTier;
  /** Path patterns to apply rate limiting (glob-style) */
  pathMatchers?: string[];
  /** Custom identifier generator */
  identifierGenerator?: (request: NextRequest) => string;
  /** Custom key prefix */
  keyPrefix?: string;
  /**
   * Skip rate limiting for these paths
   * @default ["/api/rate-limit-test"]
   */
  skipPaths?: string[];
  /**
   * Custom response when rate limited
   */
  onRateLimit?: (
    request: NextRequest,
    retryAfter: number
  ) => NextResponse | Promise<NextResponse>;
}

/**
 * Default options for middleware rate limiting
 */
const DEFAULT_MIDDLEWARE_OPTIONS: Partial<MiddlewareRateLimitOptions> = {
  pathMatchers: ["/api/"],
  skipPaths: ["/api/rate-limit-test", "/api/auth/callback"],
  identifierGenerator: (request: NextRequest): string => {
    // For Edge runtime, use request headers directly
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() ??
      realIp ??
      "unknown";

    const userAgent = request.headers.get("user-agent") ?? "unknown";

    // Create a simple hash of user-agent to differentiate clients
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return `${ip}:${Math.abs(hash).toString(36)}`;
  },
};

/**
 * Check if a path matches any of the patterns
 */
function matchesPathPatterns(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Simple glob matching
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*") + "$"
      );
      return regex.test(path);
    }
    return path.startsWith(pattern);
  });
}

/**
 * Default rate limit response handler
 */
function defaultRateLimitResponse(
  request: NextRequest,
  retryAfter: number
): NextResponse {
  const acceptHeader = request.headers.get("accept") ?? "";
  const isJson = acceptHeader.includes("application/json");

  if (isJson) {
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "Content-Type": "application/json",
        },
      }
    );
  }

  return new NextResponse(
    `Too Many Requests - Retry after ${retryAfter} seconds`,
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "Content-Type": "text/plain",
      },
    }
  );
}

/**
 * Rate limit middleware function
 *
 * Apply this in your middleware.ts to rate limit requests.
 *
 * @param request - Next.js request
 * @param options - Rate limiting options
 * @returns NextResponse (either allowed or rate limited)
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { NextResponse } from "next/server";
 * import type { NextRequest } from "next/server";
 * import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";
 *
 * export async function middleware(request: NextRequest) {
 *   // Apply rate limiting to API routes
 *   if (request.nextUrl.pathname.startsWith("/api/")) {
 *     return rateLimitMiddleware(request, {
 *       tier: "api",
 *       skipPaths: ["/api/webhooks/stripe"], // Skip Stripe webhooks
 *     });
 *   }
 *
 *   return NextResponse.next();
 * }
 *
 * export const config = {
 *   matcher: "/api/:path*",
 * };
 * ```
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: MiddlewareRateLimitOptions
): Promise<NextResponse> {
  const mergedOptions = {
    ...DEFAULT_MIDDLEWARE_OPTIONS,
    ...options,
  };

  const path = request.nextUrl.pathname;

  // Check if path should be skipped
  if (mergedOptions.skipPaths?.some((skipPath) => path.startsWith(skipPath))) {
    return NextResponse.next();
  }

  // Check if path matches patterns
  if (
    mergedOptions.pathMatchers &&
    !matchesPathPatterns(path, mergedOptions.pathMatchers)
  ) {
    return NextResponse.next();
  }

  // Get identifier
  const identifier = mergedOptions.identifierGenerator!(request);

  // Check rate limit
  const result = await checkRateLimit(identifier, {
    tier: mergedOptions.tier,
    keyPrefix: mergedOptions.keyPrefix ?? RATE_LIMIT_KEY_PREFIXES[mergedOptions.tier],
  });

  // Create base response
  const response = result.allowed
    ? NextResponse.next()
    : await (mergedOptions.onRateLimit ?? defaultRateLimitResponse)(
        request,
        result.retryAfter
      );

  // Add rate limit headers
  const headers = createRateLimitHeaders(result);
  headers["X-RateLimit-Mode"] = isRedisConfigured() ? "redis" : "memory";

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Create a configured rate limit middleware
 *
 * Useful for creating reusable middleware configurations
 *
 * @param defaultOptions - Default options to apply
 * @returns Configured middleware function
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { createRateLimitMiddleware } from "@/lib/rate-limit/middleware";
 *
 * const apiRateLimit = createRateLimitMiddleware({
 *   tier: "api",
 *   skipPaths: ["/api/health"],
 * });
 *
 * const authRateLimit = createRateLimitMiddleware({
 *   tier: "auth",
 *   pathMatchers: ["/api/auth/login", "/api/auth/register"],
 * });
 *
 * export async function middleware(request: NextRequest) {
 *   // Apply auth rate limiting first
 *   const authResponse = await authRateLimit(request);
 *   if (authResponse.status === 429) return authResponse;
 *
 *   // Then apply general API rate limiting
 *   return apiRateLimit(request);
 * }
 * ```
 */
export function createRateLimitMiddleware(
  defaultOptions: MiddlewareRateLimitOptions
) {
  return (request: NextRequest, overrideOptions?: Partial<MiddlewareRateLimitOptions>) => {
    return rateLimitMiddleware(request, {
      ...defaultOptions,
      ...overrideOptions,
    });
  };
}

/**
 * IP blocking middleware
 *
 * Blocks requests from specific IP addresses
 *
 * @param blockedIps - Array of blocked IP addresses (supports wildcards)
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // middleware.ts
 * import { ipBlockMiddleware } from "@/lib/rate-limit/middleware";
 *
 * const blockMiddleware = ipBlockMiddleware(["192.168.1.*", "10.0.0.5"]);
 *
 * export async function middleware(request: NextRequest) {
 *   const blockResponse = blockMiddleware(request);
 *   if (blockResponse) return blockResponse;
 *
 *   // Continue with other middleware...
 * }
 * ```
 */
export function ipBlockMiddleware(
  blockedIps: string[]
): (request: NextRequest) => NextResponse | null {
  return (request: NextRequest): NextResponse | null => {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "";

    const isBlocked = blockedIps.some((blockedIp) => {
      if (blockedIp.includes("*")) {
        const regex = new RegExp(
          "^" + blockedIp.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
        );
        return regex.test(clientIp);
      }
      return blockedIp === clientIp;
    });

    if (isBlocked) {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return null;
  };
}
