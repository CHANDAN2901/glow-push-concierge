import { setDevTierOverride, type TierSlug } from '@/lib/subscriptionConfig';

const IMPERSONATION_KEY = 'gp-impersonation';

const TIER_NORMALIZATION: Record<string, TierSlug> = {
  lite: 'lite',
  professional: 'professional',
  master: 'master',
  pro: 'lite',
  elite: 'professional',
  'vip-3year': 'master',
};

function normalizeTier(value: unknown): TierSlug {
  if (typeof value !== 'string') return 'lite';
  return TIER_NORMALIZATION[value] ?? 'lite';
}

export interface ImpersonationState {
  userName: string;
  studioName: string;
  tier: TierSlug;
}

export function startImpersonation(state: ImpersonationState) {
  const normalized: ImpersonationState = {
    ...state,
    tier: normalizeTier(state.tier),
  };
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(normalized));
  setDevTierOverride(normalized.tier);
}

export function stopImpersonation() {
  localStorage.removeItem(IMPERSONATION_KEY);
  setDevTierOverride(null);
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ImpersonationState>;
    return {
      userName: parsed.userName ?? '',
      studioName: parsed.studioName ?? '',
      tier: normalizeTier(parsed.tier),
    };
  } catch {
    return null;
  }
}
