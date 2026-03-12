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
export const FEATURES: FeatureFlag[] = [
  // Lite (free/trial) features
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
    id: 'digital_card',
    name: { en: 'Digital Business Card', he: 'כרטיס ביקור דיגיטלי' },
    desc: { en: 'Luxury shareable digital card', he: 'כרטיס דיגיטלי יוקרתי לשיתוף' },
    minTier: 'professional',
  },

  // Professional features
  {
    id: 'health_declaration',
    name: { en: 'Digital Health Declaration', he: 'הצהרת בריאות דיגיטלית' },
    desc: { en: 'Health form with digital signature', he: 'טופס הצהרת בריאות עם חתימה דיגיטלית' },
    minTier: 'professional',
  },
  {
    id: 'ai_magic',
    name: { en: 'AI Magic Tools', he: 'כלי AI קסומים' },
    desc: { en: 'AI-powered notes, captions & comparisons', he: 'הערות, כיתובים והשוואות מבוססי AI' },
    minTier: 'professional',
  },
  {
    id: 'shared_client_gallery',
    name: { en: 'Client Gallery', he: 'גלריית לקוחה' },
    desc: { en: 'Share photos with clients securely', he: 'שיתוף תמונות מאובטח עם לקוחות' },
    minTier: 'professional',
  },
  {
    id: 'before_after_collage',
    name: { en: 'Before & After Collage', he: 'קולאז׳ לפני ואחרי' },
    desc: { en: 'Create branded comparison photos', he: 'יצירת תמונות השוואה ממותגות' },
    minTier: 'professional',
  },

  // Master features
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
    id: 'daily_growth_engine',
    name: { en: 'Daily Growth Engine', he: 'מנוע צמיחה יומי' },
    desc: { en: 'Daily marketing tasks & tips', he: 'משימות שיווק וטיפים יומיים' },
    minTier: 'master',
  },
];

// ─── Tier Definitions ───────────────────────────────────────────
export const TIERS: TierDefinition[] = [
  {
    slug: 'lite',
    name: { en: 'Pro – Basic', he: 'Pro – בסיסי' },
    sortOrder: 0,
    price: { ils: 0, usd: 0 },
    featureKeys: FEATURES.filter(f => f.minTier === 'lite').map(f => f.id),
  },
  {
    slug: 'professional',
    name: { en: 'Elite – Professional', he: 'Elite – מקצועי' },
    sortOrder: 1,
    price: { ils: 79, usd: 22 },
    featureKeys: FEATURES.filter(f => ['lite', 'professional'].includes(f.minTier)).map(f => f.id),
    isHighlighted: true,
    badge: { en: 'Most Popular', he: 'הכי פופולרי' },
  },
  {
    slug: 'master',
    name: { en: 'VIP – Founders', he: 'VIP – מייסדות' },
    sortOrder: 2,
    price: { ils: 149, usd: 42 },
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
  { path: '/admin/timeline-settings', minTier: 'professional', featureId: 'ai_magic' },
];

// ─── Dev Override ───────────────────────────────────────────────
const DEV_TIER_KEY = 'gp-dev-tier-override';

export function getDevTierOverride(): TierSlug | null {
  if (import.meta.env.PROD) return null;
  const val = localStorage.getItem(DEV_TIER_KEY);
  if (val === 'lite' || val === 'professional' || val === 'master') return val;
  return null;
}

export function setDevTierOverride(tier: TierSlug | null): void {
  if (tier) {
    localStorage.setItem(DEV_TIER_KEY, tier);
  } else {
    localStorage.removeItem(DEV_TIER_KEY);
  }
}
