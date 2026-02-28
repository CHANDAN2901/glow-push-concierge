
-- Add client_id column to images_metadata for per-client image binding
ALTER TABLE public.images_metadata ADD COLUMN client_id text;

-- Create index for efficient lookups
CREATE INDEX idx_images_metadata_client_id ON public.images_metadata(client_id);
