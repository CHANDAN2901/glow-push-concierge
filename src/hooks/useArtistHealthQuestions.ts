import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { HealthQuestion } from './useHealthQuestions';

export interface ArtistHealthQuestion extends HealthQuestion {
  is_included: boolean;
  custom_text_he?: string;
  custom_text_en?: string;
  has_override: boolean;
  is_custom?: boolean; // true = artist-created question
}

/**
 * For the artist editor: fetches all active admin questions + artist overrides + artist custom questions.
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

      // Fetch artist custom questions
      const { data: customQs, error: cErr } = await supabase
        .from('artist_custom_health_questions' as any)
        .select('*')
        .eq('artist_profile_id', artistProfileId)
        .order('sort_order', { ascending: true });
      if (cErr) throw cErr;

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
          is_custom: false,
        } as ArtistHealthQuestion;
      });

      // Append artist custom questions
      const customMapped: ArtistHealthQuestion[] = (customQs || []).map((q: any) => ({
        id: q.id,
        question_he: q.question_he,
        question_en: q.question_en,
        icon: q.icon,
        risk_level: q.risk_level,
        has_detail_field: q.has_detail_field,
        detail_placeholder_he: q.detail_placeholder_he,
        detail_placeholder_en: q.detail_placeholder_en,
        sort_order: q.sort_order,
        is_active: true,
        created_at: q.created_at,
        updated_at: q.created_at,
        is_included: true,
        has_override: false,
        is_custom: true,
      }));

      setQuestions([...merged, ...customMapped]);
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
 * For client-facing form: fetches active admin questions filtered by artist overrides + artist custom questions.
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

        // Fetch artist custom questions
        let customQs: any[] = [];
        if (artistId) {
          const { data, error: cErr } = await supabase
            .from('artist_custom_health_questions' as any)
            .select('*')
            .eq('artist_profile_id', artistId)
            .order('sort_order', { ascending: true });
          if (!cErr && data) customQs = data;
        }

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

        // If no overrides exist, return all admin questions + custom
        if (!overrides || overrides.length === 0) {
          const allQs = [
            ...((adminQs || []) as HealthQuestion[]),
            ...customQs.map((q: any) => ({
              id: q.id,
              question_he: q.question_he,
              question_en: q.question_en,
              icon: q.icon,
              risk_level: q.risk_level,
              has_detail_field: q.has_detail_field,
              detail_placeholder_he: q.detail_placeholder_he,
              detail_placeholder_en: q.detail_placeholder_en,
              sort_order: q.sort_order,
              is_active: true,
              created_at: q.created_at,
              updated_at: q.created_at,
            } as HealthQuestion)),
          ];
          setQuestions(allQs);
          setLoading(false);
          return;
        }

        const overrideMap = new Map(
          overrides.map((o: any) => [o.question_id, o])
        );

        const filtered: HealthQuestion[] = (adminQs || [])
          .filter((q: any) => {
            const override = overrideMap.get(q.id);
            return !override || override.is_included !== false;
          })
          .map((q: any) => {
            const override = overrideMap.get(q.id);
            return {
              ...q,
              question_he: override?.custom_text_he || q.question_he,
              question_en: override?.custom_text_en || q.question_en,
            } as HealthQuestion;
          });

        // Append custom questions
        const customMapped: HealthQuestion[] = customQs.map((q: any) => ({
          id: q.id,
          question_he: q.question_he,
          question_en: q.question_en,
          icon: q.icon,
          risk_level: q.risk_level,
          has_detail_field: q.has_detail_field,
          detail_placeholder_he: q.detail_placeholder_he,
          detail_placeholder_en: q.detail_placeholder_en,
          sort_order: q.sort_order,
          is_active: true,
          created_at: q.created_at,
          updated_at: q.created_at,
        }));

        setQuestions([...filtered, ...customMapped]);
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
