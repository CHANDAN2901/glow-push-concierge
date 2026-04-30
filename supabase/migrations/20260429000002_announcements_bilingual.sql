-- Add bilingual columns to announcements table
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS title_he TEXT,
  ADD COLUMN IF NOT EXISTS title_en TEXT,
  ADD COLUMN IF NOT EXISTS content_he TEXT,
  ADD COLUMN IF NOT EXISTS content_en TEXT;
