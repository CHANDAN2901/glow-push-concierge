
CREATE OR REPLACE FUNCTION public.seed_mock_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- User 1: Lite/Active
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'נועה בן דוד', 'סטודיו נועה ביוטי', 'lite', 'active', 'noa.test@glowpush.dev');

  -- User 2: Professional/Active
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'אורית חדד', 'Orit PMU Studio', 'professional', 'active', 'orit.test@glowpush.dev');

  -- User 3: Master/Active
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'שירה אביטל', 'שירה מייקאפ קבוע', 'master', 'active', 'shira.test@glowpush.dev');

  -- User 4: Lite/Trial
  v_user_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'מאיה לוי', 'Maya Brows & Lips', 'lite', 'trial', 'maya.test@glowpush.dev');
END;
$$;
