ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_checklist_state jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_checklist_dismissed boolean NOT NULL DEFAULT false;