# SpendScope

[![CI](https://github.com/vse1999/SpendScope/actions/workflows/ci.yml/badge.svg)](https://github.com/vse1999/SpendScope/actions/workflows/ci.yml)

SpendScope is a product-minded expense operations platform for finance and ops teams that need to see where team spend is going, keep billing flows reliable, and avoid policy drift as companies grow.

## Live Product

- Live demo: [https://v0-spend-scope.vercel.app/](https://v0-spend-scope.vercel.app/)

The deployed product is the primary proof surface for this project. This repository is the implementation deep dive for architecture, quality gates, and engineering decisions.

## What This Project Demonstrates

- Multi-tenant company isolation with server-side tenant resolution
- Role-aware workflows across dashboard, expenses, analytics, team, and billing
- Policy-conscious expense management with filtering, sorting, CSV export, and optimistic updates
- Stripe checkout, billing portal, and webhook synchronization with idempotency controls
- Deterministic demo seeding, Jest coverage, Playwright flows, and strict TypeScript quality gates

## Visual Walkthrough

### Dashboard overview

![Dashboard overview](public/screenshots/dashboard-overview.png)

### Expense operations

![Expenses table](public/screenshots/expenses-table.png)

### Analytics surface

![Analytics overview](public/screenshots/analytics-overview.png)

## Reviewing The Product

Sign in with GitHub or Google OAuth at [https://v0-spend-scope.vercel.app/signup](https://v0-spend-scope.vercel.app/signup) — no password required. The demo workspace is pre-seeded.

Suggested path:

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
- Authenticated review account: `E2E Member` in the seeded `SpendScope E2E` workspace
- Team size: 2 seeded members in the shared demo company
- Categories: 3 active categories represented across seeded data
- Expenses: 60 deterministic expenses across a fixed multi-month window
- Subscription state: billing surfaces enabled in the seeded review environment

> Note: first load may take 3–5 seconds on a cold Vercel instance. Warm load median is 271ms. See [benchmark protocol](docs/benchmarks/dashboard.md) for methodology.

## Product Story

The core use case is a small team that has outgrown ad hoc expense tracking. Finance and ops leads need one place to:

- understand current spend quickly
- review category trends and team activity
- control who can manage billing
- keep dashboard data and billing state trustworthy after mutations

SpendScope focuses on that operational surface area instead of trying to be a generic accounting suite.

## Architecture Highlights

### Auth and tenant safety

- NextAuth v5 handles authentication with Prisma persistence.
- Tenant context is resolved on the server from database state, not from stale token assumptions alone.
- Privileged actions enforce membership and role checks server-side.

### Data consistency

- Dashboard and analytics reads are cache-tagged by tenant scope.
- Expense and category mutations explicitly invalidate affected dashboard and analytics tags.
- Team and expenses routes now surface explicit failure states instead of silently degrading into empty data.

### Billing hardening

- Stripe webhooks are signature-verified and idempotent through persisted event handling.
- Billing actions are admin-gated.
- Billing routes emit request-scoped logs for easier incident review.

System context diagram: [`public/architecture/system-context.svg`](public/architecture/system-context.svg)

Route boundary: `proxy.ts` is the Next.js middleware layer that enforces auth gating and separates public from protected traffic before requests reach route handlers.

## Performance And Quality Evidence

Latest captured dashboard benchmark on the deterministic seeded workspace:

- First dashboard load median: `360ms`
- Warm dashboard load median: `271ms`
- Largest dashboard data request median: `49ms` first load / `50ms` warm

These numbers were captured from a local production build (`npm run build && npm run start`) against the deterministic seeded workspace. They reflect application-layer latency, not deployed cold-start time. Full protocol, raw run notes, and the local host caveat: [`docs/benchmarks/dashboard.md`](docs/benchmarks/dashboard.md)

Merge-readiness checks used in this repo:

- `npx tsc --noEmit`
- `npm run lint`
- `npm test -- --runInBand`
- `npm run build`

## Tech Stack

- **Next.js 15 App Router** — server components and server actions for clean server/client boundaries
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

Use `.env.example` as the source of truth. The most important local variables are:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `APP_URL`
- OAuth provider credentials for Google and GitHub

If billing is enabled, also configure the Stripe variables listed in `.env.example`.

## Tradeoffs And Next Steps

What I optimized for here:

- correctness and role-aware server boundaries over client-only convenience
- deterministic demo and test flows over purely cosmetic mock data
- practical production concerns such as cache invalidation, webhook idempotency, and error-state honesty

What I would do next at larger scale:

- move selected dashboard aggregates behind scheduled materialized views
- add queue-backed webhook fanout and retry orchestration
- instrument p95 latency and error budgets for dashboard and billing routes
- add a stronger spend-policy exception and approval workflow as the next differentiating product feature

## Project Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/benchmarks/dashboard.md](docs/benchmarks/dashboard.md)
- [docs/deployment/test-mode-checklist.md](docs/deployment/test-mode-checklist.md)
- [docs/deployment/manual-regression-checklist.md](docs/deployment/manual-regression-checklist.md)
- [docs/deployment/rollback-runbook.md](docs/deployment/rollback-runbook.md)
- [SECURITY.md](SECURITY.md)

## License

MIT. See [LICENSE](LICENSE).
