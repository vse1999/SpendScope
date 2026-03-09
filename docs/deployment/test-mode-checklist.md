# SpendScope Deployment Checklist (Stripe Test Mode)

Use this checklist in order.  
Goal: deploy safely, keep Stripe in test mode, and avoid debug/security mistakes.

## 1. Pre-Deploy Lockdown (Required)

Set these environment variables in your deployment platform before first deploy:

```env
# App/Auth
NEXTAUTH_URL="https://your-deployed-domain.com"
APP_URL="https://your-deployed-domain.com"
NEXTAUTH_SECRET="your-strong-random-secret"
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Billing feature toggle
NEXT_PUBLIC_ENABLE_BILLING="true"   # use "false" if you want billing hidden

# Stripe (TEST MODE ONLY)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # from Stripe test webhook endpoint
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
STRIPE_PRO_YEARLY_PRICE_ID="price_..."

# Stripe safety fuse (must remain false for project/demo)
ALLOW_LIVE_STRIPE_KEYS="false"

# Disable debug/test backdoors on deployed app
ENABLE_TEST_ENDPOINTS="false"
E2E_LOGIN_BYPASS="false"
ALLOW_BILLING_RESET="false"
NEXT_PUBLIC_ALLOW_BILLING_RESET="false"

# Reliability/monitoring
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
SENTRY_ENABLED="true"
NEXT_PUBLIC_SENTRY_ENABLED="true"
SENTRY_SEND_DEFAULT_PII="false"
```

## 2. Critical Sanity Checks Before Deploy

1. Confirm Stripe keys are test keys (`sk_test_`, `pk_test_`).
2. Confirm `ALLOW_LIVE_STRIPE_KEYS=false`.
3. Confirm debug/test flags are all `false`.
4. Confirm OAuth redirect URIs in Google/GitHub include deployed domain callbacks.

## 3. Build Gates (Must Pass)

Run in repo root:

```bash
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
```

Do not deploy if any command fails.

Also run deployment policy checks:

```bash
npm run deploy:check
```

This enforces:
1. required auth env vars
2. Stripe test/live safety rules
3. debug/test flags disabled
4. tracked-file secret leak scan

## 4. Deploy

1. Deploy current main branch.
2. Verify app boots and login page loads on deployed URL.
3. Verify `/dashboard` requires authentication.

## 5. Stripe Test-Mode Verification (Post-Deploy)

1. Start Stripe test checkout from `/dashboard/billing`.
2. Complete payment with a Stripe test card.
3. Confirm webhook hits `/api/stripe/webhooks` successfully.
4. Confirm plan updates to Pro in UI.
5. Open billing portal and verify it loads.
6. Confirm duplicate checkout prevention returns conflict instead of creating another active subscription.
7. Follow `docs/deployment/stripe-webhook-setup.md` for local/deployed secret handling if needed.

## 6. Security/Debug Verification (Post-Deploy)

1. Confirm `/api/test-login` is not usable.
2. Confirm `/api/test-logout` is not usable.
3. Confirm `/api/rate-limit-test` is not exposed unless intentionally enabled.
4. Confirm billing reset control is not visible for normal deployment.

## 7. Core Product Smoke Tests

1. Login/logout flow.
2. Add/edit/delete expense.
3. Expenses filters + sort + load more.
4. Team invite flow.
5. Settings page shows company name (not company ID).

## 8. Rollback Rule

Rollback immediately if any of these happen:

1. Auth failures on deployed domain.
2. Billing shows live-mode behavior.
3. Stripe webhook failures for test payments.
4. Debug/test endpoints respond in deployed environment.

Rollback method:
1. Revert to previous stable deployment.
2. Re-check env flags from Section 1.
3. Re-run Section 3 gates before redeploy.

## 9. What Is Intentionally Not Needed

For this project delivery, these are overkill:

1. Stripe live activation/go-live checklist.
2. Real-money reconciliation workflows.
3. Full enterprise compliance controls.

This deployment is valid as a production-grade project demo with Stripe in test mode.
