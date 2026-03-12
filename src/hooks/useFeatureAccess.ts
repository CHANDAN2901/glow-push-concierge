import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  FEATURES,
  getDevTierOverride,
  type TierSlug,
  type FeatureFlag,
} from '@/lib/subscriptionConfig';

const TIER_QUERY_KEY = 'user-tier';
const TIER_FEATURES_QUERY_KEY = 'tier-feature-keys';

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
 * Fetch the feature_keys array from pricing_plans for a given tier slug.
 * This is the LIVE database source of truth for which features a tier unlocks.
 */
function useTierFeatureKeys(tierSlug: TierSlug) {
  return useQuery({
    queryKey: [TIER_FEATURES_QUERY_KEY, tierSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('feature_keys')
        .eq('slug', tierSlug)
        .single();
      if (error) {
        console.warn('Failed to fetch tier feature_keys from DB, falling back to empty', error);
        return [] as string[];
      }
      return (data?.feature_keys ?? []) as string[];
    },
    staleTime: 30_000, // refresh every 30s to pick up admin changes quickly
  });
}

/**
 * Central hook for checking feature access.
 * Reads feature_keys from the LIVE pricing_plans table in the database.
 * Respects dev tier override / impersonation in development mode.
 */
export function useFeatureAccess() {
  const { data: dbTier = 'lite' as TierSlug, isLoading: tierLoading } = useUserTier();
  const { user, loading: authLoading } = useAuth();

  // Dev override / impersonation takes precedence
  const effectiveTier: TierSlug = getDevTierOverride() ?? dbTier;

  // Fetch the LIVE feature_keys from the database for the effective tier
  const { data: liveFeatureKeys = [], isLoading: featuresLoading } = useTierFeatureKeys(effectiveTier);

  const allowedFeatures = useMemo(() => {
    return new Set<string>(liveFeatureKeys);
  }, [liveFeatureKeys]);

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
    isLoading: authLoading || tierLoading || featuresLoading,
    isLoggedIn: !!user,
  };
}

/** Hook to invalidate the tier query (e.g. after dev override change) */
export function useInvalidateTier() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [TIER_QUERY_KEY] });
    qc.invalidateQueries({ queryKey: [TIER_FEATURES_QUERY_KEY] });
  };
}
