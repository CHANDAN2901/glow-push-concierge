-- Ensure table privileges are explicitly granted
GRANT INSERT ON TABLE public.push_subscriptions TO anon;
GRANT INSERT ON TABLE public.push_subscriptions TO authenticated;

-- Remove overlapping insert policies to avoid ambiguity
DROP POLICY IF EXISTS "Anyone can subscribe to push" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Artists can insert own push subs" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can insert push subs" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anon can insert push subs" ON public.push_subscriptions;

-- Explicit anon INSERT policy (unauthenticated clients)
CREATE POLICY "Anon can insert push subs"
ON public.push_subscriptions
FOR INSERT TO anon
WITH CHECK (true);

-- Explicit authenticated INSERT policy (artists/admins)
CREATE POLICY "Authenticated can insert push subs"
ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (true);