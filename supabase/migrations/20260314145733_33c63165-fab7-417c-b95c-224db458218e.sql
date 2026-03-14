
-- Per-client healing phases (cloned from global healing_phases on treatment start)
CREATE TABLE public.client_healing_phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  source_phase_id UUID REFERENCES public.healing_phases(id) ON DELETE SET NULL,
  treatment_type TEXT NOT NULL,
  day_start INTEGER NOT NULL,
  day_end INTEGER NOT NULL,
  title_he TEXT NOT NULL,
  title_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💧',
  severity TEXT NOT NULL DEFAULT 'medium',
  steps_he TEXT[] NOT NULL DEFAULT '{}',
  steps_en TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.client_healing_phases ENABLE ROW LEVEL SECURITY;

-- Anyone can view (client view is public/anon)
CREATE POLICY "Anyone can view client healing phases"
  ON public.client_healing_phases FOR SELECT
  TO public USING (true);

-- Artists can manage their own clients' phases
CREATE POLICY "Artists can insert client healing phases"
  ON public.client_healing_phases FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON c.artist_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Artists can update client healing phases"
  ON public.client_healing_phases FOR UPDATE
  TO authenticated
  USING (client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON c.artist_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Artists can delete client healing phases"
  ON public.client_healing_phases FOR DELETE
  TO authenticated
  USING (client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON c.artist_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Admins can manage all
CREATE POLICY "Admins can manage all client healing phases"
  ON public.client_healing_phases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DB function to clone global template into client record
CREATE OR REPLACE FUNCTION public.clone_healing_phases_for_client(
  p_client_id UUID,
  p_treatment_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete any existing phases for this client
  DELETE FROM public.client_healing_phases WHERE client_id = p_client_id;

  -- Clone from global master template
  INSERT INTO public.client_healing_phases (
    client_id, source_phase_id, treatment_type,
    day_start, day_end, title_he, title_en,
    icon, severity, steps_he, steps_en, sort_order, image_url
  )
  SELECT
    p_client_id, hp.id, hp.treatment_type,
    hp.day_start, hp.day_end, hp.title_he, hp.title_en,
    hp.icon, hp.severity, hp.steps_he, hp.steps_en, hp.sort_order, hp.image_url
  FROM public.healing_phases hp
  WHERE hp.treatment_type = p_treatment_type
  ORDER BY hp.sort_order;
END;
$$;
