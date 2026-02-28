
-- Ensure portfolio bucket exists with public access
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop and recreate policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "auth_upload_portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "public_read_portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "auth_delete_portfolio" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
END $$;

CREATE POLICY "auth_upload_portfolio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "public_read_portfolio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'portfolio');

CREATE POLICY "auth_delete_portfolio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'portfolio');
