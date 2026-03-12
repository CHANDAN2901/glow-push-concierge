
CREATE TABLE public.artist_health_question_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.health_questions(id) ON DELETE CASCADE,
  is_included boolean NOT NULL DEFAULT true,
  custom_text_he text,
  custom_text_en text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(artist_profile_id, question_id)
);

ALTER TABLE public.artist_health_question_overrides ENABLE ROW LEVEL SECURITY;

-- Artists can view own overrides
CREATE POLICY "Artists can view own overrides"
  ON public.artist_health_question_overrides FOR SELECT
  TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Artists can insert own overrides
CREATE POLICY "Artists can insert own overrides"
  ON public.artist_health_question_overrides FOR INSERT
  TO authenticated
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Artists can update own overrides
CREATE POLICY "Artists can update own overrides"
  ON public.artist_health_question_overrides FOR UPDATE
  TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Artists can delete own overrides
CREATE POLICY "Artists can delete own overrides"
  ON public.artist_health_question_overrides FOR DELETE
  TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Admins full access
CREATE POLICY "Admins can manage all overrides"
  ON public.artist_health_question_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anon can read overrides (for client-facing form)
CREATE POLICY "Anon can read overrides"
  ON public.artist_health_question_overrides FOR SELECT
  TO anon
  USING (true);
