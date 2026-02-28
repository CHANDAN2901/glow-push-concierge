
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_phone text DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS waze_address text DEFAULT '';
