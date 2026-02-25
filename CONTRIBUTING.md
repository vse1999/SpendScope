# Contributing to SpendScope

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL database

## Local Setup

```bash
npm ci
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev
npm run dev
```

## Engineering Rules

- Follow `AGENTS.md` standards.
- Keep changes scoped and reversible.
- Do not weaken type/lint rules to pass checks.
- Do not commit secrets or environment files.

## Required Quality Gates

Run before opening a PR:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
```

Recommended additional checks:

```bash
npm run audit:prod
npm run check:any
```

## Pull Request Expectations

1. Keep commits atomic and logically grouped.
2. Include a clear PR summary:
   - problem
   - solution
   - risk
   - verification steps
3. Reference impacted areas (`app/`, `components/`, `lib/`, `prisma/`) explicitly.
4. Update docs when behavior, setup, or operations change.

## Testing Expectations

- Add/update tests for behavior changes.
- Cover critical paths for auth, permissions, billing, and data integrity.
- Keep tests deterministic.

## Commit Guidance

- If using the slash workflow, follow `docs/commands/commit.md`.
- Keep subject lines concise and imperative.
- Avoid mixed-purpose commits.
