# Stripe Webhook Setup (Test Mode)

This guide follows Stripe's recommended webhook verification model:
1. use endpoint-specific `whsec_...` signing secrets
2. verify signatures on raw request payload
3. use Stripe CLI for local forwarding

## 1. Local Development (Recommended)

### Start local app

```bash
npm run dev
```

### Start Stripe webhook forwarding

```bash
npm run stripe:listen
```

This forwards Stripe events to:

`http://localhost:3000/api/stripe/webhooks`

### Get local webhook signing secret

Option A:
1. Copy `whsec_...` from `stripe:listen` terminal output.

Option B:

```bash
npm run stripe:listen:secret
```

Then set:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Trigger a test event

```bash
npm run stripe:trigger:checkout
```

## 2. Deployed Environment (Test Mode)

1. In Stripe Dashboard (test mode), open `Developers -> Webhooks`.
2. Create/select endpoint:
   - `https://your-domain.com/api/stripe/webhooks`
3. Reveal signing secret and copy the `whsec_...` value.
4. Set deployed environment variable:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Important:
1. Dashboard endpoint secret and CLI secret are different contexts.
2. Use Dashboard secret for deployed webhook endpoint.
3. Use CLI secret for local forwarded endpoint.

## 3. Required Env Shape (Billing Enabled)

```env
NEXT_PUBLIC_ENABLE_BILLING="true"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
ALLOW_LIVE_STRIPE_KEYS="false"
```

## 4. Verification Commands

```bash
npm run deploy:check
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
```
