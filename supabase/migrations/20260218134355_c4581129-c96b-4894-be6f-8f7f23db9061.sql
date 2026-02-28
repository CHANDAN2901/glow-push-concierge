
-- image_url is already text type which supports base64 strings of any length
-- No schema change needed, but let's verify by adding a comment
COMMENT ON COLUMN public.portfolio_images.image_url IS 'Stores either a URL or a base64 data URI string';
