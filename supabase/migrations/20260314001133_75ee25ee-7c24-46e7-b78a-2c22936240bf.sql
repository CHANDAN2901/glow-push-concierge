ALTER TABLE public.pricing_plans 
  ADD COLUMN original_price_monthly numeric NOT NULL DEFAULT 0,
  ADD COLUMN original_price_usd numeric NOT NULL DEFAULT 0;