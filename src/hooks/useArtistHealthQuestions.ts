import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HealthQuestion } from './useHealthQuestions';

export interface ArtistHealthQuestion extends HealthQuestion {
  is_included: boolean;
  custom_text_he?: string;
  custom_text_en?: string;
  has_override: boolean;
}

/**
 * For the artist editor: fetches all active admin questions + artist overrides.
 */
export function useArtistHealthQuestionsEditor(artistProfileId: string | null) {
  const [questions, setQuestions] = useState<ArtistHealthQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    if (!artistProfileId) return;
    setLoading(true);
    try {
      // Fetch all active admin questions
      const { data: adminQs, error: qErr } = await supabase
        .from('health_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (qErr) throw qErr;

      // Fetch artist overrides
      const { data: overrides, error: oErr } = await supabase
        .from('artist_health_question_overrides')
        .select('*')
        .eq('artist_profile_id', artistProfileId);
      if (oErr) throw oErr;

      const overrideMap = new Map(
        (overrides || []).map((o: any) => [o.question_id, o])
      );

      const merged: ArtistHealthQuestion[] = (adminQs || []).map((q: any) => {
        const override = overrideMap.get(q.id);
        return {
          ...q,
          is_included: override ? override.is_included : true,
          custom_text_he: override?.custom_text_he || undefined,
          custom_text_en: override?.custom_text_en || undefined,
          has_override: !!override,
        } as ArtistHealthQuestion;
      });

      setQuestions(merged);
    } catch (err) {
      console.error('Failed to fetch artist health questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [artistProfileId]);

  return { questions, loading, refetch: fetchQuestions, setQuestions };
}

/**
 * For client-facing form: fetches active admin questions filtered by artist overrides.
 * Returns only the questions the artist has included (or all if no overrides exist).
 */
export function useClientHealthQuestions(artistId: string | null) {
  const [questions, setQuestions] = useState<HealthQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Fetch all active admin questions
        const { data: adminQs, error: qErr } = await supabase
          .from('health_questions')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (qErr) throw qErr;

        if (!artistId) {
          setQuestions((adminQs || []) as HealthQuestion[]);
          setLoading(false);
          return;
        }

        // Fetch artist overrides
        const { data: overrides, error: oErr } = await supabase
          .from('artist_health_question_overrides')
          .select('*')
          .eq('artist_profile_id', artistId);
        if (oErr) throw oErr;

        // If no overrides exist, return all admin questions
        if (!overrides || overrides.length === 0) {
          setQuestions((adminQs || []) as HealthQuestion[]);
          setLoading(false);
          return;
        }

        const overrideMap = new Map(
          overrides.map((o: any) => [o.question_id, o])
        );

        const filtered: HealthQuestion[] = (adminQs || [])
          .filter((q: any) => {
            const override = overrideMap.get(q.id);
            // If override exists and is_included is false, exclude
            return !override || override.is_included !== false;
          })
          .map((q: any) => {
            const override = overrideMap.get(q.id);
            return {
              ...q,
              // Apply custom text if exists
              question_he: override?.custom_text_he || q.question_he,
              question_en: override?.custom_text_en || q.question_en,
            } as HealthQuestion;
          });

        setQuestions(filtered);
      } catch (err) {
        console.error('Failed to fetch client health questions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [artistId]);

  return { questions, loading };
}
