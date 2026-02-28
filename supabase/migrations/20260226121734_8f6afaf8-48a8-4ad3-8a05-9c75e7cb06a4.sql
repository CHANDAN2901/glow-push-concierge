
-- Table for artist-specific timeline carousel content overrides
CREATE TABLE public.timeline_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_index integer NOT NULL, -- 0-5 for 6 steps
  quote_he text NOT NULL DEFAULT '',
  quote_en text NOT NULL DEFAULT '',
  tip_he text NOT NULL DEFAULT '',
  tip_en text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(artist_profile_id, step_index)
);

-- RLS
ALTER TABLE public.timeline_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own timeline content"
  ON public.timeline_content FOR SELECT
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own timeline content"
  ON public.timeline_content FOR INSERT
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own timeline content"
  ON public.timeline_content FOR UPDATE
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own timeline content"
  ON public.timeline_content FOR DELETE
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all timeline content"
  ON public.timeline_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view timeline content"
  ON public.timeline_content FOR SELECT
  USING (true);

-- Auto-update updated_at
CREATE TRIGGER update_timeline_content_updated_at
  BEFORE UPDATE ON public.timeline_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
