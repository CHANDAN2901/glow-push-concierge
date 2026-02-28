
-- Table to persist artist message template customizations
CREATE TABLE public.artist_message_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.artist_message_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own message settings"
  ON public.artist_message_settings FOR SELECT
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own message settings"
  ON public.artist_message_settings FOR INSERT
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own message settings"
  ON public.artist_message_settings FOR UPDATE
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all message settings"
  ON public.artist_message_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_artist_message_settings_updated_at
  BEFORE UPDATE ON public.artist_message_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
