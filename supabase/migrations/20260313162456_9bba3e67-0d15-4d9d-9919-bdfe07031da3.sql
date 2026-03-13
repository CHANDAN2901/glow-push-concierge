CREATE POLICY "Anon can read own health declaration by client_id"
ON public.health_declarations
FOR SELECT
TO anon
USING (true);