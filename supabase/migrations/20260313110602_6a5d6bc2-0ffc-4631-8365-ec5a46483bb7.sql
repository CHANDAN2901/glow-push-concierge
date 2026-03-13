ALTER TABLE public.form_links 
  ADD COLUMN IF NOT EXISTS treatment_type text DEFAULT '',
  ADD COLUMN IF NOT EXISTS include_policy boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS client_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS artist_name text DEFAULT '';