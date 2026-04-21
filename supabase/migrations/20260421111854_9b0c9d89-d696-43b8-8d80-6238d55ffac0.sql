
-- Fix NULL token fields across all auth.users (root cause of signup/delete failures)
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR email_change IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;

-- Now safely delete the broken account
DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'chandanyadav290501@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user_id;
    
    IF v_profile_id IS NOT NULL THEN
      -- Cascade delete app data
      DELETE FROM public.health_declarations WHERE client_id IN (SELECT id FROM public.clients WHERE artist_id = v_profile_id);
      DELETE FROM public.client_gallery_photos WHERE artist_id = v_profile_id;
      DELETE FROM public.client_healing_phases WHERE client_id IN (SELECT id FROM public.clients WHERE artist_id = v_profile_id);
      DELETE FROM public.clients WHERE artist_id = v_profile_id;
      DELETE FROM public.appointments WHERE artist_id = v_profile_id;
      DELETE FROM public.portfolio_images WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.images_metadata WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.artist_message_settings WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.timeline_content WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.push_subscriptions WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.products WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.referrals WHERE referrer_profile_id = v_profile_id OR referred_profile_id = v_profile_id;
      DELETE FROM public.form_links WHERE artist_id = v_profile_id;
      DELETE FROM public.clinic_policies WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.promo_settings WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.artist_custom_health_questions WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.artist_health_question_overrides WHERE artist_profile_id = v_profile_id;
      DELETE FROM public.profiles WHERE id = v_profile_id;
    END IF;
    
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;
