# Dashboard Benchmark Protocol

This document defines the reproducible benchmark process for the first dashboard load path and warm-cache behavior.

## Objective

- Measure dashboard responsiveness and consistency under a deterministic demo dataset.
- Track improvements with explicit method and environment context.

## Environment Contract

- Node.js 20.x
- Local production build (`npm run build && npm run start`)
- Demo data reset and seed performed before each run
- No background profiling tools attached

## Reproducible Setup

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
npm run build
npm run start
```

## Measurement Method

1. Open a fresh browser profile.
2. Authenticate as seeded DemoCorp admin user.
3. Navigate to `/dashboard` and capture first-load timing in browser network panel:
   - HTML document response time
   - Largest dashboard data request response time
4. Repeat first-load capture 5 times from clean tabs.
5. Capture warm-cache load 10 times in the same session.
6. Record median values.

## Results Table

| Date | Commit | Dataset Seed | First Load (Median ms) | Warm Load (Median ms) | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-03-09 | pending | `20260309` | pending | pending | Protocol added; capture on next benchmark pass |

## Interpretation Rules

- First-load regressions above 15% require investigation before release.
- Warm-load regressions above 10% require cache invalidation/read-model review.
- Any result entry must include commit SHA and explicit notes.
