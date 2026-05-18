/**
 * Central Subscription Configuration — Single Source of Truth
 *
 * All tier definitions, feature flags, and pricing live here.
 * The Pricing screen, FeatureGate, UpgradeModal, and route guards
 * all derive their behaviour from this file.
 */

export type TierSlug = 'lite' | 'professional' | 'master';

export interface FeatureFlag {
  /** Machine-readable key (matches pricing_plans.feature_keys) */
  id: string;
  /** Display names */
  name: { en: string; he: string };
  /** Short description for pricing cards */
  desc: { en: string; he: string };
  /** Minimum tier that unlocks this feature */
  minTier: TierSlug;
  /** Optional: also available during trial */
  availableInTrial?: boolean;
}

export interface TierDefinition {
  slug: TierSlug;
  /** Display name */
  name: { en: string; he: string };
  /** Sort order (lower = cheaper) */
  sortOrder: number;
  /** Monthly price */
  price: { ils: number; usd: number };
  /** All feature keys included in this tier */
  featureKeys: string[];
  /** Badge shown on pricing card */
  badge?: { en: string; he: string };
  /** Whether this is the highlighted/recommended plan */
  isHighlighted?: boolean;
}

// ─── Feature Registry ───────────────────────────────────────────
// Ordered to match DB pricing_plans.feature_keys (source of truth).
export const FEATURES: FeatureFlag[] = [
  // ── Lite / Pro — included in base plan ──
  {
    id: 'clients',
    name: { en: 'Client Management', he: 'ניהול לקוחות' },
    desc: { en: 'Manage your client database', he: 'ניהול מאגר הלקוחות שלך' },
    minTier: 'lite',
  },
  {
    id: 'calendar',
    name: { en: 'Smart Calendar', he: 'יומן חכם' },
    desc: { en: 'Schedule and manage appointments', he: 'תזמון וניהול תורים' },
    minTier: 'lite',
  },
  {
    id: 'auto-messages',
    name: { en: 'Message Automation', he: 'אוטומציית הודעות' },
    desc: { en: 'Auto-send client links via WhatsApp', he: 'שליחת הקישור ללקוחה בוואטסאפ אוטומטית' },
    minTier: 'lite',
    availableInTrial: true,
  },
  {
    id: 'aftercare',
    name: { en: 'Aftercare', he: 'טיפול לאחר' },
    desc: { en: 'Post-treatment aftercare management', he: 'ניהול טיפול לאחר הטיפול' },
    minTier: 'lite',
  },
  {
    id: 'healing_timeline',
    name: { en: 'Healing Timeline', he: 'ציר זמן ריפוי' },
    desc: { en: 'Day-by-day healing journey for clients', he: 'מסע ריפוי יומי ללקוחות' },
    minTier: 'lite',
  },
  {
    id: 'health_declaration',
    name: { en: 'Digital Health Declaration', he: 'הצהרת בריאות דיגיטלית' },
    desc: { en: 'Health form with digital signature', he: 'טופס הצהרת בריאות עם חתימה דיגיטלית' },
    minTier: 'lite',
  },
  {
    id: 'messages',
    name: { en: 'Messages', he: 'הודעות' },
    desc: { en: 'Client messaging and notifications', he: 'הודעות והתראות ללקוחות' },
    minTier: 'lite',
  },
  {
    id: 'portfolio',
    name: { en: 'Portfolio', he: 'פורטפוליו' },
    desc: { en: 'Public portfolio gallery by category', he: 'גלריית פורטפוליו ציבורית לפי קטגוריה' },
    minTier: 'lite',
  },
  {
    id: 'push_notifications',
    name: { en: 'Push Notifications', he: 'התראות Push' },
    desc: { en: 'Daily healing reminders via push', he: 'תזכורות ריפוי יומיות דרך Push' },
    minTier: 'lite',
  },
  {
    id: 'before_after_collage',
    name: { en: 'Before & After Collage', he: 'קולאז׳ לפני ואחרי' },
    desc: { en: 'Create branded comparison photos', he: 'יצירת תמונות השוואה ממותגות' },
    minTier: 'lite',
  },
  {
    id: 'shared_client_gallery',
    name: { en: 'Client Gallery', he: 'גלריית לקוחה' },
    desc: { en: 'Share photos with clients securely', he: 'שיתוף תמונות מאובטח עם לקוחות' },
    minTier: 'lite',
  },

  // ── Professional / Elite ──
  {
    id: 'digital_card',
    name: { en: 'Digital Business Card', he: 'כרטיס ביקור דיגיטלי' },
    desc: { en: 'Luxury shareable digital card', he: 'כרטיס דיגיטלי יוקרתי לשיתוף' },
    minTier: 'professional',
  },
  {
    id: 'ai_magic',
    name: { en: 'AI Magic Tools', he: 'כלי AI קסומים' },
    desc: { en: 'AI-powered captions & comparisons', he: 'כיתובים והשוואות מבוססי AI' },
    minTier: 'professional',
  },
  {
    id: 'voice_notes',
    name: { en: 'Voice Treatment Notes', he: 'הערות קוליות לטיפול' },
    desc: { en: 'Record and transcribe treatment notes', he: 'הקלטה ותמלול הערות טיפול' },
    minTier: 'professional',
  },
  {
    id: 'referrals',
    name: { en: 'Referral System', he: 'מערכת הפניות' },
    desc: { en: 'Earn credits by referring artists', he: 'הרווחי קרדיטים על הפניית אמניות' },
    minTier: 'professional',
  },
  {
    id: 'bonus_center',
    name: { en: 'Bonus Center', he: 'מרכז בונוסים' },
    desc: { en: 'Earn and redeem bonus rewards', he: 'הרווחי ומימשי פרסים' },
    minTier: 'professional',
  },
  {
    id: 'daily_growth_engine',
    name: { en: 'Daily Growth Engine', he: 'מנוע צמיחה יומי' },
    desc: { en: 'Daily marketing tasks & tips', he: 'משימות שיווק וטיפים יומיים' },
    minTier: 'professional',
  },

  // ── Master / VIP ──
  {
    id: 'whatsapp_automation',
    name: { en: 'WhatsApp Automation', he: 'אוטומציית וואטסאפ' },
    desc: { en: 'Full automated messaging pipeline', he: 'צינור הודעות אוטומטי מלא' },
    minTier: 'master',
  },
  {
    id: 'white_label',
    name: { en: 'White Label Branding', he: 'מיתוג White Label' },
    desc: { en: 'Fully branded client experience', he: 'חוויית לקוח ממותגת לחלוטין' },
    minTier: 'master',
  },
  {
    id: 'export_clients_csv',
    name: { en: 'Export Clients (CSV)', he: 'ייצוא לקוחות (CSV)' },
    desc: { en: 'Download your client list as CSV', he: 'הורדת רשימת לקוחות כ-CSV' },
    minTier: 'master',
  },
  {
    id: 'priority_support',
    name: { en: 'Priority Support', he: 'תמיכה עדיפה' },
    desc: { en: 'Priority customer support forever', he: 'תמיכת לקוחות עדיפה לתמיד' },
    minTier: 'master',
  },
];

