
-- Allow anonymous users to insert push subscriptions
CREATE POLICY "Anon can insert push subs"
ON public.push_subscriptions
FOR INSERT TO anon
WITH CHECK (true);

-- Allow anonymous users to delete their old push subs (needed for re-subscribe flow)
CREATE POLICY "Anon can delete push subs by client_id"
ON public.push_subscriptions
FOR DELETE TO anon
USING (client_id IS NOT NULL);
