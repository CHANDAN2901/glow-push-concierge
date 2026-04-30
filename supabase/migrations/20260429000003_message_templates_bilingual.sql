-- Add bilingual columns to message_templates table for aftercare messages
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS default_text_he TEXT,
  ADD COLUMN IF NOT EXISTS default_text_en TEXT;
