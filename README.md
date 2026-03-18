# SpendScope

[![CI](https://github.com/vse1999/SpendScope/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/vse1999/SpendScope/actions/workflows/ci.yml)

SpendScope is an expense operations platform for finance and ops teams that need to see where team spend is going, keep billing flows reliable, and avoid policy drift as companies grow.

## Live Demo

**[https://v0-spend-scope.vercel.app](https://v0-spend-scope.vercel.app)**

Sign in with GitHub or Google OAuth — no password required. The demo workspace is pre-seeded with realistic data.

> First load may take 3–5 seconds on a cold server instance. Warm load median is 271ms — see [benchmark notes](docs/benchmarks/dashboard.md).

This repository is the implementation deep dive for architecture, quality gates, and engineering decisions. The deployed product is the primary proof surface.

## What This Project Demonstrates

- Multi-tenant company isolation with server-side tenant resolution
- Role-aware workflows across dashboard, expenses, analytics, team, and billing
- Policy-conscious expense management with filtering, sorting, CSV export, and optimistic updates
- Stripe checkout, billing portal, and webhook synchronization with idempotency controls
- Deterministic demo seeding, Jest coverage, Playwright flows, and strict TypeScript quality gates

## Screenshots

### Dashboard

![Dashboard overview](public/screenshots/dashboard-overview.png)

### Expenses

![Expenses table](public/screenshots/expenses-table.png)

### Analytics

![Analytics overview](public/screenshots/analytics-overview.png)

## Reviewing The Product

Suggested path through the live deployment:

1. Land on `/dashboard` for the top-level spend summary and category cards.
2. Open `/dashboard/expenses` to review filters, table interactions, CSV export, and expense monitoring.
3. Open `/dashboard/analytics` to inspect trend and category breakdowns.
4. Open `/dashboard/team` and `/dashboard/billing` to verify role-aware management and billing behavior.

To reproduce the seeded state locally:

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
```

Expected seeded state:

- Company: `SpendScope E2E`
- Authenticated account: `E2E Member` in the seeded `SpendScope E2E` workspace
- Team size: 2 seeded members
- Categories: 3 active categories across seeded data
- Expenses: 60 deterministic expenses across a fixed multi-month window
- Subscription state: billing surfaces enabled

## Product Context

The core use case is a small team that has outgrown ad hoc expense tracking. Finance and ops leads need one place to:

- understand current spend quickly
- review category trends and team activity
- control who can manage billing
- keep dashboard data and billing state trustworthy after mutations

SpendScope focuses on that operational surface area rather than trying to be a generic accounting suite.

## Architecture Highlights

### Auth and tenant isolation

- NextAuth v5 handles authentication with Prisma persistence.
- Tenant context is resolved on the server from database state, not from stale token assumptions alone.
- Privileged actions enforce membership and role checks server-side.
- `proxy.ts` is the middleware layer that enforces auth gating and separates public from protected traffic before requests reach route handlers.

### Data consistency

- Dashboard and analytics reads are cache-tagged by tenant scope.
- Expense and category mutations explicitly invalidate affected dashboard and analytics tags.
- Routes surface explicit failure states instead of silently degrading into empty data.

### Billing hardening

- Stripe webhooks are signature-verified and idempotent through persisted event handling.
- Billing actions are admin-gated.
- Billing routes emit request-scoped logs for easier incident review.

System context diagram: [`public/architecture/system-context.svg`](public/architecture/system-context.svg)

## Performance And Quality Evidence

Dashboard benchmark against the deterministic seeded workspace, captured from a local production build (`npm run build && npm run start`). These numbers reflect application-layer latency.

- First load median: `360ms`
- Warm load median: `271ms`
- Largest data request median: `49ms` first load / `50ms` warm

Full protocol, raw runs, and environment contract: [`docs/benchmarks/dashboard.md`](docs/benchmarks/dashboard.md)

Merge-readiness checks enforced in CI:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run check:any`
- `npm run audit:prod`
- `npm run test:ci`
- `npm run build`

## Tech Stack

- **Next.js 16 App Router** — server components and server actions for clean server/client boundaries
- **React 19**
- **TypeScript** with `strict: true`
- **Prisma + PostgreSQL** — typed query layer with explicit migration history
- **NextAuth v5** — App Router-native session handling with Prisma adapter persistence
- **Tailwind CSS 4 + shadcn/ui**
- **Jest + ts-jest** — unit and integration coverage with a coverage gate in CI
- **Playwright** — E2E flows against the seeded workspace
- **Stripe** — checkout, billing portal, webhook signature verification, and idempotent event processing
- **Sentry + Upstash Redis** — optional production integrations for observability and rate limiting

## Run Locally

1. Install dependencies:

```bash
npm ci
```

2. Create local environment config:

```bash
cp .env.example .env.local
```

3. Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Seed the deterministic demo workspace:

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Notes

Use `.env.example` as the source of truth. Required local variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_URL`
- OAuth provider credentials for Google and GitHub

If billing is enabled, configure the Stripe variables listed in `.env.example`.

## Tradeoffs And Next Steps

What this build optimized for:

- Correctness and role-aware server boundaries over client-only convenience
- Deterministic demo and test flows over purely cosmetic mock data
- Practical production concerns: cache invalidation, webhook idempotency, and error-state honesty

What comes next at larger scale:

- Move selected dashboard aggregates behind scheduled materialized views
- Add queue-backed webhook fanout and retry orchestration
- Instrument p95 latency and error budgets for dashboard and billing routes
- Add a spend-policy exception and approval workflow as the next differentiating product feature

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/benchmarks/dashboard.md](docs/benchmarks/dashboard.md)
- [docs/deployment/test-mode-checklist.md](docs/deployment/test-mode-checklist.md)
- [docs/deployment/manual-regression-checklist.md](docs/deployment/manual-regression-checklist.md)
- [docs/deployment/rollback-runbook.md](docs/deployment/rollback-runbook.md)
- [SECURITY.md](SECURITY.md)

## License

MIT. See [LICENSE](LICENSE).
