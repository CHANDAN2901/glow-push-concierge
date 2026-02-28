
-- Drop the restrictive UPDATE policies
DROP POLICY IF EXISTS "Admins can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Artists can update own clients" ON public.clients;

-- Recreate as PERMISSIVE (any one passing is enough)
CREATE POLICY "Admins can update all clients"
ON public.clients FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Artists can update own clients"
ON public.clients FOR UPDATE
TO authenticated
USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
