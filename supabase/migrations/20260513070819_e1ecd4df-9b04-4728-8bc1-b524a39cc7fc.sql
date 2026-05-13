-- Add billing_period: monthly, yearly, or one_time
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'yearly', 'one_time'));

ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT
    CHECK (subscription_tier IN ('lite', 'professional', 'master'));

ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS ls_variant_id_test TEXT,
  ADD COLUMN IF NOT EXISTS ls_variant_id_live TEXT;

UPDATE public.pricing_plans SET subscription_tier = 'lite',         billing_period = 'monthly'  WHERE slug = 'starter';
UPDATE public.pricing_plans SET subscription_tier = 'lite',         billing_period = 'monthly'  WHERE slug = 'pro';
UPDATE public.pricing_plans SET subscription_tier = 'professional', billing_period = 'monthly'  WHERE slug = 'elite';
UPDATE public.pricing_plans SET subscription_tier = 'master',       billing_period = 'monthly'  WHERE slug = 'master';
UPDATE public.pricing_plans SET subscription_tier = 'master',       billing_period = 'yearly'   WHERE slug = 'vip-3year';