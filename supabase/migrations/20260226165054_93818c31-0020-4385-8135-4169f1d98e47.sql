
-- Academy/School coupon codes table
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  code_type TEXT NOT NULL DEFAULT 'academy' CHECK (code_type IN ('academy', 'company', 'coupon')),
  label TEXT NOT NULL DEFAULT '',
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow anyone to read active promo codes (for validation)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add promo attribution columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by_profile_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_code_used TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promo_tag TEXT DEFAULT NULL;
