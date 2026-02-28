
-- Allow anyone to mark photos as seen (only the seen_by_client column)
CREATE POLICY "Anyone can mark photos as seen"
  ON public.client_gallery_photos FOR UPDATE
  USING (true)
  WITH CHECK (true);
