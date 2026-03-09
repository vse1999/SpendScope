# SpendScope Architecture

This document provides a technical snapshot of request flow, trust boundaries, and operational behavior for SpendScope.

## Architecture at a Glance

1. Authentication uses NextAuth v5 with JWT sessions and Prisma adapter persistence.
2. Route gating is enforced in `proxy.ts` for public pages/APIs, authenticated APIs, and protected app routes.
3. Tenant context is resolved server-side from database state, not only JWT claims, to avoid stale token edge cases.
4. Dashboard and analytics read models are tenant-scoped and cached with `company:{id}:...` tags.
5. Mutations explicitly invalidate affected tenant cache tags to keep aggregate views consistent after writes.
6. Billing writes are server-only and admin-gated (checkout, portal, usage sync, reset controls).
7. Stripe webhook processing is signature-verified and idempotent via the `WebhookEvent` ledger unique constraint.
8. Observability uses request-scoped logging for billing/webhook routes and optional Sentry integration.

## Request Flow Boundaries

### 1) Auth and Session Boundary

- Entry points: NextAuth handlers and session callbacks.
- Result: server actions and route handlers receive authenticated user identity and role.
- Security posture: authorization still happens inside each privileged mutation.

### 2) Route Guard Boundary

- `proxy.ts` allows static/public traffic and public APIs.
- Protected APIs return HTTP status errors when unauthenticated.
- Protected app pages redirect unauthenticated users to `/login`.

### 3) Tenant Context Resolution Boundary

- Core rule: resolve company membership from database for protected server operations.
- Purpose: prevent stale JWT/company state from leaking or blocking valid access.

### 4) Data Access and Caching Boundary

- Read models are resolved on server and tagged per company.
- Cache keys and tags are tenant scoped.
- Mutation handlers perform explicit invalidation to avoid stale dashboard/analytics/cards.

### 5) Billing and Webhook Boundary

- Checkout/portal routes require authentication and admin role.
- Webhook route validates Stripe signature before processing.
- Event idempotency is guaranteed by unique `(provider, eventId)` on webhook ledger.

## Reliability Notes

- CI enforces typecheck, lint, tests, build, and policy checks.
- Rate limiting is available via Upstash Redis with local-memory fallback for development.
- Sensitive behavior toggles are environment gated and expected to remain disabled in deployed environments.

## Tradeoffs

1. Dashboard company resolution prioritizes correctness over minimal DB roundtrips to avoid stale token issues.
2. Webhook flow optimizes for idempotent correctness before advanced event fanout complexity.
3. Local development includes controlled debug/test toggles, but deployment policy checks enforce safe defaults.
