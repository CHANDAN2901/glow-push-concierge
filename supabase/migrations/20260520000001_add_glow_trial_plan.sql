-- Add glow-trial as a managed plan so SuperAdmin can control which features appear on the trial gate
INSERT INTO pricing_plans (slug, name_en, name_he, is_active)
VALUES ('glow-trial', 'Trial', 'ניסיון', true)
ON CONFLICT (slug) DO NOTHING;

-- Link all 12 trial features to the glow-trial plan
INSERT INTO pricing_plan_features (plan_id, feature_id)
SELECT p.id, f.id
FROM pricing_plans p, pricing_features f
WHERE p.slug = 'glow-trial'
  AND f.key IN (
    'clients',
    'healing_timeline',
    'health_declaration',
    'before_after_collage',
    'ai_magic',
    'voice_notes',
    'digital_card',
    'portfolio',
    'push_notifications',
    'whatsapp_automation',
    'white_label',
    'referrals',
    'bonus_center',
    'calendar'
  )
ON CONFLICT (plan_id, feature_id) DO NOTHING;
