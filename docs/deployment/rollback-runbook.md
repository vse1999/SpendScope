# Deployment Rollback Runbook

Use this runbook for high-risk regressions involving auth, tenancy, billing, or dashboard read-model consistency.

## Trigger Conditions

- Elevated error rate on protected routes
- Billing checkout or portal failures after deployment
- Webhook processing failures or duplicate side effects
- Tenant data visibility or authorization anomalies

## Immediate Actions

1. Freeze further deploys.
2. Identify the latest known-good commit in production.
3. Roll back to the known-good deployment target.
4. Re-run smoke checks after rollback.

## Validation After Rollback

```bash
npm run smoke:deploy
npm run deploy:check
```

## Required Functional Checks

1. Login and protected route access.
2. Tenant-scoped dashboard reads.
3. Expense create/update/delete consistency.
4. Admin billing checkout and portal access.
5. Stripe webhook idempotency behavior.

## Incident Capture

- Record failed commit SHA, rollback SHA, timestamps, and impact scope.
- Document root cause, containment steps, and permanent fix plan before next deploy.
