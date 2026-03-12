-- 1) Master Features table (immutable catalog)
CREATE TABLE IF NOT EXISTS public.pricing_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL DEFAULT '',
  name_he TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pricing features" ON public.pricing_features;
CREATE POLICY "Anyone can view pricing features"
ON public.pricing_features
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert pricing features" ON public.pricing_features;
CREATE POLICY "Admins can insert pricing features"
ON public.pricing_features
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update pricing features" ON public.pricing_features;
CREATE POLICY "Admins can update pricing features"
ON public.pricing_features
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete pricing features" ON public.pricing_features;
CREATE POLICY "Admins can delete pricing features"
ON public.pricing_features
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_pricing_features_updated_at ON public.pricing_features;
CREATE TRIGGER update_pricing_features_updated_at
BEFORE UPDATE ON public.pricing_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Junction table for M:N plan-feature links
CREATE TABLE IF NOT EXISTS public.pricing_plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.pricing_features(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_pricing_plan_features_plan_id ON public.pricing_plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_pricing_plan_features_feature_id ON public.pricing_plan_features(feature_id);

ALTER TABLE public.pricing_plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view pricing plan feature links" ON public.pricing_plan_features;
CREATE POLICY "Anyone can view pricing plan feature links"
ON public.pricing_plan_features
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert pricing plan feature links" ON public.pricing_plan_features;
CREATE POLICY "Admins can insert pricing plan feature links"
ON public.pricing_plan_features
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete pricing plan feature links" ON public.pricing_plan_features;
CREATE POLICY "Admins can delete pricing plan feature links"
ON public.pricing_plan_features
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 3) Sync helper: junction table -> pricing_plans.feature_keys (compatibility)
CREATE OR REPLACE FUNCTION public.sync_pricing_plan_feature_keys(p_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pricing_plans p
  SET feature_keys = COALESCE((
    SELECT array_agg(f.key ORDER BY f.key)
    FROM public.pricing_plan_features pf
    JOIN public.pricing_features f ON f.id = pf.feature_id
    WHERE pf.plan_id = p_plan_id
  ), '{}'::text[]),
  updated_at = now()
  WHERE p.id = p_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_pricing_plan_feature_link_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id UUID;
BEGIN
  v_plan_id := COALESCE(NEW.plan_id, OLD.plan_id);
  PERFORM public.sync_pricing_plan_feature_keys(v_plan_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_pricing_plan_feature_link_change ON public.pricing_plan_features;
CREATE TRIGGER trg_pricing_plan_feature_link_change
AFTER INSERT OR DELETE OR UPDATE ON public.pricing_plan_features
FOR EACH ROW
EXECUTE FUNCTION public.handle_pricing_plan_feature_link_change();

-- 4) Seed immutable master bank (restores missing keys such as digital_card)
INSERT INTO public.pricing_features (key, name_en, name_he)
VALUES
  ('clients', 'Client Management', 'ניהול לקוחות'),
  ('calendar', 'Smart Calendar', 'יומן חכם'),
  ('auto-messages', 'Message Automation', 'אוטומציית הודעות'),
  ('health_declaration', 'Digital Health Declaration', 'הצהרת בריאות דיגיטלית'),
  ('ai_magic', 'AI Magic Tools', 'כלי AI קסומים'),
  ('shared_client_gallery', 'Client Gallery', 'גלריית לקוחה'),
  ('before_after_collage', 'Before & After Collage', 'קולאז׳ לפני ואחרי'),
  ('whatsapp_automation', 'WhatsApp Automation', 'אוטומציית וואטסאפ'),
  ('white_label', 'White Label Branding', 'מיתוג White Label'),
  ('export_clients_csv', 'Export Clients (CSV)', 'ייצוא לקוחות (CSV)'),
  ('daily_growth_engine', 'Daily Growth Engine', 'מנוע צמיחה יומי'),
  ('digital_card', 'Digital Card', 'כרטיס דיגיטלי'),
  ('push_notifications', 'Push Notifications', 'התראות פוש'),
  ('portfolio', 'Portfolio Gallery', 'גלריית עבודות'),
  ('healing_timeline', 'Healing Timeline', 'ציר החלמה'),
  ('aftercare', 'Aftercare', 'הוראות טיפול'),
  ('messages', 'Messaging Center', 'מרכז הודעות'),
  ('products', 'Products', 'מוצרים'),
  ('voice_notes', 'Voice Notes', 'הערות קוליות'),
  ('referrals', 'Referrals', 'הפניות'),
  ('bonus_center', 'Bonus Center', 'מרכז בונוסים'),
  ('priority_support', 'Priority Support', 'תמיכה מועדפת')
ON CONFLICT (key) DO NOTHING;

-- Also preserve any existing unknown keys from pricing_plans arrays
INSERT INTO public.pricing_features (key, name_en, name_he)
SELECT DISTINCT feature_key, feature_key, feature_key
FROM (
  SELECT unnest(COALESCE(feature_keys, '{}'::text[])) AS feature_key
  FROM public.pricing_plans
) k
WHERE feature_key IS NOT NULL
  AND btrim(feature_key) <> ''
ON CONFLICT (key) DO NOTHING;

-- 5) Backfill junction links from current pricing_plans feature_keys
INSERT INTO public.pricing_plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM public.pricing_plans p
CROSS JOIN LATERAL unnest(COALESCE(p.feature_keys, '{}'::text[])) AS fk(feature_key)
JOIN public.pricing_features f ON f.key = fk.feature_key
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- 6) Canonical resync to ensure array matches mapping table
UPDATE public.pricing_plans p
SET feature_keys = COALESCE((
  SELECT array_agg(f.key ORDER BY f.key)
  FROM public.pricing_plan_features pf
  JOIN public.pricing_features f ON f.id = pf.feature_id
  WHERE pf.plan_id = p.id
), '{}'::text[]),
updated_at = now();