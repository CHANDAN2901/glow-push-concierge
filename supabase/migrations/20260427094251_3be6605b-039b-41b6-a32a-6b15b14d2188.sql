-- Delete specified test/unwanted accounts and all associated data
DO $$
DECLARE
  v_user_ids UUID[] := ARRAY[
    'f31383a3-505b-44be-96bb-0b4829ef2d18'::uuid, -- almaharoni25 (עלמוש)
    '67d71638-2467-40b1-b327-a84a24bdfa50'::uuid, -- almaharoni (עלמוש/עלמושה)
    '11e1d1d8-085d-445a-a4df-e9295bba802c'::uuid, -- yarin200208 (קטרינוש)
    'ca5b71ec-d060-4d6c-8ae8-dd27663bdbc8'::uuid, -- shoshicohen00 (שושקה סטודיו)
    '809ee9d0-47d7-4c95-b4d7-0da99c56f56c'::uuid, -- oritaharoni.studio (אור סטודיו)
    '2ff56a0f-b7c1-4add-b501-971d488ac36d'::uuid  -- shahar@as-law.co.il (שחר אהרוני)
  ];
  v_profile_ids UUID[];
  v_client_ids UUID[];
BEGIN
  -- Get profile ids
  SELECT array_agg(id) INTO v_profile_ids
  FROM public.profiles WHERE user_id = ANY(v_user_ids);

  -- Get client ids belonging to these artists
  SELECT array_agg(id) INTO v_client_ids
  FROM public.clients WHERE artist_id = ANY(COALESCE(v_profile_ids, ARRAY[]::uuid[]));

  -- Delete client-related data
  IF v_client_ids IS NOT NULL THEN
    DELETE FROM public.health_declarations WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.client_gallery_photos WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.client_healing_phases WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.push_subscriptions WHERE client_id = ANY(v_client_ids);
    DELETE FROM public.form_links WHERE client_id = ANY(v_client_ids);
  END IF;

  -- Delete artist-owned data
  IF v_profile_ids IS NOT NULL THEN
    DELETE FROM public.client_gallery_photos WHERE artist_id = ANY(v_profile_ids);
    DELETE FROM public.appointments WHERE artist_id = ANY(v_profile_ids);
    DELETE FROM public.form_links WHERE artist_id = ANY(v_profile_ids);
    DELETE FROM public.clients WHERE artist_id = ANY(v_profile_ids);
    DELETE FROM public.portfolio_images WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.images_metadata WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.artist_message_settings WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.artist_custom_health_questions WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.artist_health_question_overrides WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.clinic_policies WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.push_subscriptions WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.products WHERE artist_profile_id = ANY(v_profile_ids) AND is_global = false;
    DELETE FROM public.promo_settings WHERE artist_profile_id = ANY(v_profile_ids);
    DELETE FROM public.referrals WHERE referrer_profile_id = ANY(v_profile_ids) OR referred_profile_id = ANY(v_profile_ids);
    -- Clear referred_by references
    UPDATE public.profiles SET referred_by_profile_id = NULL WHERE referred_by_profile_id = ANY(v_profile_ids);
    -- Delete profiles
    DELETE FROM public.profiles WHERE id = ANY(v_profile_ids);
  END IF;

  -- Delete roles
  DELETE FROM public.user_roles WHERE user_id = ANY(v_user_ids);

  -- Delete auth users
  DELETE FROM auth.users WHERE id = ANY(v_user_ids);
END $$;