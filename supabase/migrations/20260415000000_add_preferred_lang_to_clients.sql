-- Add preferred_lang column to clients table
-- Stores the client's language preference ('he' or 'en') so the aftercare cron
-- can send push notifications in the right language.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_lang text NOT NULL DEFAULT 'he'
  CHECK (preferred_lang IN ('he', 'en'));
