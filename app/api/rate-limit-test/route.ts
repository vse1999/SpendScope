/**
 * Rate Limit Test Endpoint
 *
 * Simple endpoint to verify rate limiting is working correctly.
 * Returns rate limit status in headers.
 *
 * GET /api/rate-limit-test
 *
 * Headers returned:
 * - X-RateLimit-Limit: Total requests allowed in window
 * - X-RateLimit-Remaining: Remaining requests in current window
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 * - Retry-After: Seconds until retry (only when rate limited)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getRateLimitStatus,
  createRateLimitHeaders,
  isRedisConfigured,
} from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit/config";
import { areTestEndpointsEnabled } from "@/lib/runtime/test-endpoints";

/**
 * Extract client identifier from request
 * Uses x-forwarded-for header or falls back to "test-client"
 */
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() ??
    realIp ??
    "test-client";
}

/**
 * GET handler for rate limit testing
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!areTestEndpointsEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const identifier = getClientIdentifier(request);

  // Check rate limit
  const result = await checkRateLimit(identifier, { tier: "api" });

  // Get current status for headers
  const status = await getRateLimitStatus(identifier, { tier: "api" });

  // Build response headers
  const headers: Record<string, string> = {
    ...createRateLimitHeaders(result),
    "X-RateLimit-Limit": String(status.limit),
    "X-RateLimit-Mode": isRedisConfigured() ? "redis" : "memory",
  };

  if (!result.allowed) {
    // Rate limit exceeded
    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded",
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  // Request allowed
  return NextResponse.json(
    {
      success: true,
      message: "Request allowed",
      rateLimit: {
        tier: "api",
        limit: status.limit,
        remaining: result.remaining,
        resetTime: new Date(result.resetTime).toISOString(),
        mode: isRedisConfigured() ? "redis" : "memory",
      },
      config: {
        api: RATE_LIMITS.api,
        auth: RATE_LIMITS.auth,
        action: RATE_LIMITS.action,
        webhook: RATE_LIMITS.webhook,
      },
    },
    { headers }
  );
}

/**
 * HEAD handler for lightweight rate limit checks
 * Returns only headers without body
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  if (!areTestEndpointsEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const identifier = getClientIdentifier(request);
  const result = await checkRateLimit(identifier, { tier: "api" });
  const status = await getRateLimitStatus(identifier, { tier: "api" });

  const headers: Record<string, string> = {
    ...createRateLimitHeaders(result),
    "X-RateLimit-Limit": String(status.limit),
    "X-RateLimit-Mode": isRedisConfigured() ? "redis" : "memory",
  };

  return new NextResponse(null, {
    status: result.allowed ? 200 : 429,
    headers,
  });
}

// Configure runtime for Edge compatibility
export const runtime = "edge";
export const preferredRegion = "auto";
