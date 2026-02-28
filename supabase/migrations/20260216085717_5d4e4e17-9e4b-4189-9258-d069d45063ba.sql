
-- Create referrals table to track referral signups and rewards
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email TEXT,
  referred_profile_id UUID REFERENCES public.profiles(id),
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'paid', 'rewarded')),
  reward_credit NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Artists can view their own referrals
CREATE POLICY "Users can view own referrals"
ON public.referrals
FOR SELECT
USING (referrer_profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Artists can insert their own referrals
CREATE POLICY "Users can insert own referrals"
ON public.referrals
FOR INSERT
WITH CHECK (referrer_profile_id IN (
  SELECT id FROM profiles WHERE user_id = auth.uid()
));

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all referrals
CREATE POLICY "Admins can update all referrals"
ON public.referrals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code column to profiles for unique referral links
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_credit NUMERIC DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
