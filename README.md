# SpendScope

SpendScope is a production-oriented expense management platform for teams that need clear spend visibility, policy-aware controls, and reliable billing operations.


## Key Capabilities

- Multi-tenant company data isolation
- Role-based access (admin/member)
- Expense workflows with filtering, sorting, bulk actions, and CSV export
- Analytics dashboards and trend visualization
- Plan-based entitlements (Free vs Pro)
- Stripe checkout, billing portal, and webhook synchronization
- Team notifications for billing and collaboration events

## System Design Snapshot

1. NextAuth v5 handles authentication with JWT sessions and Prisma persistence.
2. `proxy.ts` enforces route/API access boundaries for public and protected traffic.
3. Tenant context is resolved server-side from database state (not token-only assumptions).
4. Dashboard/analytics read models use tenant-scoped cache tags (`company:{id}:...`).
5. Mutations explicitly invalidate affected cache tags for consistency after writes.
6. Billing routes are admin-gated and instrumented with request-scoped logs.
7. Stripe webhook processing is signature-verified and idempotent via event ledger constraints.

System context diagram: [`public/architecture/system-context.svg`](public/architecture/system-context.svg)

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript (`strict: true`)
- Prisma + PostgreSQL (Neon-compatible)
- NextAuth v5 (Auth.js)
- Tailwind CSS 4 + shadcn/ui
- Jest + ts-jest
- Playwright E2E
- Sentry (optional)
- Upstash Redis (recommended for production rate limiting)

## Engineering Decisions

### Multi-tenant safety model

- Every dashboard request is resolved through authenticated user + company context before data access.
- Sensitive mutations enforce company membership and role checks server-side, not in client code.
- Shared test helpers intentionally seed isolated tenant data to keep E2E behavior deterministic.

### Caching and invalidation strategy

- Read models use tenant-scoped cache tags (`company:{id}:...`) so invalidation is precise and cheap.
- Expense mutations invalidate expense/dashboard/analytics tags; category bootstrap invalidates category/dashboard/analytics tags.
- Revalidation is explicit in mutation actions to avoid stale aggregate cards after writes.

### Mutation UX strategy

- Expense flows use optimistic client updates for immediate feedback, then non-blocking server reconciliation.
- Bulk actions now respect server-confirmed affected IDs so partial authorization outcomes remain UI-correct.
- Summary counters are managed in the same client state model as the table rows to prevent drift.

### Billing hardening strategy

- Stripe webhooks are signature-verified and idempotent via persisted event IDs.
- Billing actions are admin-gated and environment-gated for test-only reset behavior.
- Checkout/portal routes emit request-scoped telemetry for post-incident auditability.

## Performance Evidence

- Benchmark protocol and reporting table: [`docs/benchmarks/dashboard.md`](docs/benchmarks/dashboard.md)
- Measurement contract: first dashboard load median vs warm-cache median with explicit environment and dataset setup

## Security Posture

- Server-side authorization checks are enforced for privileged mutations.
- Multi-tenant reads/writes are scoped by company context.
- Billing webhooks are signature-verified and idempotent.
- Deployment policy checks enforce environment safety toggles and key consistency.
- Vulnerability reporting policy: see `SECURITY.md`.

## Quick Start (5 Minutes)

1. Install dependencies:

```bash
npm ci
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Update `.env.local` values (database, auth, OAuth, optional billing).

4. Generate Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

5. Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo Path (Deterministic)

Use deterministic demo data before screenshots or recorded walkthroughs:

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
```

Expected seeded state:

- Company: `DemoCorp`
- Team size: 5 users (1 admin, 4 members)
- Categories: 5
- Expenses: 60 across a fixed 6-month window
- Subscription: Pro (active)

Suggested reviewer walkthrough:

1. Login as DemoCorp admin.
2. Navigate to `/dashboard` and inspect summary cards/charts.
3. Create an expense and verify dashboard totals refresh.
4. Open billing settings and verify admin-gated billing actions.
5. Confirm notifications/team workflows are tenant-scoped.

## Environment Variables

Use `.env.example` as the source of truth.

### Environment matrix

| Variable | Local | Vercel Preview | Vercel Production | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Required | Required | Required | Use direct Postgres URL, not placeholder values |
| `NEXTAUTH_SECRET` | Required | Required | Required | Generate once, keep stable per project |
| `NEXTAUTH_URL` | `http://localhost:3000` | Preview URL | Production URL | Must match deployed origin |
| `APP_URL` | `http://localhost:3000` | Preview URL | Production URL | Keep aligned with `NEXTAUTH_URL` |
| `GOOGLE_CLIENT_ID` | Optional | Required for Google OAuth | Required for Google OAuth | Configure callback URLs per environment |
| `GOOGLE_CLIENT_SECRET` | Optional | Required for Google OAuth | Required for Google OAuth | Provider secret |
| `GITHUB_CLIENT_ID` | Optional | Required for GitHub OAuth | Required for GitHub OAuth | Configure callback URLs per environment |
| `GITHUB_CLIENT_SECRET` | Optional | Required for GitHub OAuth | Required for GitHub OAuth | Provider secret |
| `NEXT_PUBLIC_ENABLE_BILLING` | Optional | Optional | Optional | Set `true` only when Stripe is configured |
| `STRIPE_*` billing vars | Optional | Required if billing enabled | Required if billing enabled | Keep test/live keys consistent per environment |

