-- Fix referrals status constraint to include 'converted'
ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_status_check
    CHECK (status IN ('pending', 'signed_up', 'paid', 'rewarded', 'converted'));

-- Ensure columns added in 20260326130000 exist (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS post_trial_discount_percent INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS eligible_lifetime_basic BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS new_users_only BOOLEAN NOT NULL DEFAULT false;

-- Replace apply_referral_benefits with the 3-param version (idempotent)
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
  SELECT id INTO v_new_profile_id
  FROM profiles
  WHERE user_id = p_new_user_id;

  IF v_new_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM referrals WHERE referred_profile_id = v_new_profile_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_applied');
  END IF;

  v_code_upper := UPPER(TRIM(p_referral_code));

  SELECT id INTO v_referrer_profile_id
  FROM profiles
  WHERE LOWER(referral_code) = LOWER(TRIM(p_referral_code))
  LIMIT 1;

  IF v_referrer_profile_id IS NOT NULL THEN
    -- Step 1: Update referred user's profile
    UPDATE profiles SET
      referred_by_profile_id = v_referrer_profile_id,
      promo_code_used        = TRIM(p_referral_code),
      subscription_tier      = 'professional',
      subscription_status    = 'active',
      trial_ends_at          = NOW() + INTERVAL '30 days',
      trial_source           = 'referral'
    WHERE id = v_new_profile_id
      AND referred_by_profile_id IS NULL;

    -- Step 2: Record referral row (wrapped so a failure here doesn't roll back step 1)
    BEGIN
      INSERT INTO referrals (
        referrer_profile_id, referred_profile_id, referral_code,
        status, converted_at, reward_credit
      ) VALUES (
        v_referrer_profile_id, v_new_profile_id, TRIM(p_referral_code),
        'converted', NOW(), 50
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[apply_referral_benefits] referrals insert failed: %', SQLERRM;
    END;

    -- Step 3: Credit the referrer
    UPDATE profiles SET
      referral_credit = COALESCE(referral_credit, 0) + 50
    WHERE id = v_referrer_profile_id;

    RETURN jsonb_build_object('success', true, 'type', 'referral');
  END IF;

  SELECT id, code_type, label, code, free_months, max_uses, current_uses,
         discount_percent, expiration_date, new_users_only
    INTO v_promo_id, v_promo_type, v_promo_label, v_promo_code_val, v_free_months,
         v_max_uses, v_current_uses, v_discount_percent, v_expiration_date, v_new_users_only
  FROM promo_codes
  WHERE LOWER(code) = LOWER(TRIM(p_referral_code))
    AND is_active = true
  LIMIT 1;

  IF v_promo_id IS NOT NULL THEN
    IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
      RETURN jsonb_build_object('success', false, 'error', 'max_uses_reached');
    END IF;
    IF v_expiration_date IS NOT NULL AND v_expiration_date < CURRENT_DATE THEN
      RETURN jsonb_build_object('success', false, 'error', 'code_expired');
    END IF;
    IF v_new_users_only = true AND (
      SELECT promo_code_used FROM profiles WHERE id = v_new_profile_id
    ) IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'new_users_only');
    END IF;

    v_free_months := COALESCE(v_free_months, 1);
    v_trial_start := COALESCE(p_academy_start_date, NOW());

    IF v_code_upper = 'ACADEMY' THEN
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
    RETURN jsonb_build_object('success', true, 'type', 'promo', 'code', v_code_upper, 'free_months', v_free_months);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
END;
$$;

-- Replace handle_new_user with a safe version that never fails user creation
-- even if referral/promo code processing encounters an error
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
  v_result JSONB;
BEGIN
  -- 1. Create profile row
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

  -- 2. Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- 3. Apply referral/promo benefits if a code was provided
  --    Wrapped in EXCEPTION so a bad code never blocks user creation
  v_referral_code := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), '');
  IF v_referral_code IS NOT NULL THEN
    BEGIN
      v_result := public.apply_referral_benefits(NEW.id, v_referral_code);
      RAISE LOG '[handle_new_user] apply_referral_benefits result for %: %', NEW.id, v_result;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[handle_new_user] apply_referral_benefits error for user %, code "%": %', NEW.id, v_referral_code, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