// ─── Tier Definitions ───────────────────────────────────────────
export const TIERS: TierDefinition[] = [
  {
    slug: 'lite',
    name: { en: 'Glow Push Pro', he: 'Glow Push Pro' },
    sortOrder: 0,
    price: { ils: 139, usd: 34 },
    featureKeys: FEATURES.filter(f => f.minTier === 'lite').map(f => f.id),
  },
  {
    slug: 'professional',
    name: { en: 'Glow Push Elite', he: 'Glow Push Elite' },
    sortOrder: 1,
    price: { ils: 157, usd: 49 },
    featureKeys: FEATURES.filter(f => ['lite', 'professional'].includes(f.minTier)).map(f => f.id),
    isHighlighted: true,
    badge: { en: '⭐ Most Popular', he: '⭐ הכי פופולרי' },
  },
  {
    slug: 'master',
    name: { en: 'Glow Push VIP', he: 'Glow Push VIP' },
    sortOrder: 2,
    price: { ils: 999, usd: 415 },
    featureKeys: FEATURES.map(f => f.id),
  },
];

// ─── Helpers ────────────────────────────────────────────────────

/** Get tier definition by slug */
export function getTier(slug: TierSlug): TierDefinition | undefined {
  return TIERS.find(t => t.slug === slug);
}

/** Get feature definition by id */
export function getFeature(id: string): FeatureFlag | undefined {
  return FEATURES.find(f => f.id === id);
}

/** Get the minimum tier required for a feature */
export function getMinTierForFeature(featureId: string): TierSlug | undefined {
  return FEATURES.find(f => f.id === featureId)?.minTier;
}

/** Check if a tier includes a feature */
export function tierHasFeature(tierSlug: TierSlug, featureId: string): boolean {
  const tier = getTier(tierSlug);
  return tier ? tier.featureKeys.includes(featureId) : false;
}

/** Compare tiers: returns positive if a > b */
export function compareTiers(a: TierSlug, b: TierSlug): number {
  const tierA = getTier(a);
  const tierB = getTier(b);
  return (tierA?.sortOrder ?? 0) - (tierB?.sortOrder ?? 0);
}

/** Get features that are in the upgrade tier but not in the current tier */
export function getUpgradeFeatures(currentTier: TierSlug, upgradeTier: TierSlug): FeatureFlag[] {
  const current = getTier(currentTier);
  const upgrade = getTier(upgradeTier);
  if (!current || !upgrade) return [];
  const currentKeys = new Set(current.featureKeys);
  return FEATURES.filter(f => upgrade.featureKeys.includes(f.id) && !currentKeys.has(f.id));
}

/** Routes that require a minimum tier */
export const PROTECTED_ROUTES: { path: string; minTier: TierSlug; featureId: string }[] = [
  { path: '/admin/timeline-settings', minTier: 'lite', featureId: 'healing_timeline' },
];

// ─── Dev / Impersonation Override ───────────────────────────────
const DEV_TIER_KEY = 'gp-dev-tier-override';

const OVERRIDE_TO_TIER: Record<string, TierSlug> = {
  lite: 'lite',
  professional: 'professional',
  master: 'master',
  pro: 'lite',
  elite: 'professional',
  'vip-3year': 'master',
};

export function getDevTierOverride(): TierSlug | null {
  const raw = localStorage.getItem(DEV_TIER_KEY);
  if (!raw) return null;
  return OVERRIDE_TO_TIER[raw] ?? null;
}

export function setDevTierOverride(tier: TierSlug | null): void {
  if (tier) {
    localStorage.setItem(DEV_TIER_KEY, tier);
  } else {
    localStorage.removeItem(DEV_TIER_KEY);
  }
}
