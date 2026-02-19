# SpendScope

SpendScope is a Next.js 16 expense platform with multi-tenant workflows, role-aware access, Stripe billing, and AI-assisted expense review.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript (`strict: true`)
- Prisma + PostgreSQL (Neon)
- NextAuth v5
- Tailwind CSS 4 + shadcn/ui
- Jest + ts-jest
- Playwright (baseline E2E scaffold)

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL connection string (for Prisma)

## Local Setup

1. Install dependencies:

```bash
npm ci
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Generate Prisma client (also runs automatically on install):

```bash
npx prisma generate
```

4. Run development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality Gates

Run these before opening a PR:

```bash
npx tsc --noEmit
npm run lint
npm run check:any
npm test -- --runInBand
npm run build
```

Notes:
- `npm run check:any` blocks new explicit `any` usage outside the current allowlist.
- `npm run test:ci` is the CI coverage run (`jest --runInBand --coverage`).

## Testing

Unit/integration tests:

```bash
npm test -- --runInBand
```

Coverage:

```bash
npm run test:coverage
```

E2E baseline:

```bash
npm run test:e2e
```

Quick E2E config validation (no browser run):

```bash
npm run test:e2e:list
```

## Deployment Safety

Run policy and secret checks before deployment:

```bash
npm run deploy:check
```

Run post-deploy smoke checks:

```bash
npm run smoke:deploy
```

## CI Workflows

- `CI`: typecheck, lint, explicit-any regression check, tests with coverage, build, coverage artifact upload.
- `Deploy Smoke Checks`: manual workflow for deployed environment checks.
- `E2E (Playwright)`: manual workflow for Playwright browser tests.

## Stripe Helpers

```bash
npm run stripe:listen
npm run stripe:listen:secret
npm run stripe:trigger:checkout
```
