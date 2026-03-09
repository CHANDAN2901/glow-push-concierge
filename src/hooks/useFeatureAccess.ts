import { useMemo } from 'react';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Fetch the current user's subscription_tier from profiles */
function useUserTier() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-tier', user?.id],
    queryFn: async () => {
      if (!user) return 'lite';
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return (data?.subscription_tier ?? 'lite') as string;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * Returns a set of feature keys the current user's plan allows,
 * plus a helper to check individual keys.
 */
export function useFeatureAccess() {
  const { data: plans = [] } = usePricingPlans();
  const { data: userTier = 'lite', isLoading: tierLoading } = useUserTier();
  const { user, loading: authLoading } = useAuth();

  const allowedFeatures = useMemo(() => {
    // Find the user's plan by slug matching the tier
    const userPlan = plans.find((p) => p.slug === userTier);
    if (!userPlan) return new Set<string>();

    // Collect features from this plan and all cheaper plans (by sort_order)
    const included = plans
      .filter((p) => p.sort_order <= userPlan.sort_order)
      .flatMap((p) => (p as any).feature_keys ?? []);

    return new Set<string>(included);
  }, [plans, userTier]);

  const hasFeature = (key: string) => allowedFeatures.has(key);

  return {
    allowedFeatures,
    hasFeature,
    userTier,
    isLoading: authLoading || tierLoading,
    isLoggedIn: !!user,
  };
}
