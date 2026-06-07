
CREATE TABLE IF NOT EXISTS public.cron_tokens (
  name TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_tokens TO service_role;

ALTER TABLE public.cron_tokens ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated. Only service_role (which bypasses RLS) can read/write.
