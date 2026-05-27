-- Step 1: Remove duplicate clients keeping the oldest record per (artist_id, phone).
-- "Oldest" = lowest id (first inserted), so we keep the original and drop re-imports.
DELETE FROM clients
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY artist_id, phone
        ORDER BY created_at ASC, id ASC   -- keep the earliest record
      ) AS rn
    FROM clients
    WHERE phone IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Now it's safe to create the unique partial index.
CREATE UNIQUE INDEX IF NOT EXISTS clients_artist_phone_unique
  ON clients (artist_id, phone)
  WHERE phone IS NOT NULL;
