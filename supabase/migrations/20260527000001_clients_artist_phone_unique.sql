-- Step 1: Remove duplicate clients keeping the oldest record per (artist_id, phone).
DELETE FROM clients
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY artist_id, phone
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM clients
    WHERE phone IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Drop the partial index created by the previous failed attempt (if it exists).
DROP INDEX IF EXISTS clients_artist_phone_unique;

-- Step 3: Add a proper named UNIQUE CONSTRAINT.
-- PostgREST requires a constraint (not a bare index) for onConflict upsert to work.
ALTER TABLE clients
  ADD CONSTRAINT clients_artist_phone_unique UNIQUE (artist_id, phone);
