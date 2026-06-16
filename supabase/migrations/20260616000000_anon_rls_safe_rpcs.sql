-- Migration: close anon (unauthenticated) data-exposure holes on clients & profiles.
--
-- Two prior policies used `USING (true)` for the anon role:
--   * clients   — "anon_read_own_client_by_id"  (20260525000001)
--   * profiles  — "Anon can read artist profiles" (20260313162243)
-- Despite the comments claiming they only exposed a single row "by id", `USING (true)`
-- exposed the ENTIRE tables to anyone holding the public anon key (which ships in the
-- frontend bundle): every client's name/phone/email/birth_date and every artist's
-- email/business contact/subscription fields were readable with zero authentication.
--
-- Fix: drop both blanket anon SELECT policies and serve the legitimate single-row public
-- reads (client healing page `/c/:id`, digital card `/digital-card/:id`) through
-- SECURITY DEFINER RPCs that return ONLY non-sensitive columns for one caller-supplied id.
-- No table-wide enumeration; no email / birth_date / payment exposure.
-- Authenticated artists keep their own-row policies; admins keep their all-rows policies.

-- 1. Safe public client info — client healing page + push opt-in existence check.
--    Caller must already know the (unguessable) client UUID. Excludes email, birth_date,
--    medical_exception_approved.
CREATE OR REPLACE FUNCTION public.get_public_client_info(p_client_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  referral_code text,
  treatment_type text,
  treatment_date date,
  artist_id uuid,
  preferred_lang text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, phone, referral_code, treatment_type, treatment_date, artist_id, preferred_lang
  FROM public.clients
  WHERE id = p_client_id;
$$;

-- 2. Resolve a legacy name-based link to a client id. Returns only the opaque id (no PII),
--    preserving old `/c/:name` links that predate UUID links.
CREATE OR REPLACE FUNCTION public.resolve_client_id_by_name(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE full_name = p_name OR full_name ILIKE p_name
  ORDER BY (full_name = p_name) DESC
  LIMIT 1;
$$;

-- 3. Safe public artist branding — client page artist header + public digital card.
--    Excludes email, subscription/trial/payment fields, referral code.
CREATE OR REPLACE FUNCTION public.get_public_artist_card(p_profile_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  studio_name text,
  business_phone text,
  logo_url text,
  instagram_url text,
  facebook_url text,
  waze_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, studio_name, business_phone, logo_url, instagram_url, facebook_url, waze_address
  FROM public.profiles
  WHERE id = p_profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_client_info(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_client_id_by_name(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_artist_card(uuid) TO anon, authenticated;

-- 4. Remove the blanket anon SELECT policies.
DROP POLICY IF EXISTS "anon_read_own_client_by_id" ON public.clients;
DROP POLICY IF EXISTS "Anon can read artist profiles" ON public.profiles;
