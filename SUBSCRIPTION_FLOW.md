# GlowPush — Subscription & Trial Flow Reference

## Plans (DB `pricing_plans` table)

| Slug | Display Name | Price | Tier | Billing | Purpose |
|------|-------------|-------|------|---------|---------|
| `glow-trial` | Glow Push Trial | ₪2 | `master` | one_time | First-time trial activation — NOT shown on pricing page |
| `pro` | Glow Push Pro | ₪139/mo | `lite` | monthly | Basic paid tier |
| `elite` | Glow Push Elite | ₪157/mo | `professional` | monthly | Mid-tier (most popular) |
| `vip-3year` | Glow Push VIP | ₪999/yr | `master` | yearly | Top tier, all features, annual |

## Features Per Tier

| Feature | Pro `lite` | Elite `professional` | VIP `master` |
|---------|-----------|---------------------|-------------|
| clients | ✅ | ✅ | ✅ |
| calendar | ✅ | ✅ | ✅ |
| auto-messages | ✅ | ✅ | ✅ |
| aftercare | ✅ | ✅ | ✅ |
| healing_timeline | ✅ | ✅ | ✅ |
| health_declaration | ✅ | ✅ | ✅ |
| messages | ✅ | ✅ | ✅ |
| portfolio | ✅ | ✅ | ✅ |
| push_notifications | ✅ | ✅ | ✅ |
| before_after_collage | ✅ | ✅ | ✅ |
| shared_client_gallery | ✅ | ✅ | ✅ |
| ai_magic | ❌ | ✅ | ✅ |
| voice_notes | ❌ | ✅ | ✅ |
| daily_growth_engine | ❌ | ✅ | ✅ |
| digital_card | ❌ | ✅ | ✅ |
| bonus_center | ❌ | ✅ | ✅ |
| referrals | ❌ | ✅ | ✅ |
| whatsapp_automation | ❌ | ❌ | ✅ |
| white_label | ❌ | ❌ | ✅ |
| export_clients_csv | ❌ | ❌ | ✅ |
| priority_support | ❌ | ❌ | ✅ |

**During trial (`glow-trial`):** Artist gets `subscription_tier = 'master'` → all 21 features unlocked.

## Profile Subscription States (`profiles` table)

| `subscription_status` | `trial_ends_at` | Meaning |
|----------------------|-----------------|---------|
| `trial` | `NULL` | New user, has NOT yet paid ₪2 → show `TrialPaymentGate` |
| `trial` | future date | Paid ₪2, trial active → full access |
| `trial` | past (< 3 days ago) | Trial expired, in grace period → show `TrialExpiredBanner` |
| `trial` | past (≥ 3 days ago) | Trial + grace period expired → redirect to `/pricing` |
| `active` | any | Paid for a full plan → full access based on tier |
| `past_due` | any | Payment failed → treat same as active until 3 failures |
| `cancelled` | future date | Cancelled but access until `subscription_end_date` |

## Access Logic (ArtistDashboard.tsx)

```typescript
const GRACE_MS = 3 * 86_400_000; // 3 days
const trialEnd = trialEndsAt ? new Date(trialEndsAt).getTime() : null;

needsTrialPayment = profileFetched && !trialEnd && subscriptionStatus !== 'active'
trialActive       = !!trialEnd && trialEnd > Date.now()
inGracePeriod     = !!trialEnd && trialEnd <= Date.now() && (trialEnd + GRACE_MS) > Date.now()
isPaidUser        = subscriptionStatus === 'active'
hardBlocked       = profileFetched && !!trialEnd && (trialEnd + GRACE_MS) <= Date.now() && !isPaidUser
```

## Payment Slugs & Webhook Routing

### `glow-trial` (₪2, one-time)
- Webhook sets: `subscription_status = 'trial'`, `subscription_tier = 'master'`, `trial_ends_at = NOW() + 30 days`
- No autopay, no token saved

### `pro`, `elite`, `vip-3year` (full subscriptions)
- Webhook sets: `subscription_status = 'active'`, `subscription_tier = <tier>`, `subscription_end_date = NOW() + 1 month`
- Autopay supported via Tranzilla token (VK mode)

## UI Components

| Component | Shown When | File |
|-----------|-----------|------|
| `TrialPaymentGate` | `needsTrialPayment = true` | `src/components/TrialPaymentGate.tsx` |
| `TrialExpiredBanner` | `inGracePeriod = true` | `src/components/TrialExpiredBanner.tsx` |
| Redirect to `/pricing` | `hardBlocked = true` | `ArtistDashboard.tsx` useEffect |

## Pricing Page Visibility

| Page | Shows `glow-trial`? | Shows `pro`? | Shows `elite`? | Shows `vip-3year`? |
|------|--------------------|--------------|-----------------|--------------------|
| `/` (Marketing) | ❌ | ❌ | ✅ | ✅ |
| `/pricing` | ❌ | ✅ (at ₪139) | ✅ | ✅ |
| `TrialPaymentGate` | ✅ (only this) | ❌ | ❌ | ❌ |

## Coupons

Coupons are validated (exists, active, not expired, under max_uses) and stored as `promo_tag` on the profile for analytics. They **do not** grant free dashboard access or bypass the ₪2 trial requirement.

## Payment Providers

- **Tranzilla**: Israeli credit cards — `create-payment-session` edge function → iframe
- **LemonSqueezy**: International / PayPal — `create-lemonsqueezy-checkout` edge function → checkout URL

Both are available on `TrialPaymentGate` and on the `/pricing` page.
