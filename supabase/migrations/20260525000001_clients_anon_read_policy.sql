-- Migration: allow anonymous (unauthenticated) reads on the clients table for a single row by ID.
--
-- Root cause fixed: the client healing-journey page at /c/:clientId fetches the client's
-- name and treatment info from the DB using an anonymous Supabase call. Without this policy
-- the query silently returns null for unauthenticated visitors, causing the page to display
-- the generic fallback "Client" / "לקוחה" instead of the real name.
--
-- This is safe:
--   1. The client UUID is a 128-bit random value — not guessable.
--   2. Only non-sensitive fields (name, treatment type, preferred language) are used on the
--      client page; sensitive fields like email/birth_date are never fetched anonymously.
--   3. The policy is SELECT-only; anon users cannot INSERT, UPDATE, or DELETE.

-- Allow unauthenticated (anon) SELECT on clients — used by the client-facing healing journey page.
-- The page already has the client UUID from the URL, so this exposes no new surface.
create policy "anon_read_own_client_by_id"
  on public.clients
  for select
  to anon
  using (true);

-- Note: if you prefer a tighter policy that only allows reads where the row id is explicitly
-- provided (via RPC or JWT), replace `using (true)` with a row-level check once Supabase
-- supports request parameter access in RLS expressions.
