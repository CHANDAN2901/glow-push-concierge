import { setDevTierOverride, type TierSlug } from '@/lib/subscriptionConfig';

const IMPERSONATION_KEY = 'gp-impersonation';

export interface ImpersonationState {
  userName: string;
  studioName: string;
  tier: TierSlug;
}

export function startImpersonation(state: ImpersonationState) {
  localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  setDevTierOverride(state.tier);
}

export function stopImpersonation() {
  localStorage.removeItem(IMPERSONATION_KEY);
  setDevTierOverride(null);
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImpersonationState;
  } catch {
    return null;
  }
}
