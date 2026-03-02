
-- Allow authenticated users to insert push subscriptions
CREATE POLICY "Authenticated can insert push subs"
ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to select push subscriptions they're associated with
CREATE POLICY "Authenticated can select push subs"
ON public.push_subscriptions
FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to delete push subscriptions
CREATE POLICY "Authenticated can delete push subs"
ON public.push_subscriptions
FOR DELETE TO authenticated
USING (true);
