# SpendScope

SpendScope is a production-oriented expense management platform for teams that need clear spend visibility, policy-aware controls, and reliable billing operations.

## Why SpendScope

- Multi-tenant company data isolation
- Role-based access (admin/member)
- Expense workflows with filtering, sorting, bulk actions, and CSV export
- Analytics dashboards and trend visualization
- Plan-based entitlements (Free vs Pro)
- Stripe checkout, billing portal, and webhook synchronization
- Team notifications for billing and collaboration events

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

## Environment Variables

Use `.env.example` as the source of truth.

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

## Scripts

### Development

```bash
npm run dev
npm run build
npm run start
```

### Quality Gates

```bash
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

## CI Workflows

- `CI` (`.github/workflows/ci.yml`): policy checks, typecheck, lint, audit, explicit-`any` gate, tests, and build
- `E2E (Playwright)` (`.github/workflows/e2e.yml`): manual browser workflow
- `Deploy Smoke Checks` (`.github/workflows/deploy-smoke.yml`): manual post-deploy smoke checks

## Deployment Notes

- Vercel preview deployments run automatically for pushed branches if Git integration is enabled.
- If you want deployment only from `master`, configure Vercel ignored-build or production-branch policy.

## Project Docs

- Architecture: `ARCHITECTURE.md`
- Engineering standards: `AGENTS.md`
- Stripe webhook setup: `docs/deployment/stripe-webhook-setup.md`
- Deployment checklist: `docs/deployment/test-mode-checklist.md`
- Commit workflow: `docs/commands/commit.md`

## Contributing

See `CONTRIBUTING.md` for development workflow, quality gates, and pull request expectations.

## Security

See `SECURITY.md` for vulnerability reporting and handling.

## Merge Readiness

A branch is merge-ready only when all of these pass:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run audit:prod`
- `npm run check:any`
- `npm run test:ci`
- `npm run build`

## License

No open-source license file is currently defined in this repository.
