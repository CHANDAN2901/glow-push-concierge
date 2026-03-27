
-- Update handle_new_user to call apply_referral_benefits when a promo/referral code is provided
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

  -- 3. If a referral/promo code was passed in signup metadata, apply benefits server-side
  v_referral_code := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), '');
  IF v_referral_code IS NOT NULL THEN
    v_result := public.apply_referral_benefits(NEW.id, v_referral_code);
    -- Log result for debugging (visible in Postgres logs)
    RAISE LOG '[handle_new_user] apply_referral_benefits result for %: %', NEW.id, v_result;
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
