
-- Table for shared gallery photos between artist and client
CREATE TABLE public.client_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'healing' CHECK (photo_type IN ('healing', 'collage')),
  label text,
  day_number integer,
  uploaded_by text NOT NULL DEFAULT 'artist' CHECK (uploaded_by IN ('artist', 'client')),
  seen_by_client boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.client_gallery_photos ENABLE ROW LEVEL SECURITY;

-- Artists can manage photos for their own clients
CREATE POLICY "Artists can view own client photos"
  ON public.client_gallery_photos FOR SELECT
  USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own client photos"
  ON public.client_gallery_photos FOR INSERT
  WITH CHECK (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own client photos"
  ON public.client_gallery_photos FOR DELETE
  USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own client photos"
  ON public.client_gallery_photos FOR UPDATE
  USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Public read access for client views (no auth required, filtered by client_id in app)
CREATE POLICY "Anyone can view client gallery photos"
  ON public.client_gallery_photos FOR SELECT
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_gallery_photos;
