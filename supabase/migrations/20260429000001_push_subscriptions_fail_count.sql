-- Add fail_count to track consecutive push delivery failures.
-- Subscriptions are only deleted after 3+ failures (404) or immediately on 410 Gone.
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS fail_count integer NOT NULL DEFAULT 0;
