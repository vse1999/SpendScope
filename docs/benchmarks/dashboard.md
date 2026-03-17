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

## Latest Captured Run

- Date: `2026-03-17`
- Commit: `4bcb254`
- Dataset seed: `20260309`
- Target route: `/dashboard`
- Authenticated account: `E2E Member` in the seeded `SpendScope E2E` workspace

### Capture note

This workspace currently redirects in a loop when benchmarking an alternate local `next start` port because Auth.js is coupled to the trusted host configuration in this environment. The latest recorded numbers were therefore captured from the authenticated seeded review workspace on `http://localhost:3000`, using the same deterministic dataset and repeated navigation/reload runs documented below.

## Reproducible Setup

```bash
npm run seed:demo:reset
npm run seed:demo -- --seed=20260309 --reference-date=2026-03-01
npm run build
npm run start
```

## Measurement Method

1. Open a fresh browser profile.
2. Authenticate as `E2E Member` in the seeded `SpendScope E2E` workspace.
3. Navigate to `/dashboard` and capture first-load timing in browser network panel:
   - HTML document response time
   - Largest dashboard data request response time
4. Repeat first-load capture 5 times from clean tabs.
5. Capture warm-cache load 10 times in the same session.
6. Record median values.

## Results Table

| Date | Commit | Dataset Seed | First Load (Median ms) | Warm Load (Median ms) | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-03-17 | `4bcb254` | `20260309` | `360` | `271` | Captured on the authenticated local `SpendScope E2E` review workspace; largest dashboard data request median was `49ms` first load and `50ms` warm |

## Raw Navigation Runs

### First-load runs (5 new tabs)

| Run | Navigation Duration (ms) | Document Response End (ms) | DOM Content Loaded (ms) | Largest Dashboard Data Request (ms) |
| --- | --- | --- | --- | --- |
| 1 | 512 | 373 | 389 | 52 |
| 2 | 368 | 261 | 350 | 49 |
| 3 | 324 | 200 | 225 | 43 |
| 4 | 342 | 235 | 247 | 54 |
| 5 | 360 | 247 | 257 | 46 |

### Warm-load runs (10 reloads in the same session)

| Run | Navigation Duration (ms) | Document Response End (ms) | DOM Content Loaded (ms) | Largest Dashboard Data Request (ms) |
| --- | --- | --- | --- | --- |
| 1 | 269 | 221 | 255 | 43 |
| 2 | 276 | 225 | 262 | 62 |
| 3 | 275 | 215 | 255 | 53 |
| 4 | 261 | 214 | 246 | 51 |
| 5 | 300 | 242 | 279 | 56 |
| 6 | 254 | 206 | 238 | 46 |
| 7 | 272 | 223 | 256 | 45 |
| 8 | 279 | 233 | 259 | 55 |
| 9 | 262 | 203 | 234 | 38 |
| 10 | 256 | 208 | 242 | 48 |

## Interpretation Rules

- First-load regressions above 15% require investigation before release.
- Warm-load regressions above 10% require cache invalidation/read-model review.
- Any result entry must include commit SHA and explicit notes.
