
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT DEFAULT '',
  treatment_type TEXT NOT NULL DEFAULT 'eyebrows',
  date DATE NOT NULL,
  time TEXT NOT NULL DEFAULT '10:00',
  health_form_status TEXT NOT NULL DEFAULT 'pending',
  health_risk_level TEXT NOT NULL DEFAULT 'none',
  health_form_answers JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled',
  auto_send_health BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_artist FOREIGN KEY (artist_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can view own appointments" ON public.appointments
  FOR SELECT USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can insert own appointments" ON public.appointments
  FOR INSERT WITH CHECK (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can update own appointments" ON public.appointments
  FOR UPDATE USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own appointments" ON public.appointments
  FOR DELETE USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all appointments" ON public.appointments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
