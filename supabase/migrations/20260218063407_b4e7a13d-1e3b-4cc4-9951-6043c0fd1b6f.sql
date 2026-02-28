
-- Table for global message templates
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  label text NOT NULL,
  default_text text NOT NULL DEFAULT '',
  placeholders text[] NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read templates
CREATE POLICY "Authenticated users can view templates"
  ON public.message_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
  ON public.message_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
  ON public.message_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults
INSERT INTO public.message_templates (template_key, label, default_text, placeholders) VALUES
  ('whatsapp_share', 'הודעת שיתוף כרטיס ביקור', 'היי [ClientName], מצורף כרטיס הביקור הדיגיטלי שלי 💅 אשמח לראות אותך! [ArtistName]', ARRAY['[ArtistName]', '[ClientName]']),
  ('form_success', 'הודעת הצלחה לאחר טופס בריאות', 'תודה [ClientName]! 🎉 הטופס נשלח בהצלחה ל-[ArtistName]. נתראה בטיפול!', ARRAY['[ArtistName]', '[ClientName]']),
  ('shop_order', 'הודעת הזמנה מהחנות', 'היי [ArtistName], אני [ClientName] ואני מעוניינת לרכוש את [ProductName] 🛍️', ARRAY['[ArtistName]', '[ClientName]', '[ProductName]']);
