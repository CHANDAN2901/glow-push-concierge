-- Table for artist custom health questions (beyond the master list)
CREATE TABLE public.artist_custom_health_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_he text NOT NULL,
  question_en text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '❓',
  risk_level text NOT NULL DEFAULT 'green',
  has_detail_field boolean NOT NULL DEFAULT false,
  detail_placeholder_he text DEFAULT '',
  detail_placeholder_en text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_custom_health_questions ENABLE ROW LEVEL SECURITY;

-- Artists can manage their own custom questions
CREATE POLICY "Artists can view own custom questions"
  ON public.artist_custom_health_questions FOR SELECT TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own custom questions"
  ON public.artist_custom_health_questions FOR INSERT TO authenticated
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own custom questions"
  ON public.artist_custom_health_questions FOR UPDATE TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own custom questions"
  ON public.artist_custom_health_questions FOR DELETE TO authenticated
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Anon can read (for client-facing forms)
CREATE POLICY "Anon can read custom questions"
  ON public.artist_custom_health_questions FOR SELECT TO anon
  USING (true);

-- Admins full access
CREATE POLICY "Admins can manage all custom questions"
  ON public.artist_custom_health_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));