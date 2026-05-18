-- Migration: Remove auto-granted 14-day trial on signup.
-- New users now start with subscription_status = 'pending' and trial_ends_at = NULL.
-- Access to the dashboard requires paying ₪2 for the glow-trial plan,
-- which sets subscription_status = 'trial' and trial_ends_at = NOW() + 30 days via webhook.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referral_code TEXT;
  v_result JSONB;
BEGIN
  -- Create profile row — no trial granted automatically
  INSERT INTO public.profiles (user_id, email, full_name, studio_name, subscription_tier, subscription_status, trial_ends_at, trial_source)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'studio_name', ''),
    'lite',
    'pending',
    NULL,
    NULL
  );

  -- Create default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- Apply referral benefits if a referral code was provided at signup
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
