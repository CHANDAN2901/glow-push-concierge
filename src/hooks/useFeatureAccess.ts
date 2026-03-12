import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  TIERS,
  FEATURES,
  tierHasFeature,
  getDevTierOverride,
  type TierSlug,
  type FeatureFlag,
} from '@/lib/subscriptionConfig';

const TIER_QUERY_KEY = 'user-tier';

/** Fetch the current user's subscription_tier from profiles */
function useUserTier() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [TIER_QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user) return 'lite' as TierSlug;
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return (data?.subscription_tier ?? 'lite') as TierSlug;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * Central hook for checking feature access.
 * Respects dev tier override in development mode.
 */
export function useFeatureAccess() {
  const { data: dbTier = 'lite' as TierSlug, isLoading: tierLoading } = useUserTier();
  const { user, loading: authLoading } = useAuth();

  // Dev override takes precedence in non-production
  const effectiveTier: TierSlug = getDevTierOverride() ?? dbTier;

  const allowedFeatures = useMemo(() => {
    const tier = TIERS.find(t => t.slug === effectiveTier);
    if (!tier) return new Set<string>();
    return new Set<string>(tier.featureKeys);
  }, [effectiveTier]);

  const hasFeature = (key: string) => allowedFeatures.has(key);

  /** Get the feature definition if it exists and is locked */
  const getLockedFeature = (key: string): FeatureFlag | null => {
    if (hasFeature(key)) return null;
    return FEATURES.find(f => f.id === key) || null;
  };

  return {
    allowedFeatures,
    hasFeature,
    getLockedFeature,
    userTier: effectiveTier,
    dbTier,
    isLoading: authLoading || tierLoading,
    isLoggedIn: !!user,
  };
}

/** Hook to invalidate the tier query (e.g. after dev override change) */
export function useInvalidateTier() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: [TIER_QUERY_KEY] });
}
