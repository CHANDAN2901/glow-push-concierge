
-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🛍️',
  url TEXT DEFAULT '',
  is_global BOOLEAN NOT NULL DEFAULT false,
  artist_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can see global products
CREATE POLICY "Anyone can view global products"
  ON public.products FOR SELECT
  USING (is_global = true);

-- Artists can view their own products
CREATE POLICY "Artists can view own products"
  ON public.products FOR SELECT
  USING (artist_profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Admins can do everything
CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Artists can insert their own products
CREATE POLICY "Artists can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (
    is_global = false
    AND artist_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Artists can update their own products
CREATE POLICY "Artists can update own products"
  ON public.products FOR UPDATE
  USING (
    is_global = false
    AND artist_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Artists can delete their own products
CREATE POLICY "Artists can delete own products"
  ON public.products FOR DELETE
  USING (
    is_global = false
    AND artist_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Seed 3 global products
INSERT INTO public.products (name, price, emoji, url, is_global, artist_profile_id) VALUES
  ('Glow Aftercare Cream', '₪89', '✨', '', true, NULL),
  ('Vitamin E Ampoules', '₪69', '💧', '', true, NULL),
  ('Skin Calming Gel', '₪59', '🧴', '', true, NULL);
