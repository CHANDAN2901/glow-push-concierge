CREATE POLICY "Anon can read artist profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);