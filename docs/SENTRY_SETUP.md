# Sentry Setup Guide

## Overview

Sentry is configured for error tracking, performance monitoring, and session replay. This guide helps you set up Sentry for your SpendScope deployment.

## Quick Start

### 1. Sign Up for Sentry

1. Go to [sentry.io](https://sentry.io/signup/) and create an account
2. Create a new project named `spendscope`
3. Select **Next.js** as the platform
4. Copy the DSN from the project settings

### 2. Configure Environment Variables

Add to your `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"
SENTRY_DSN="https://xxx@yyy.ingest.sentry.io/zzz"
```

### 3. Enable in Development (Optional)

To test Sentry locally:

```bash
NEXT_PUBLIC_SENTRY_ENABLED="true"
SENTRY_ENABLED="true"
```

By default, Sentry is disabled in development to avoid noise.

## Features Enabled

### Error Tracking
- Automatic React error boundaries
- Server-side error capture
- API route error tracking
- Server Action error monitoring

### Performance Monitoring
- Automatic performance instrumentation
- Distributed tracing
- Custom operation tracking via `monitorAsync()`

### Session Replay
- 10% of sessions captured
- 100% of error sessions captured
- User privacy respected (no sensitive data)

### Source Maps
Source maps are uploaded during production builds for readable stack traces.

## Usage in Code

### Track Errors

```typescript
import { trackError } from "@/lib/monitoring";

try {
  await riskyOperation();
} catch (error) {
  trackError(error instanceof Error ? error : new Error(String(error)), {
    userId: user.id,
    operation: "riskyOperation",
  });
}
```

### Track Business Events

```typescript
import { trackEvent } from "@/lib/monitoring";

trackEvent("subscription_upgraded", {
  userId: user.id,
  plan: "pro",
  previousPlan: "free",
});
```

### Set User Context

```typescript
import { setUserContext, clearUserContext } from "@/lib/monitoring";

// On login
setUserContext({
  id: user.id,
  email: user.email,
  companyId: user.companyId,
  plan: user.plan,
});

// On logout
clearUserContext();
```

### Monitor Async Operations

```typescript
import { monitorAsync } from "@/lib/monitoring";

const result = await monitorAsync(
  "fetch_expenses",
  () => fetchExpenses(companyId),
  { companyId, filters }
);
```

## Production Setup

### 1. Source Maps Upload

For production builds with source maps:

```bash
# Set in your CI/CD environment (GitHub Actions, Vercel, etc.)
SENTRY_ORG="your-org-name"
SENTRY_PROJECT="spendscope"
SENTRY_AUTH_TOKEN="your-auth-token"
```

Get your auth token from: **Sentry > Settings > Auth Tokens**

### 2. Release Tracking

Releases are automatically tracked. Set the version in your build:

```bash
NEXT_PUBLIC_APP_VERSION="1.2.3"
```

### 3. Environment Tagging

Errors are automatically tagged with:
- `environment`: production/development
- `release`: app version
- `service`: spendscope-web

## Best Practices

### DO:
- Use `trackError()` instead of `console.error()` in production code
- Set user context on authentication
- Include relevant context when tracking errors
- Use `monitorAsync()` for important operations

### DON'T:
- Log sensitive data (passwords, tokens, credit cards)
- Enable Sentry in development unless debugging
- Commit `SENTRY_AUTH_TOKEN` to git

## Troubleshooting

### Errors not appearing in Sentry

1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify Sentry is enabled for the environment
3. Check browser console for initialization errors
4. Ensure `instrumentation.ts` is in the project root

### Source maps not working

1. Verify `SENTRY_AUTH_TOKEN` is set in CI/CD
2. Check that `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry settings
3. Ensure source maps are generated in the build (`next.config.ts`)

## Pricing

Sentry's free tier includes:
- 5,000 error events/month
- 10M span units/month (performance)
- 500 replays/month
- 1GB attachments

For a portfolio project, this is more than sufficient.
