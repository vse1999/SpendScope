# SpendScope Manual Regression Checklist

Use this checklist before release or after high-risk changes to auth, billing, tenancy, caching, or dashboard mutations.

## 1. Authentication and Route Guards

1. Unauthenticated visit to `/dashboard` redirects to `/login`.
2. Authenticated user can access dashboard routes.
3. Protected API route returns `401` when not authenticated.
4. Public auth routes remain accessible without session.

## 2. Tenant Isolation and RBAC

1. Member user cannot perform admin-only billing operations.
2. Member cannot mutate expenses outside their company scope.
3. Admin can perform allowed team and billing actions in their company.
4. Cross-tenant access attempts return unauthorized/not found behavior.

## 3. Expenses and Dashboard Consistency

1. Create expense updates table and dashboard totals.
2. Update expense reflects in list and aggregate cards.
3. Delete expense updates list and counters.
4. Bulk operations return consistent UI state for selected and affected rows.

## 4. Analytics and Caching

1. Analytics charts reflect recent writes after mutation.
2. Category changes refresh dashboard and analytics views.
3. Dashboard cards do not remain stale after create/update/delete flows.

## 5. Billing and Webhooks (Test Mode)

1. Checkout session creation works for admin and fails for member.
2. Billing portal opens for admin with active customer mapping.
3. Webhook endpoint accepts valid signed events.
4. Duplicate webhook event is ignored idempotently.
5. Subscription status updates are reflected in billing UI.

## 6. Notifications and Team Workflows

1. Team invitation create/accept flows work.
2. Role changes and member removal enforce authorization.
3. Billing-related notifications are delivered to expected users.

## 7. Operational Safety

1. Debug/test endpoints are disabled in deployed environment.
2. Billing reset controls are disabled in deployed environment.
3. `npm run deploy:check` passes with deployment environment values.

## 8. Required Quality Gates

Run all of the following in repository root:

```bash
npm run docs:check
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
```
