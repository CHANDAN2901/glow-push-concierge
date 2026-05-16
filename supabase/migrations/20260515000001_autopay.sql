-- Add autopay columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS autopay_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS charge_failure_count integer DEFAULT 0;

-- Add autopay variant columns to pricing_plans (for LemonSqueezy subscription variants)
ALTER TABLE pricing_plans
  ADD COLUMN IF NOT EXISTS ls_variant_id_autopay_test text,
  ADD COLUMN IF NOT EXISTS ls_variant_id_autopay_live text;
