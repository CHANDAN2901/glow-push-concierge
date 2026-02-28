
-- Fix healing_phases: drop RESTRICTIVE select policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view healing phases" ON public.healing_phases;
CREATE POLICY "Anyone can view healing phases"
  ON public.healing_phases FOR SELECT
  USING (true);

-- Fix message_templates: drop RESTRICTIVE select policy and recreate as PERMISSIVE  
DROP POLICY IF EXISTS "Anyone can view templates" ON public.message_templates;
CREATE POLICY "Anyone can view templates"
  ON public.message_templates FOR SELECT
  USING (true);

-- Also fix admin write policies to be PERMISSIVE for healing_phases
DROP POLICY IF EXISTS "Admins can update healing phases" ON public.healing_phases;
CREATE POLICY "Admins can update healing phases"
  ON public.healing_phases FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert healing phases" ON public.healing_phases;
CREATE POLICY "Admins can insert healing phases"
  ON public.healing_phases FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete healing phases" ON public.healing_phases;
CREATE POLICY "Admins can delete healing phases"
  ON public.healing_phases FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix admin write policies for message_templates
DROP POLICY IF EXISTS "Admins can update templates" ON public.message_templates;
CREATE POLICY "Admins can update templates"
  ON public.message_templates FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert templates" ON public.message_templates;
CREATE POLICY "Admins can insert templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete templates" ON public.message_templates;
CREATE POLICY "Admins can delete templates"
  ON public.message_templates FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