### Required for local development

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `APP_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

### Required when billing is enabled

Set `NEXT_PUBLIC_ENABLE_BILLING=true`, then configure:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_YEARLY_PRICE_ID`

### Recommended for production

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

### Non-production toggles (must stay `false` in deployed environments)

- `ENABLE_TEST_ENDPOINTS`
- `E2E_LOGIN_BYPASS`
- `ALLOW_BILLING_RESET`
- `NEXT_PUBLIC_ALLOW_BILLING_RESET`

### OAuth callback URLs

Use these callback patterns in Google and GitHub provider apps:

- Local: `http://localhost:3000/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/github`
- Preview: `https://<your-preview-domain>/api/auth/callback/google` and `https://<your-preview-domain>/api/auth/callback/github`
- Production: `https://<your-production-domain>/api/auth/callback/google` and `https://<your-production-domain>/api/auth/callback/github`

## Scripts

### Development

```bash
npm run dev
npm run build
npm run start
```

### Quality Gates

```bash
npm run docs:check
npx tsc --noEmit
npm run lint
npm run audit:prod
npm run check:any
npm run test:ci
npm run build
```

### Testing

```bash
npm test -- --runInBand
npm run test:coverage
npm run test:e2e
npm run test:e2e:list
```

### Deployment Safety

```bash
npm run deploy:check
npm run smoke:deploy
```

### Stripe Helpers

```bash
npm run stripe:listen
npm run stripe:listen:secret
npm run stripe:trigger:checkout
```

### Demo Data

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
```

You can override deterministic defaults with custom flags:

```bash
npm run seed:demo -- --seed=12345 --reference-date=2026-04-01
```

## CI Workflows

- `CI` (`.github/workflows/ci.yml`): policy checks, typecheck, lint, audit, explicit-`any` gate, tests, and build
- `E2E (Playwright)` (`.github/workflows/e2e.yml`): manual browser workflow
- `Deploy Smoke Checks` (`.github/workflows/deploy-smoke.yml`): manual post-deploy smoke checks

## Deployment Notes

- Vercel preview deployments run automatically for pushed branches if Git integration is enabled.
- If you want deployment only from `master`, configure Vercel ignored-build or production-branch policy.
- Preview deployments are intentionally marked `noindex, nofollow` to avoid SEO dilution on `*.vercel.app`.

### Common deployment failures (quick fixes)

- `redirect_uri_mismatch`:
  - Add the exact deployed callback URL to Google/GitHub OAuth app settings.
  - Ensure `NEXTAUTH_URL` and `APP_URL` match the same deployed origin.
- `auth/error?error=Configuration`:
  - Verify `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and OAuth provider keys are set in the active Vercel environment.
- `Can't reach database server` / Prisma adapter errors:
  - Confirm `DATABASE_URL` is a valid direct database URL.
  - Do not mix incompatible Prisma driver adapter + Accelerate URL modes.
- Stripe checkout/portal failures:
  - Ensure all Stripe env vars are present and key modes are consistent (all test or all live).
  - Confirm the configured Stripe price IDs exist in the same Stripe account and mode.

### Rollback runbook

- If smoke checks fail after deployment, follow [`docs/deployment/rollback-runbook.md`](docs/deployment/rollback-runbook.md).

## What I'd Do Next at Scale

- Move selected dashboard read models behind precomputed materialized views and scheduled refresh strategy.
- Add queue-backed webhook fanout for multi-provider billing and resilient retry orchestration.
- Add p95 latency/error SLO dashboards for dashboard routes and billing endpoints.

## Non-goals / Tradeoffs

- This repository is optimized for production-grade demo and team workflows, not enterprise compliance certification bundles.
- Billing guidance is intentionally centered on Stripe test-mode safety and deterministic validation.
- Route guards intentionally avoid token-only company checks to prevent stale-token redirect loops.

## Project Docs

- Architecture: `ARCHITECTURE.md`
- System context diagram: `public/architecture/system-context.svg`
- Dashboard benchmark protocol: `docs/benchmarks/dashboard.md`
- Stripe webhook setup: `docs/deployment/stripe-webhook-setup.md`
- Deployment checklist: `docs/deployment/test-mode-checklist.md`
- Manual regression checklist: `docs/deployment/manual-regression-checklist.md`
- Rollback runbook: `docs/deployment/rollback-runbook.md`

Private process notes and interview prep belong under `docs/private/` and are intentionally not tracked.

## Security

See `SECURITY.md` for vulnerability reporting and handling.

## Merge Readiness

A branch is merge-ready only when all of these pass:

- `npm run docs:check`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run audit:prod`
- `npm run check:any`
- `npm run test:ci`
- `npm run build`

## License

This project is licensed under the MIT License. See `LICENSE`.
