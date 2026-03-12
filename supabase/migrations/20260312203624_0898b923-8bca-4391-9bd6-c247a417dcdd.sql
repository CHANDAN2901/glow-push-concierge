
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.seed_mock_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- User 1: Lite/Active
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'noa.test@glowpush.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'נועה בן דוד', 'סטודיו נועה ביוטי', 'lite', 'active', 'noa.test@glowpush.dev')
  ON CONFLICT DO NOTHING;

  -- User 2: Professional/Active
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'orit.test@glowpush.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'אורית חדד', 'Orit PMU Studio', 'professional', 'active', 'orit.test@glowpush.dev')
  ON CONFLICT DO NOTHING;

  -- User 3: Master/Active
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shira.test@glowpush.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'שירה אביטל', 'שירה מייקאפ קבוע', 'master', 'active', 'shira.test@glowpush.dev')
  ON CONFLICT DO NOTHING;

  -- User 4: Lite/Trial
  v_user_id := gen_random_uuid();
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maya.test@glowpush.dev', extensions.crypt('TestPass123!', extensions.gen_salt('bf')), now(), now(), now(), '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb)
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO public.profiles (user_id, full_name, studio_name, subscription_tier, subscription_status, email)
  VALUES (v_user_id, 'מאיה לוי', 'Maya Brows & Lips', 'lite', 'trial', 'maya.test@glowpush.dev')
  ON CONFLICT DO NOTHING;
END;
$$;
