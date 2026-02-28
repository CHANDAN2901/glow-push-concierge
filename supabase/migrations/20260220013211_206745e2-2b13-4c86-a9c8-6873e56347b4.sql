
-- FAQs table
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_he text NOT NULL,
  question_en text NOT NULL DEFAULT '',
  answer_he text NOT NULL,
  answer_en text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active FAQs" ON public.faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert FAQs" ON public.faqs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update FAQs" ON public.faqs FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete FAQs" ON public.faqs FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all FAQs" ON public.faqs FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Images metadata table
CREATE TABLE public.images_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.images_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own images" ON public.images_metadata FOR SELECT
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can insert own images" ON public.images_metadata FOR INSERT
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can delete own images" ON public.images_metadata FOR DELETE
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all images" ON public.images_metadata FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Client-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', true);

CREATE POLICY "Artists can upload client photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Artists can view own client photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'client-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Artists can delete own client photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'client-photos' AND auth.uid() IS NOT NULL);
