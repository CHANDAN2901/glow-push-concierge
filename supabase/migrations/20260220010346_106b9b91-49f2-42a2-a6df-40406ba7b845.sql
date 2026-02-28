
-- Create pricing_plans table
CREATE TABLE public.pricing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name_en text NOT NULL,
  name_he text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  is_highlighted boolean NOT NULL DEFAULT false,
  badge_en text,
  badge_he text,
  features_en text[] NOT NULL DEFAULT '{}',
  features_he text[] NOT NULL DEFAULT '{}',
  cta_en text NOT NULL DEFAULT 'Get Started',
  cta_he text NOT NULL DEFAULT 'התחילי עכשיו',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read plans (public pricing page)
CREATE POLICY "Anyone can view pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (true);

-- Admins can manage plans
CREATE POLICY "Admins can insert pricing plans"
  ON public.pricing_plans FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pricing plans"
  ON public.pricing_plans FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pricing plans"
  ON public.pricing_plans FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_pricing_plans_updated_at
  BEFORE UPDATE ON public.pricing_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default plans
INSERT INTO public.pricing_plans (slug, name_en, name_he, price_monthly, is_highlighted, badge_en, badge_he, features_en, features_he, cta_en, cta_he, sort_order)
VALUES
  ('starter', 'Starter', 'מסלול בסיס', 19, false, null, null,
   ARRAY['Basic Client CRM', 'Portfolio Gallery', 'Up to 30 AI photos/month'],
   ARRAY['ניהול לקוחות בסיסי', 'גלריית עבודות', 'עד 30 תמונות AI בחודש'],
   'Start Free', 'התחילי בחינם', 0),
  ('pro', 'Pro Artist', 'Pro Artist', 39, false, null, null,
   ARRAY['Unlimited AI Photos', 'Calendar & Scheduling', 'Fast Support'],
   ARRAY['תמונות AI ללא הגבלה', 'ניהול יומן ותורים', 'תמיכה מהירה'],
   'Get Pro', 'בחרי במסלול Pro', 1),
  ('elite', 'Glow Elite', 'Glow Elite', 59, true, 'Most Popular', 'הכי פופולרי',
   ARRAY['Everything in Pro', '1-Click WhatsApp Reminders', 'Automated Healing Pushes', 'Affiliate System'],
   ARRAY['כל מה שב-Pro', 'תזכורות וואטסאפ אוטומטיות', 'התראות פוש להחלמה', 'מנגנון שיווק שותפים'],
   'Get Elite', 'בחרי במסלול Elite', 2);
