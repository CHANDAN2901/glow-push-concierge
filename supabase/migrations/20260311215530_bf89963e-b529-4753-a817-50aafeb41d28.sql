
ALTER TABLE public.healing_phases ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for healing phase images
INSERT INTO storage.buckets (id, name, public)
VALUES ('healing-assets', 'healing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to healing-assets
CREATE POLICY "Admins can upload healing assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'healing-assets' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update healing assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'healing-assets' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete healing assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'healing-assets' AND
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view healing assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'healing-assets');
