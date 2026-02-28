
-- Drop ALL existing restrictive policies on client_gallery_photos
DROP POLICY IF EXISTS "Anyone can insert gallery photos" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Anyone can mark photos as seen" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Anyone can view client gallery photos" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Artists can delete own client photos" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Artists can insert own client photos" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Artists can update own client photos" ON public.client_gallery_photos;
DROP POLICY IF EXISTS "Artists can view own client photos" ON public.client_gallery_photos;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "gallery_select_open" ON public.client_gallery_photos FOR SELECT USING (true);
CREATE POLICY "gallery_insert_open" ON public.client_gallery_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "gallery_update_open" ON public.client_gallery_photos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "gallery_delete_artist" ON public.client_gallery_photos FOR DELETE USING (
  artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);
