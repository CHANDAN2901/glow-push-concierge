-- Link appointments to clients for hard sync
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_id
ON public.appointments(client_id);