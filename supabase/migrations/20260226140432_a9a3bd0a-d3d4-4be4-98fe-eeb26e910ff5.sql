
-- Allow anyone (including unauthenticated clients) to insert gallery photos
CREATE POLICY "Anyone can insert gallery photos"
  ON public.client_gallery_photos FOR INSERT
  WITH CHECK (true);
