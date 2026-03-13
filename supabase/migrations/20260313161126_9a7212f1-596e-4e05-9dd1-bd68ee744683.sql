CREATE POLICY "Anon can read client by id"
ON public.clients
FOR SELECT
TO anon
USING (true);