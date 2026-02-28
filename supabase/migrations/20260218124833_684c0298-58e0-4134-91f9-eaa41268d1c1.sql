
-- Portfolio images table
CREATE TABLE public.portfolio_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'brows',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

-- Artists can view their own images
CREATE POLICY "Artists can view own portfolio"
  ON public.portfolio_images FOR SELECT
  USING (artist_profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Public images viewable by anyone
CREATE POLICY "Anyone can view public portfolio images"
  ON public.portfolio_images FOR SELECT
  USING (is_public = true);

-- Artists can insert own images
CREATE POLICY "Artists can insert own portfolio"
  ON public.portfolio_images FOR INSERT
  WITH CHECK (artist_profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Artists can update own images
CREATE POLICY "Artists can update own portfolio"
  ON public.portfolio_images FOR UPDATE
  USING (artist_profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Artists can delete own images
CREATE POLICY "Artists can delete own portfolio"
  ON public.portfolio_images FOR DELETE
  USING (artist_profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Admins full access
CREATE POLICY "Admins can manage all portfolio images"
  ON public.portfolio_images FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

-- Storage policies
CREATE POLICY "Anyone can view portfolio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own portfolio files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own portfolio files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
