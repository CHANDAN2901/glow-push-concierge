-- Tranzilla payment integration: token storage + subscription tracking

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tranzilla_token TEXT,
  ADD COLUMN IF NOT EXISTS tranzilla_expiry TEXT,           -- "MMYY" format from Tranzilla
  ADD COLUMN IF NOT EXISTS tranzilla_plan_slug TEXT,        -- e.g. "professional" | "master"
  ADD COLUMN IF NOT EXISTS tranzilla_amount_agorot INTEGER, -- e.g. 7900 = ₪79
  ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_charge_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_charge_confirmation TEXT;   -- Tranzilla ConfirmationCode

-- Index for cron job: find subscriptions due for renewal
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end_date
  ON public.profiles (subscription_end_date)
  WHERE subscription_status = 'active' AND tranzilla_token IS NOT NULL;
