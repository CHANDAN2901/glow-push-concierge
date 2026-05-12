-- Lemon Squeezy payment integration

-- LS subscription tracking columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_order_id TEXT;

-- Admin-controlled app config (e.g. ls_mode = 'test' | 'live')
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS — only service role and admins can write
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read app_settings" ON public.app_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin write app_settings" ON public.app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Default: LS in test mode
INSERT INTO public.app_settings (key, value)
  VALUES ('ls_mode', 'test')
  ON CONFLICT (key) DO NOTHING;
