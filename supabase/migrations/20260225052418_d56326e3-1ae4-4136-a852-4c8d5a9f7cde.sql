
-- Create form_links table for short URLs
CREATE TABLE public.form_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  artist_id uuid NOT NULL,
  client_name text NOT NULL DEFAULT '',
  client_phone text DEFAULT '',
  logo_url text DEFAULT '',
  instagram_handle text DEFAULT '',
  artist_phone text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index on code for fast lookups
CREATE INDEX idx_form_links_code ON public.form_links(code);

-- RLS
ALTER TABLE public.form_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read form links (clients opening the link)
CREATE POLICY "Anyone can view form links" ON public.form_links FOR SELECT USING (true);

-- Artists can create form links for their own clients
CREATE POLICY "Artists can insert own form links" ON public.form_links FOR INSERT
  WITH CHECK (artist_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Service role can insert (for edge functions)
CREATE POLICY "Service role full access" ON public.form_links FOR ALL USING (true);
