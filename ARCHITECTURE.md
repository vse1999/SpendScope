# SpendScope Architecture

This document provides a technical snapshot of request flow, trust boundaries, and operational behavior for SpendScope.

System diagram: [`public/architecture/system-context.svg`](public/architecture/system-context.svg)

## Architecture at a Glance

1. Authentication uses NextAuth v5 with JWT sessions and Prisma adapter persistence.
2. Route gating is enforced in `proxy.ts` for public pages/APIs, authenticated APIs, and protected app routes.
3. Tenant context is resolved server-side from database state, not only JWT claims, to avoid stale token edge cases.
4. Dashboard and analytics read models are tenant-scoped and cached with `company:{id}:...` tags.
5. Mutations explicitly invalidate affected tenant cache tags to keep aggregate views consistent after writes.
6. Billing writes are server-only and admin-gated (checkout, portal, usage sync, reset controls).
7. Stripe webhook processing is signature-verified and idempotent via the `WebhookEvent` ledger unique constraint.
8. Observability uses request-scoped logging for billing/webhook routes and optional Sentry integration.

## Boundary Map

| Boundary | Entry Points | Control Objective | Failure Mode Mitigated |
| --- | --- | --- | --- |
| Auth/session | NextAuth handlers, server actions | Bind every protected operation to authenticated identity | Anonymous access to protected workflows |
| Route guard | `proxy.ts` and protected API routes | Separate public and protected traffic paths | Protected content/API exposure |
| Tenant resolution | Server-side membership lookup | Enforce company-scoped reads/writes from database state | Stale token context and cross-tenant leakage |
| Cache invalidation | Expense/category/billing mutations | Keep read models consistent after writes | Dashboard/analytics stale aggregates |
| Webhook processing | Stripe webhook route + event ledger | Guarantee idempotent processing of external events | Duplicate side effects from retried events |

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

## Cache Invalidation Ownership

| Mutation Surface | Invalidation Target |
| --- | --- |
| Expense create/update/delete | Expense list, dashboard totals, analytics trend tags |
| Category create/update/delete | Category bootstrap, dashboard summaries, analytics tags |
| Billing state changes | Subscription usage and billing summary tags |

## Webhook Idempotency Contract

1. Verify Stripe signature before parsing payload.
2. Check `(provider, eventId)` uniqueness in webhook ledger.
3. Execute billing mutation only after idempotency gate passes.
4. Persist processing result for audit and retry safety.

## Reliability Notes

- CI enforces typecheck, lint, tests, build, and policy checks.
- Rate limiting is available via Upstash Redis with local-memory fallback for development.
- Sensitive behavior toggles are environment gated and expected to remain disabled in deployed environments.

## Tradeoffs

1. Dashboard company resolution prioritizes correctness over minimal DB roundtrips to avoid stale token issues.
2. Webhook flow optimizes for idempotent correctness before advanced event fanout complexity.
3. Local development includes controlled debug/test toggles, but deployment policy checks enforce safe defaults.
