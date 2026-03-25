
-- Add trial tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_source text DEFAULT NULL;

-- Update handle_new_user to set 14-day trial on Elite (professional) tier by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, studio_name, subscription_tier, subscription_status, trial_ends_at, trial_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'studio_name', ''),
    'professional',
    'trial',
    NOW() + INTERVAL '14 days',
    'default_14d'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Update apply_referral_benefits to handle each coupon type with correct trial periods
CREATE OR REPLACE FUNCTION public.apply_referral_benefits(p_new_user_id uuid, p_referral_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_new_profile_id      UUID;
  v_referrer_profile_id UUID;
  v_promo_id            UUID;
  v_promo_type          TEXT;
  v_promo_label         TEXT;
  v_promo_code_val      TEXT;
  v_free_months         INTEGER;
  v_max_uses            INTEGER;
  v_current_uses        INTEGER;
  v_discount_percent    INTEGER;
  v_code_upper          TEXT;
BEGIN
  -- 1. Resolve new user's profile
  SELECT id INTO v_new_profile_id
  FROM profiles
  WHERE user_id = p_new_user_id;

  IF v_new_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  -- 2. Idempotency guard
  IF EXISTS (
    SELECT 1 FROM referrals WHERE referred_profile_id = v_new_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_applied');
  END IF;

  v_code_upper := UPPER(TRIM(p_referral_code));

  -- 3a. Check artist referral code first
  SELECT id INTO v_referrer_profile_id
  FROM profiles
  WHERE LOWER(referral_code) = LOWER(TRIM(p_referral_code))
  LIMIT 1;

  IF v_referrer_profile_id IS NOT NULL THEN
    -- Referral: 1 free month on Elite
    UPDATE profiles SET
      referred_by_profile_id = v_referrer_profile_id,
      promo_code_used        = TRIM(p_referral_code),
      subscription_tier      = 'professional',
      subscription_status    = 'active',
      trial_ends_at          = NOW() + INTERVAL '30 days',
      trial_source           = 'referral'
    WHERE id = v_new_profile_id
      AND referred_by_profile_id IS NULL;

    INSERT INTO referrals (
      referrer_profile_id, referred_profile_id, referral_code,
      status, converted_at, reward_credit
    ) VALUES (
      v_referrer_profile_id, v_new_profile_id, TRIM(p_referral_code),
      'converted', NOW(), 50
    );

    UPDATE profiles SET
      referral_credit = COALESCE(referral_credit, 0) + 50
    WHERE id = v_referrer_profile_id;

    RETURN jsonb_build_object('success', true, 'type', 'referral');
  END IF;

  -- 3b. Check promo code
  SELECT id, code_type, label, code, free_months, max_uses, current_uses, discount_percent
    INTO v_promo_id, v_promo_type, v_promo_label, v_promo_code_val, v_free_months, v_max_uses, v_current_uses, v_discount_percent
  FROM promo_codes
  WHERE LOWER(code) = LOWER(TRIM(p_referral_code))
    AND is_active = true
  LIMIT 1;

  IF v_promo_id IS NOT NULL THEN
    IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
      RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
    END IF;

    v_free_months := COALESCE(v_free_months, 1);

    -- Determine trial_source and trial_ends_at based on specific coupon codes
    IF v_code_upper = 'ACADEMY' THEN
      -- ACADEMY: 3 free months on Elite, then 50% off first month
      UPDATE profiles SET
        promo_code_used     = TRIM(p_referral_code),
        promo_tag           = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier   = 'professional',
        subscription_status = 'active',
        trial_ends_at       = NOW() + INTERVAL '3 months',
        trial_source        = 'academy_3m'
      WHERE id = v_new_profile_id;

    ELSIF v_code_upper = 'GRADUATE' THEN
      -- GRADUATE: 30-day free + 50% off first month
      UPDATE profiles SET
        promo_code_used     = TRIM(p_referral_code),
        promo_tag           = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier   = 'professional',
        subscription_status = 'active',
        trial_ends_at       = NOW() + INTERVAL '30 days',
        trial_source        = 'graduate_30d'
      WHERE id = v_new_profile_id;

    ELSIF v_code_upper = 'INFLUENCERS' THEN
      -- INFLUENCERS: 30-day free, then full Elite price
      UPDATE profiles SET
        promo_code_used     = TRIM(p_referral_code),
        promo_tag           = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier   = 'professional',
        subscription_status = 'active',
        trial_ends_at       = NOW() + INTERVAL '30 days',
        trial_source        = 'influencer_30d'
      WHERE id = v_new_profile_id;

    ELSE
      -- Generic promo code
      UPDATE profiles SET
        promo_code_used     = TRIM(p_referral_code),
        promo_tag           = (v_promo_type || '_' || COALESCE(v_promo_label, v_promo_code_val)),
        subscription_tier   = 'professional',
        subscription_status = CASE WHEN v_free_months > 0 THEN 'active' ELSE subscription_status END,
        trial_ends_at       = CASE WHEN v_free_months > 0 THEN NOW() + (v_free_months || ' months')::INTERVAL ELSE trial_ends_at END,
        trial_source        = 'promo_' || v_promo_code_val
      WHERE id = v_new_profile_id;
    END IF;

    UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo_id;

    RETURN jsonb_build_object('success', true, 'type', 'academy', 'code', v_code_upper, 'free_months', v_free_months);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
END;
$$;
