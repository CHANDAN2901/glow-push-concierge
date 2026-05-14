-- Add missing features to pricing_features master catalog
-- These features exist in the frontend (featureKeys.ts) but were missing from the DB,
-- so they could never be toggled in Super Admin or unlocked for any user.

INSERT INTO pricing_features (key, name_en, name_he, is_active)
VALUES
  ('ai_magic',            'AI Magic Tools',       'כלי AI קסומים',          true),
  ('auto-messages',       'Message Automation',   'אוטומציית הודעות',        true),
  ('whatsapp_automation', 'WhatsApp Automation',  'אוטומציית וואטסאפ',       true),
  ('white_label',         'White Label Branding', 'מיתוג White Label',       true),
  ('export_clients_csv',  'Export Clients (CSV)', 'ייצוא לקוחות (CSV)',      true)
ON CONFLICT (key) DO NOTHING;

-- Link auto-messages to ALL plans (Pro, Elite, VIP)
INSERT INTO pricing_plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM pricing_plans p
CROSS JOIN pricing_features f
WHERE f.key = 'auto-messages'
ON CONFLICT DO NOTHING;

-- Link ai_magic to Elite and VIP plans only
INSERT INTO pricing_plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM pricing_plans p
CROSS JOIN pricing_features f
WHERE f.key = 'ai_magic'
  AND p.subscription_tier IN ('professional', 'master')
ON CONFLICT DO NOTHING;

-- Link whatsapp_automation, white_label, export_clients_csv to VIP only
INSERT INTO pricing_plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM pricing_plans p
CROSS JOIN pricing_features f
WHERE f.key IN ('whatsapp_automation', 'white_label', 'export_clients_csv')
  AND p.subscription_tier = 'master'
ON CONFLICT DO NOTHING;

-- The sync_pricing_plan_feature_keys trigger will automatically update
-- pricing_plans.feature_keys after these inserts.
