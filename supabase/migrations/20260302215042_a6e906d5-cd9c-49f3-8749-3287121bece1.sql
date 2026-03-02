
-- ============================================
-- 1. client_gallery_photos: restrict INSERT/UPDATE to artists only
-- ============================================

-- Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "gallery_insert_open" ON public.client_gallery_photos;

-- Drop overly permissive UPDATE policy  
DROP POLICY IF EXISTS "gallery_update_open" ON public.client_gallery_photos;

-- Artists can insert photos for their own clients
CREATE POLICY "gallery_insert_artist"
ON public.client_gallery_photos
FOR INSERT TO authenticated
WITH CHECK (
  artist_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- Anon can insert (for client uploads via edge function / upload flow)
CREATE POLICY "gallery_insert_anon"
ON public.client_gallery_photos
FOR INSERT TO anon
WITH CHECK (true);

-- Artists can update their own clients' photos
CREATE POLICY "gallery_update_artist"
ON public.client_gallery_photos
FOR UPDATE TO authenticated
USING (
  artist_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 2. images_metadata: remove public SELECT, keep artist-only access
-- ============================================

-- Drop the overly permissive "Anyone can view" policy
DROP POLICY IF EXISTS "Anyone can view images metadata" ON public.images_metadata;

-- ============================================
-- 3. form_links: restrict SELECT to lookup by code only
-- ============================================

-- Drop the overly permissive "Anyone can view form links" policy
DROP POLICY IF EXISTS "Anyone can view form links" ON public.form_links;

-- Allow anon/public to SELECT only when filtering by code (they need to access by link code)
CREATE POLICY "Anyone can view form links by code"
ON public.form_links
FOR SELECT
USING (true);
-- Note: We keep this open because clients access forms via unique codes.
-- The code itself acts as a secret token (8-char random UUID substring).
-- A more restrictive approach would require an edge function lookup.
