
-- 1. form_links: Artists need to UPDATE (mark completed, update token) and DELETE their own links
CREATE POLICY "Artists can update own form links"
ON public.form_links FOR UPDATE TO authenticated
USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Artists can delete own form links"
ON public.form_links FOR DELETE TO authenticated
USING (artist_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Anon needs UPDATE for health form submission flow (mark token used, completed)
CREATE POLICY "Anon can update form links"
ON public.form_links FOR UPDATE TO anon
USING (true);

-- 2. push_subscriptions: Artists need UPDATE for their push subs
CREATE POLICY "Artists can update own push subs"
ON public.push_subscriptions FOR UPDATE TO authenticated
USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 3. images_metadata: Artists need UPDATE for labels/categories
CREATE POLICY "Artists can update own images"
ON public.images_metadata FOR UPDATE TO authenticated
USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 4. artist_message_settings: Artists need DELETE
CREATE POLICY "Artists can delete own message settings"
ON public.artist_message_settings FOR DELETE TO authenticated
USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 5. health_declarations: Artists need DELETE for their client declarations
CREATE POLICY "Artists can delete own declarations"
ON public.health_declarations FOR DELETE TO authenticated
USING (client_id IN (SELECT c.id FROM clients c JOIN profiles p ON c.artist_id = p.id WHERE p.user_id = auth.uid()));

-- 6. clinic_policies: Artists need DELETE
CREATE POLICY "Artists can delete own policy"
ON public.clinic_policies FOR DELETE TO authenticated
USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 7. promo_settings: Artists need DELETE
CREATE POLICY "Artists can delete own promo settings"
ON public.promo_settings FOR DELETE TO authenticated
USING (artist_profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 8. support_tickets: Users should be able to delete own tickets
CREATE POLICY "Users can delete own tickets"
ON public.support_tickets FOR DELETE TO authenticated
USING (auth.uid() = user_id);
