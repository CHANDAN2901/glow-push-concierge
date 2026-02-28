
-- Push notification subscriptions for healing journey
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  artist_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_key text NOT NULL,
  treatment_type text,
  treatment_start date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own push subs"
  ON public.push_subscriptions FOR SELECT
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own push subs"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own push subs"
  ON public.push_subscriptions FOR DELETE
  USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all push subs"
  ON public.push_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow anon insert for client-side subscription (clients aren't logged in)
CREATE POLICY "Anyone can subscribe to push"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

-- Add whatsapp_automation flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_whatsapp_automation boolean NOT NULL DEFAULT false;
