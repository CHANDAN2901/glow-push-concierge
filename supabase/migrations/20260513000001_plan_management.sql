-- Add billing_period: monthly, yearly, or one_time
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly', 'one_time'));

-- Soft hide: admin can deactivate plans without deleting
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Subscription tier this plan maps to (lite / professional / master)
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    CHECK (subscription_tier IN ('lite', 'professional', 'master'));

-- LS variant IDs per plan stored in DB so admin can set them from dashboard
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS ls_variant_id_test TEXT,
  ADD COLUMN IF NOT EXISTS ls_variant_id_live TEXT;

-- Seed known plans with their tier + billing_period
UPDATE public.pricing_plans SET subscription_tier = 'lite',         billing_period = 'monthly'  WHERE slug = 'starter';
UPDATE public.pricing_plans SET subscription_tier = 'lite',         billing_period = 'monthly'  WHERE slug = 'pro';
UPDATE public.pricing_plans SET subscription_tier = 'professional', billing_period = 'monthly'  WHERE slug = 'elite';
UPDATE public.pricing_plans SET subscription_tier = 'master',       billing_period = 'monthly'  WHERE slug = 'master';
UPDATE public.pricing_plans SET subscription_tier = 'master',       billing_period = 'yearly'   WHERE slug = 'vip-3year';
