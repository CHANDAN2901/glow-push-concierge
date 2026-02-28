
-- Fix healing_phases SELECT policies: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated users can view healing phases" ON public.healing_phases;
DROP POLICY IF EXISTS "Public can view healing phases" ON public.healing_phases;

CREATE POLICY "Anyone can view healing phases"
  ON public.healing_phases
  FOR SELECT
  USING (true);

-- Fix message_templates SELECT policy: change from RESTRICTIVE to PERMISSIVE  
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.message_templates;

CREATE POLICY "Anyone can view templates"
  ON public.message_templates
  FOR SELECT
  USING (true);

-- Fix healing_phases admin write policies to be PERMISSIVE
DROP POLICY IF EXISTS "Admins can insert healing phases" ON public.healing_phases;
DROP POLICY IF EXISTS "Admins can update healing phases" ON public.healing_phases;
DROP POLICY IF EXISTS "Admins can delete healing phases" ON public.healing_phases;

CREATE POLICY "Admins can insert healing phases"
  ON public.healing_phases FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update healing phases"
  ON public.healing_phases FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete healing phases"
  ON public.healing_phases FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix message_templates admin write policies to be PERMISSIVE
DROP POLICY IF EXISTS "Admins can insert templates" ON public.message_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.message_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.message_templates;

CREATE POLICY "Admins can insert templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
  ON public.message_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
  ON public.message_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
