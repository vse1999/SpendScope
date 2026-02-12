# Rate Limiting for SpendScope

Enterprise-grade rate limiting with Redis (Upstash) support and graceful memory fallback.

## Features

- **Distributed Rate Limiting**: Uses Redis for multi-instance deployments
- **Sliding Window Algorithm**: More accurate than fixed windows
- **Vercel Edge Compatible**: Stateless, works in Edge Runtime
- **Graceful Fallback**: Falls back to memory if Redis unavailable
- **TypeScript Strict**: Fully typed, no `any` types

## Setup

### 1. Configure Upstash Redis (Production Recommended)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and Token
4. Add to `.env.local`:

```env
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### 2. Without Redis (Development Only)

If Redis is not configured, the system falls back to in-memory rate limiting. **Not recommended for production** as it doesn't work across multiple instances.

## Usage

### API Routes

```typescript
// app/api/expenses/route.ts
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const identifier = request.headers.get("x-forwarded-for") ?? "anonymous";
  
  const result = await checkRateLimit(identifier, { tier: "api" });
  
  if (!result.allowed) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: createRateLimitHeaders(result),
    });
  }
  
  // Process request...
  return Response.json({ success: true }, {
    headers: createRateLimitHeaders(result),
  });
}
```

### Server Actions

```typescript
// app/actions/expenses.ts
import { withRateLimit, RateLimitError } from "@/lib/rate-limit";

export const createExpense = withRateLimit(
  async (data: CreateExpenseInput) => {
    // Your server action logic
    return prisma.expense.create({ data });
  },
  { tier: "action" }
);

// Handle rate limit errors in your component
"use client";
export function ExpenseForm() {
  async function handleSubmit(formData: FormData) {
    try {
      await createExpense(formData);
    } catch (error) {
      if (error instanceof RateLimitError) {
        toast.error(`Too many requests. Try again in ${error.retryAfter}s`);
      }
    }
  }
}
```

### Middleware (Edge Rate Limiting)

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/rate-limit/middleware";

export async function middleware(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return rateLimitMiddleware(request, {
      tier: "api",
      skipPaths: ["/api/webhooks/stripe"], // Skip webhooks
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
```

### Custom Identifier (User-based)

```typescript
import { withRateLimit } from "@/lib/rate-limit";
import { auth } from "@/auth";

export const updateProfile = withRateLimit(
  async (data: ProfileData) => {
    // Update profile
  },
  {
    tier: "action",
    identifier: async () => {
      const session = await auth();
      return session?.user?.id ?? "anonymous";
    },
  }
);
```

## Rate Limit Tiers

| Tier | Requests | Window | Use Case |
|------|----------|--------|----------|
| `auth` | 5 | 1m | Login, register endpoints |
| `api` | 100 | 1m | General API endpoints |
| `action` | 30 | 1m | Server actions |
| `webhook` | 1000 | 1m | Webhook endpoints |

## Testing

Use the test endpoint to verify rate limiting:

```bash
# Make requests until rate limited
for i in {1..105}; do
  curl -s http://localhost:3000/api/rate-limit-test | jq '.rateLimit.remaining'
done
```

Or check headers:

```bash
curl -I http://localhost:3000/api/rate-limit-test
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1707158400
```

## API Reference

### `checkRateLimit(identifier, options)`

Check if a request is allowed.

```typescript
const result = await checkRateLimit("user-123", { tier: "api" });
// { allowed: true, remaining: 99, resetTime: 1707158400000 }
```

### `getRateLimitStatus(identifier, options)`

Get current rate limit status without consuming a request.

### `withRateLimit(action, options)`

Higher-order function to wrap server actions.

### `RateLimitError`

Error thrown when rate limit is exceeded.

```typescript
class RateLimitError extends Error {
  readonly retryAfter: number;  // Seconds until retry
  readonly resetTime: number;   // Unix timestamp
}
```

## Response Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Total requests allowed |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |
| `Retry-After` | Seconds until retry (429 only) |
| `X-RateLimit-Mode` | "redis" or "memory" |
