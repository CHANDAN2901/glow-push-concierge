ALTER TABLE public.form_links
  ADD COLUMN IF NOT EXISTS form_token UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.form_links
  ADD COLUMN IF NOT EXISTS is_token_used BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS form_links_form_token_key
  ON public.form_links (form_token);

-- Keep old and new flags aligned for existing rows
UPDATE public.form_links
SET is_token_used = true
WHERE is_completed = true
  AND is_token_used = false;