-- Latest Morning.co (Green Invoice) invoice generated for the artist's last
-- subscription charge — mirrors the existing "last charge" snapshot fields
-- on profiles (last_charge_at, last_charge_confirmation, etc.), not a full
-- history table, consistent with how PaymentHistory.tsx already displays
-- only the most recent payment.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS morning_invoice_url text,
  ADD COLUMN IF NOT EXISTS morning_invoice_number bigint;
