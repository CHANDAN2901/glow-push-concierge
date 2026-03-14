import { useState, useEffect } from 'react';
import { restSelect } from '@/lib/supabase-rest';

export interface HealingPhase {
  id: string;
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
  image_url?: string | null;
}

export function useHealingPhases(treatment: 'eyebrows' | 'lips') {
  const [phases, setPhases] = useState<HealingPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    restSelect<HealingPhase>(
      'healing_phases',
      `treatment_type=eq.${treatment}&order=sort_order.asc`
    )
      .then((data) => {
        if (!cancelled) {
          setPhases(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch healing phases:', err);
          setError(err?.message || 'Failed to load');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [treatment]);

  const getPhaseForDay = (day: number): HealingPhase | null => {
    return phases.find(p => day >= p.day_start && day <= p.day_end) || null;
  };

  return { phases, loading, error, getPhaseForDay };
}
