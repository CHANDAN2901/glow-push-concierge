
-- Add client_id to push_subscriptions so we can link subscriptions to specific clients
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client_id ON public.push_subscriptions(client_id);

-- Add push_opted_in to clients table so artist can see who opted in
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS push_opted_in boolean NOT NULL DEFAULT false;
