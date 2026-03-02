
-- Remove overly permissive delete policies
DROP POLICY IF EXISTS "Anon can delete push subs by client_id" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push subs by client_id" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can delete push subs" ON public.push_subscriptions;

-- Anon can only delete their own subscription by matching endpoint
-- (client doesn't have auth, but the browser knows its own endpoint)
CREATE POLICY "Anon can delete own push sub by endpoint"
ON public.push_subscriptions
FOR DELETE TO anon
USING (
  endpoint = current_setting('request.headers', true)::json->>'x-push-endpoint'
);

-- Artists can delete subs for their own clients
CREATE POLICY "Artists can delete own client push subs"
ON public.push_subscriptions
FOR DELETE TO authenticated
USING (
  artist_profile_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  )
);
