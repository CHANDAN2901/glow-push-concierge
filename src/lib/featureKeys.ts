/**
 * Central Feature Key Map — Single Source of Truth
 *
 * Every key here MUST exactly match the `key` column in the
 * `pricing_features` table in the database.
 *
 * Usage:  <FeatureGate featureKey={FK.DIGITAL_CARD} mode="badge">
 *
 * When adding a new feature:
 *  1. Add a row to `pricing_features` via Super Admin
 *  2. Add the constant here
 *  3. Wrap the UI with <FeatureGate featureKey={FK.YOUR_KEY}>
 */
export const FK = {
  // ── Core / Free-tier ──
  CLIENTS: 'clients',
  CALENDAR: 'calendar',
  AUTO_MESSAGES: 'auto-messages',
  AFTERCARE: 'aftercare',

  // ── Professional tier ──
  DIGITAL_CARD: 'digital_card',
  HEALTH_DECLARATION: 'health_declaration',
  AI_MAGIC: 'ai_magic',
  SHARED_CLIENT_GALLERY: 'shared_client_gallery',
  BEFORE_AFTER_COLLAGE: 'before_after_collage',
  HEALING_TIMELINE: 'healing_timeline',
  PORTFOLIO: 'portfolio',
  MESSAGES: 'messages',
  VOICE_NOTES: 'voice_notes',
  PRODUCTS: 'products',
  PUSH_NOTIFICATIONS: 'push_notifications',

  // ── Master / VIP tier ──
  WHATSAPP_AUTOMATION: 'whatsapp_automation',
  WHITE_LABEL: 'white_label',
  EXPORT_CLIENTS_CSV: 'export_clients_csv',
  DAILY_GROWTH_ENGINE: 'daily_growth_engine',
  REFERRALS: 'referrals',
  BONUS_CENTER: 'bonus_center',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

export type FeatureKey = (typeof FK)[keyof typeof FK];
