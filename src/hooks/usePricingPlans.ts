import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PricingPlan {
  id: string;
  slug: string;
  name_en: string;
  name_he: string;
  price_monthly: number;
  price_usd: number;
  original_price_monthly: number;
  original_price_usd: number;
  currency: string;
  is_highlighted: boolean;
  badge_en: string | null;
  badge_he: string | null;
  features_en: string[];
  features_he: string[];
  feature_keys: string[];
  cta_en: string;
  cta_he: string;
  sort_order: number;
  total_promo_spots: number;
  stripe_price_id: string | null;
}

const QUERY_KEY = ['pricing-plans'];

async function fetchPlans(): Promise<PricingPlan[]> {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return (data as unknown as PricingPlan[]) || [];
}

async function fetchVipTaken(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_tier', 'master');
  if (error) throw error;
  return count ?? 0;
}

export function usePricingPlans() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPlans,
    staleTime: 0, // Always refetch to reflect admin changes
  });
  return query;
}

export function useVipTakenCount() {
  return useQuery({
    queryKey: ['vip-taken-count'],
    queryFn: fetchVipTaken,
    staleTime: 30_000,
  });
}

export function useInvalidatePricingPlans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

export { QUERY_KEY as PRICING_PLANS_QUERY_KEY };
