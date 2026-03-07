
CREATE TABLE public.promo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_text TEXT NOT NULL DEFAULT 'פינוק ללקוחות חוזרות ✨',
  title TEXT NOT NULL DEFAULT 'להשלמת המראה',
  description TEXT NOT NULL DEFAULT 'אהבת את הגבות החדשות? השלימי את המראה עם פיגמנט שפתיים בטכניקת אקוורל עדינה! קבלי 15% הנחה לטיפול נוסף כלקוחה קיימת.',
  button_text TEXT NOT NULL DEFAULT 'לפרטים ותיאום 💋',
  button_url TEXT DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (artist_profile_id)
);

ALTER TABLE public.promo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own promo settings"
ON public.promo_settings FOR SELECT
TO authenticated
USING (artist_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own promo settings"
ON public.promo_settings FOR INSERT
TO authenticated
WITH CHECK (artist_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own promo settings"
ON public.promo_settings FOR UPDATE
TO authenticated
USING (artist_profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow anonymous/public read for client-facing view (clients need to see artist promo)
CREATE POLICY "Public can read promo settings"
ON public.promo_settings FOR SELECT
TO anon
USING (true);
