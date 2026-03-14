import { useState, useEffect } from 'react';
import { restSelect } from '@/lib/supabase-rest';
import type { HealingPhase } from '@/hooks/useHealingPhases';

export interface ClientHealingPhase {
  id: string;
  client_id: string;
  source_phase_id: string | null;
  treatment_type: 'eyebrows' | 'lips';
  day_start: number;
  day_end: number;
  title_he: string;
  title_en: string;
  icon: string;
  severity: 'high' | 'medium' | 'low';
  steps_he: string[];
  steps_en: string[];
  sort_order: number;
  image_url: string | null;
}

/**
 * Fetches healing phases specific to a client.
 * Falls back to the global master template if no client-specific phases exist.
 */
export function useClientHealingPhases(
  clientId: string | null | undefined,
  treatment: 'eyebrows' | 'lips'
) {
  const [phases, setPhases] = useState<HealingPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClientSpecific, setIsClientSpecific] = useState(false);

  useEffect(() => {
    // If no clientId, fall back directly to global healing_phases
    if (!clientId) {
      let cancelled = false;
      setLoading(true);
      setError(null);
      setIsClientSpecific(false);

      restSelect<HealingPhase>(
        'healing_phases',
        `treatment_type=eq.${treatment}&order=sort_order.asc`
      )
        .then((globalPhases) => {
          if (!cancelled) {
            setPhases(globalPhases);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            console.error('Failed to fetch global healing phases:', err);
            setError(err?.message || 'Failed to load');
            setLoading(false);
          }
        });

      return () => { cancelled = true; };
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    restSelect<ClientHealingPhase>(
      'client_healing_phases',
      `client_id=eq.${clientId}&treatment_type=eq.${treatment}&order=sort_order.asc`
    )
      .then((clientPhases) => {
        if (cancelled) return;

        if (clientPhases.length > 0) {
          setPhases(
            clientPhases.map((cp) => ({
              id: cp.id,
              treatment_type: cp.treatment_type,
              day_start: cp.day_start,
              day_end: cp.day_end,
              title_he: cp.title_he,
              title_en: cp.title_en,
              icon: cp.icon,
              severity: cp.severity,
              steps_he: cp.steps_he,
              steps_en: cp.steps_en,
              sort_order: cp.sort_order,
            }))
          );
          setIsClientSpecific(true);
          setLoading(false);
          return;
        }

        restSelect<HealingPhase>(
          'healing_phases',
          `treatment_type=eq.${treatment}&order=sort_order.asc`
        )
          .then((globalPhases) => {
            if (cancelled) return;
            setPhases(globalPhases);
            setIsClientSpecific(false);
            setLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            console.error('Failed to fetch global healing phases:', err);
            setError(err?.message || 'Failed to load');
            setLoading(false);
          });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to fetch client healing phases:', err);
        setError(err?.message || 'Failed to load');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, treatment]);

  const getPhaseForDay = (day: number): HealingPhase | null => {
    return phases.find((p) => day >= p.day_start && day <= p.day_end) || null;
  };

  return { phases, loading, error, isClientSpecific, getPhaseForDay };
}
