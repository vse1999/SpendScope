# SpendScope Case Study

## Project Summary

SpendScope is a team spend management platform built for finance and operations leads who need trustworthy visibility into expenses, analytics, billing ownership, and role-aware workspace controls.

Live product: [https://v0-spend-scope.vercel.app/](https://v0-spend-scope.vercel.app/)

## Problem

Small teams often start expense tracking in spreadsheets, chat threads, and disconnected tools. That works until spend visibility, ownership, and billing responsibility begin to drift. At that point, finance and ops leads need a single workflow for:

- tracking team expenses in one place
- understanding current spend quickly
- reviewing category trends and exceptions
- keeping billing access and workspace roles aligned

## Product Direction

I intentionally did not build a generic personal budgeting app. The goal was a compact spend operations surface for teams: dashboard visibility, expense review, analytics, role-aware team management, and billing reliability.

## Reviewer Path

If you are reviewing the deployed product, use this path:

1. Open [https://v0-spend-scope.vercel.app/login](https://v0-spend-scope.vercel.app/login)
2. Click `Explore Demo Workspace`
3. Enter the seeded `DemoCorp` workspace as `Alex Johnson`
4. Review `/dashboard`
5. Review `/dashboard/expenses`
6. Review `/dashboard/analytics`
7. Review `/dashboard/team`
8. Review `/dashboard/billing`

## What I Focused On

### 1. Trustworthy product behavior

- clear onboarding and truthful signup flow
- explicit error states instead of silent empty data
- role-aware team and billing surfaces
- notifications simplified to honest inbox behavior

### 2. Production-minded full-stack decisions

- tenant context resolved server-side from database state
- privileged actions enforced on the server boundary
- cache invalidation after mutations to keep dashboard and analytics views trustworthy
- Stripe checkout, portal, and webhook handling with idempotency controls

### 3. Reviewability and portfolio quality

- deterministic demo seeding
- benchmark notes for dashboard responsiveness
- strict TypeScript, lint, test, and build gates
- public screenshots and a reviewer path that reduces friction

## Technical Highlights

- Next.js 16 App Router
- React 19
- TypeScript with strict mode
- Prisma + PostgreSQL
- NextAuth v5
- Tailwind CSS 4 + shadcn/ui
- Jest + Playwright
- Stripe integration

## Key Engineering Decisions

### Server-side tenant resolution

I resolved tenant membership from database state rather than trusting token-only company context. That avoided stale-session edge cases and kept protected routes and actions aligned with the current company assignment.

### Explicit state handling in high-trust flows

Team and expenses routes were hardened to surface real failure states instead of defaulting to empty or zero data. For a spend-management product, false emptiness is worse than a visible error.

### Deterministic demo and proof strategy

I treated the live deployment as the first proof surface and the repository as the technical deep dive. The seeded walkthrough and benchmark notes were added to make review reproducible rather than purely presentational.

## Outcome

The result is a portfolio-grade product that demonstrates more than CRUD:

- role-aware full-stack workflows
- finance-oriented product thinking
- practical error-state honesty
- billing and webhook hardening
- maintainable enough structure for a serious portfolio piece

## What I Would Improve Next

- further split a few oversized action and state modules
- standardize the remaining operational logging paths
- add a stronger approval or policy-exception workflow if the product were extended further
