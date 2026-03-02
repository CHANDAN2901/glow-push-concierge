-- Allow anonymous delete of push subscriptions by client_id (for re-subscription flow)
CREATE POLICY "Anyone can delete push subs by client_id"
ON public.push_subscriptions
FOR DELETE
USING (client_id IS NOT NULL);

-- Allow anonymous update on clients for push_opted_in (unauthenticated client flow)
CREATE POLICY "Anyone can update client push_opted_in"
ON public.clients
FOR UPDATE
USING (true)
WITH CHECK (true);
