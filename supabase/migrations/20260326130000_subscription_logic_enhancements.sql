
-- Add new_users_only to promo_codes (prevents existing users from reusing promos)
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS new_users_only BOOLEAN NOT NULL DEFAULT false;

-- Add post-trial intent flags to profiles (used when payment is wired)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS post_trial_discount_percent INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS eligible_lifetime_basic BOOLEAN NOT NULL DEFAULT false;

-- Update apply_referral_benefits:
--   • Accept optional p_academy_start_date (trial begins from study start, not signup)
--   • Validate expiration_date on promo codes
--   • Enforce new_users_only flag
--   • Set post_trial_discount_percent for ACADEMY (50%) and GRADUATE (50%)
--   • Set eligible_lifetime_basic = true for ACADEMY / GRADUATE / INFLUENCERS
CREATE OR REPLACE FUNCTION public.apply_referral_benefits(
  p_new_user_id        uuid,
  p_referral_code      text,
  p_academy_start_date timestamp with time zone DEFAULT NULL
)
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
  v_expiration_date     DATE;
  v_new_users_only      BOOLEAN;
  v_code_upper          TEXT;
  v_trial_start         TIMESTAMP WITH TIME ZONE;
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
  SELECT id, code_type, label, code, free_months, max_uses, current_uses,
         discount_percent, expiration_date, new_users_only
    INTO v_promo_id, v_promo_type, v_promo_label, v_promo_code_val, v_free_months,
         v_max_uses, v_current_uses, v_discount_percent, v_expiration_date, v_new_users_only
  FROM promo_codes
  WHERE LOWER(code) = LOWER(TRIM(p_referral_code))
    AND is_active = true
  LIMIT 1;

  IF v_promo_id IS NOT NULL THEN
    -- Check max uses
    IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
      RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
    END IF;

    -- Check expiration date
    IF v_expiration_date IS NOT NULL AND v_expiration_date < CURRENT_DATE THEN
      RETURN jsonb_build_object('success', false, 'error', 'code_expired');
    END IF;

    -- Check new_users_only: user must not have previously used any promo
    IF v_new_users_only = true AND (
      SELECT promo_code_used FROM profiles WHERE id = v_new_profile_id
    ) IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'new_users_only');
    END IF;

    v_free_months  := COALESCE(v_free_months, 1);
    -- For ACADEMY: use supplied study start date if provided, else NOW()
    v_trial_start  := COALESCE(p_academy_start_date, NOW());

    IF v_code_upper = 'ACADEMY' THEN
      -- 3 months free from study start, then 50% off first paid month
      UPDATE profiles SET
        promo_code_used             = TRIM(p_referral_code),
        promo_tag                   = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier           = 'professional',
        subscription_status         = 'active',
        trial_ends_at               = v_trial_start + INTERVAL '3 months',
        trial_source                = 'academy_3m',
        post_trial_discount_percent = 50,
        eligible_lifetime_basic     = true
      WHERE id = v_new_profile_id;

    ELSIF v_code_upper = 'GRADUATE' THEN
      -- 30-day free trial, then 50% off first paid month
      UPDATE profiles SET
        promo_code_used             = TRIM(p_referral_code),
        promo_tag                   = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier           = 'professional',
        subscription_status         = 'active',
        trial_ends_at               = NOW() + INTERVAL '30 days',
        trial_source                = 'graduate_30d',
        post_trial_discount_percent = 50,
        eligible_lifetime_basic     = true
      WHERE id = v_new_profile_id;

    ELSIF v_code_upper = 'INFLUENCERS' THEN
      -- 30-day free trial, then full Elite price; eligible for Basic lifetime offer
      UPDATE profiles SET
        promo_code_used             = TRIM(p_referral_code),
        promo_tag                   = 'academy_' || COALESCE(v_promo_label, v_promo_code_val),
        subscription_tier           = 'professional',
        subscription_status         = 'active',
        trial_ends_at               = NOW() + INTERVAL '30 days',
        trial_source                = 'influencer_30d',
        post_trial_discount_percent = NULL,
        eligible_lifetime_basic     = true
      WHERE id = v_new_profile_id;

    ELSE
      -- Generic promo code: use free_months + discount_percent from DB
      UPDATE profiles SET
        promo_code_used             = TRIM(p_referral_code),
        promo_tag                   = (v_promo_type || '_' || COALESCE(v_promo_label, v_promo_code_val)),
        subscription_tier           = 'professional',
        subscription_status         = CASE WHEN v_free_months > 0 THEN 'active' ELSE subscription_status END,
        trial_ends_at               = CASE WHEN v_free_months > 0 THEN NOW() + (v_free_months || ' months')::INTERVAL ELSE trial_ends_at END,
        trial_source                = 'promo_' || v_promo_code_val,
        post_trial_discount_percent = CASE WHEN v_discount_percent > 0 THEN v_discount_percent ELSE NULL END
      WHERE id = v_new_profile_id;
    END IF;

    UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo_id;

    RETURN jsonb_build_object('success', true, 'type', 'academy', 'code', v_code_upper, 'free_months', v_free_months);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
END;
$$;
