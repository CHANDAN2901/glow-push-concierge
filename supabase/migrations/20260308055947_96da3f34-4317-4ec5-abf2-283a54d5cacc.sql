
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS free_months integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expiration_date date DEFAULT NULL;
