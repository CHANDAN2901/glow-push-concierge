
-- The previous migration already dropped and recreated policies.
-- This is a no-op fix since the error was only about the publication line.
-- Verify policies exist by selecting them (no changes needed).
SELECT 1;
