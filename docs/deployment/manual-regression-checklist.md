# Manual Regression Checklist

Run this checklist after a preview or production deployment.

## 1. Authentication

- Open `/login`.
- Sign in with Google.
- Sign out, then sign in with GitHub.
- Confirm successful redirect to `/dashboard`.

## 2. Onboarding and Company Access

- Create a new account and complete onboarding.
- Create a company.
- Confirm creator role is `ADMIN`.
- Confirm `/dashboard/team` is accessible for the creator.

## 3. Expenses Flow

- Create a new expense with category and date.
- Edit the expense and save.
- Delete the expense.
- Confirm table, summary cards, and usage counters refresh correctly.

## 4. Analytics

- Open `/dashboard/analytics`.
- Switch periods (30/90/180 days).
- Confirm chart labels and scale render correctly.
- Confirm no visual flicker during period changes.

## 5. Billing and Entitlements

- Open `/dashboard/billing`.
- Start checkout for Pro plan.
- Open billing portal from the app.
- Return to app and confirm plan state sync.
- Validate feature gating for Free vs Pro (analytics/csv/team limits).

## 6. Team and Notifications

- Invite a member.
- Change member role.
- Confirm notifications show human-readable messages.
- Confirm notification badge and read/delete actions work.

## 7. Final Health Checks

- Confirm no blocking console errors on landing and dashboard.
- Confirm core routes return 200 and load within acceptable time.
- Re-run quality gates locally before merge:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm test -- --runInBand`
  - `npm run build`
