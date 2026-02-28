-- Allow public read of images_metadata for client-facing gallery
CREATE POLICY "Anyone can view images metadata"
ON public.images_metadata
FOR SELECT
USING (true);
