CREATE POLICY "Anon can read artist message settings"
ON public.artist_message_settings
FOR SELECT
TO anon
USING (true);