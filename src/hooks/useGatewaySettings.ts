import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type GatewayMode = 'auto' | 'tranzilla_only' | 'lemonsqueezy_only' | 'both';
export type ResolvedGateway = 'tranzilla' | 'lemonsqueezy' | 'both';

function detectIsIsrael(): boolean {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Jerusalem';
  } catch {
    return false;
  }
}

export function resolveGateway(mode: GatewayMode): ResolvedGateway {
  if (mode === 'tranzilla_only') return 'tranzilla';
  if (mode === 'lemonsqueezy_only') return 'lemonsqueezy';
  if (mode === 'both') return 'both';
  return detectIsIsrael() ? 'tranzilla' : 'lemonsqueezy';
}

export function useGatewaySettings() {
  const { data: gatewayMode = 'auto', isLoading } = useQuery<GatewayMode>({
    queryKey: ['app_settings', 'gateway_mode'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gateway_mode')
        .maybeSingle();
      return (data?.value as GatewayMode) ?? 'auto';
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    gatewayMode,
    resolvedGateway: resolveGateway(gatewayMode),
    isIsrael: detectIsIsrael(),
    isLoading,
  };
}
