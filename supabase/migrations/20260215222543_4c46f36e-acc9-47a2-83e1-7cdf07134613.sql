
-- 1. Alter profiles: drop defaults before type change
ALTER TABLE public.profiles ALTER COLUMN plan DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN status DROP DEFAULT;

-- Drop old check constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

-- Add new columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS has_health_form_addon BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS health_form_addon;

-- Change plan to enum (enums already created from failed migration attempt - use IF NOT EXISTS workaround)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE public.subscription_tier AS ENUM ('lite', 'professional', 'master');
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'trial', 'past_due', 'canceled');
  END IF;
END $$;

-- Update existing data to match enum values ('pro' -> 'professional' if any)
UPDATE public.profiles SET plan = 'professional' WHERE plan = 'pro';

ALTER TABLE public.profiles
  ALTER COLUMN plan TYPE subscription_tier USING plan::subscription_tier;
ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'lite'::subscription_tier;
ALTER TABLE public.profiles
  RENAME COLUMN plan TO subscription_tier;

ALTER TABLE public.profiles
  ALTER COLUMN status TYPE subscription_status USING status::subscription_status;
ALTER TABLE public.profiles
  ALTER COLUMN status SET DEFAULT 'trial'::subscription_status;
ALTER TABLE public.profiles
  RENAME COLUMN status TO subscription_status;

-- Update trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, studio_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'studio_name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- 2. Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  treatment_type TEXT,
  treatment_date DATE
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own clients" ON public.clients FOR SELECT
  USING (artist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can insert own clients" ON public.clients FOR INSERT
  WITH CHECK (artist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can update own clients" ON public.clients FOR UPDATE
  USING (artist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can delete own clients" ON public.clients FOR DELETE
  USING (artist_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admins can view all clients" ON public.clients FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all clients" ON public.clients FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Create health_declarations table
CREATE TABLE public.health_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_svg TEXT,
  is_signed BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.health_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own declarations" ON public.health_declarations FOR SELECT
  USING (client_id IN (SELECT c.id FROM public.clients c JOIN public.profiles p ON c.artist_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Artists can insert own declarations" ON public.health_declarations FOR INSERT
  WITH CHECK (client_id IN (SELECT c.id FROM public.clients c JOIN public.profiles p ON c.artist_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Artists can update own declarations" ON public.health_declarations FOR UPDATE
  USING (client_id IN (SELECT c.id FROM public.clients c JOIN public.profiles p ON c.artist_id = p.id WHERE p.user_id = auth.uid()));
CREATE POLICY "Admins can view all declarations" ON public.health_declarations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active announcements" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all announcements" ON public.announcements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert announcements" ON public.announcements FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update announcements" ON public.announcements FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete announcements" ON public.announcements FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- 5. Indexes
CREATE INDEX idx_clients_artist_id ON public.clients(artist_id);
CREATE INDEX idx_health_declarations_client_id ON public.health_declarations(client_id);
CREATE INDEX idx_announcements_is_active ON public.announcements(is_active);
