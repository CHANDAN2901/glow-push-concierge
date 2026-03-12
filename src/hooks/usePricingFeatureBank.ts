import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccessToken, restSelect } from '@/lib/supabase-rest';

export interface PricingFeature {
  id: string;
  key: string;
  name_en: string;
  name_he: string;
  is_active: boolean;
}

const FEATURE_BANK_QUERY_KEY = ['pricing-feature-bank'];

async function fetchMasterPricingFeatures(): Promise<PricingFeature[]> {
  const accessToken = getAccessToken() || undefined;

  return restSelect<PricingFeature>(
    'pricing_features',
    'select=id,key,name_en,name_he,is_active&order=key.asc',
    accessToken
  );
}

export function useMasterPricingFeatures() {
  return useQuery({
    queryKey: FEATURE_BANK_QUERY_KEY,
    queryFn: fetchMasterPricingFeatures,
    staleTime: 0,
  });
}

export function useInvalidatePricingFeatureBank() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: FEATURE_BANK_QUERY_KEY });
}
