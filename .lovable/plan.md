## Two problems

**1. "Continue" → error page**
The edge function sends LS to `https://app.glowpush.co.il/payment-success?...`, but no `/payment-success` route exists in `src/App.tsx`. So the redirect lands on a 404/blank page — that's the error you're seeing.

**2. Plan not upgraded**
I checked the `lemonsqueezy-webhook` logs — **zero invocations**. Lemon Squeezy never called our webhook, which is why your tier didn't change. This means either:
- The webhook URL is not registered in **LS Test mode → Settings → Webhooks**, or
- It's registered but signature verification is silently rejected (would still produce logs, so most likely it's just not registered for Test mode).

## Plan

### Step 1 — Add the `/payment-success` page
Create `src/pages/PaymentSuccess.tsx`:
- Reads `?plan=...` from URL
- Polls the user's `profiles.subscription_tier` every ~2s for up to ~30s waiting for the webhook to upgrade them
- Shows a success state ("Your plan is now active") once tier matches, or a "still processing" message with a manual refresh + support note if it times out
- Invalidates the `user-tier` and `tier-feature-keys` React Query keys on success
- Gold styling consistent with `PaymentHistory.tsx`

Register the route in `src/App.tsx` inside the authenticated section.

### Step 2 — Fix the redirect domain
In `supabase/functions/create-lemonsqueezy-checkout/index.ts`, the redirect uses `APP_URL` env or hardcoded `https://app.glowpush.co.il`. Change the fallback to use the request's `Origin` header so test runs from the Lovable preview / published URL also work, instead of always sending users to `app.glowpush.co.il`.

### Step 3 — Verify webhook registration in Lemon Squeezy
Action for you (I can't do this from code):
1. Open **Lemon Squeezy → Test Mode → Settings → Webhooks**
2. Confirm a webhook exists with URL:
   `https://ohkvlgghqxxjtwqzwyvs.supabase.co/functions/v1/lemonsqueezy-webhook`
3. Subscribed events must include at least: `order_created`, `subscription_created`, `subscription_updated`, `subscription_renewed`, `subscription_cancelled`, `subscription_expired`
4. Copy its **signing secret** and confirm it matches the `LS_WEBHOOK_SECRET_TEST` you gave me. If you've rotated it, send me the new value and I'll update the secret.

Once registered, run another test purchase — webhook logs will appear and the tier will flip to `professional`/`master` automatically, and the new `/payment-success` page will detect it and show success.

### Step 4 — Verify
- After your next test checkout, I'll check `lemonsqueezy-webhook` logs and `profiles.subscription_tier` for your user to confirm the upgrade happened.

## Technical notes
- Webhook function already maps slugs correctly (`pro→lite`, `elite→professional`, `vip-3year`/`master→master`) and uses `LS_WEBHOOK_SECRET_TEST` / `_LIVE` based on `app_settings.ls_mode`.
- No DB migration needed.
- No changes to `lemonsqueezy-webhook` itself.