-- Create a new test admin user with confirmed email and admin role
DO $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'admin@glowpush.dev';

  IF v_existing_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'admin@glowpush.dev', extensions.crypt('admin123456', extensions.gen_salt('bf')),
      now(), now(), now(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Test Admin"}'::jsonb
    );

    -- Profile (handle_new_user trigger may not be attached; create manually if missing)
    INSERT INTO public.profiles (user_id, email, full_name, studio_name, subscription_tier, subscription_status)
    VALUES (v_user_id, 'admin@glowpush.dev', 'Test Admin', 'Admin Studio', 'master', 'active')
    ON CONFLICT DO NOTHING;
  ELSE
    v_user_id := v_existing_id;
  END IF;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;