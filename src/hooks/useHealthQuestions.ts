import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HealthQuestion {
  id: string;
  question_he: string;
  question_en: string;
  risk_level: 'red' | 'yellow' | 'green';
  icon: string;
  has_detail_field: boolean;
  detail_placeholder_he: string;
  detail_placeholder_en: string;
  sort_order: number;
  is_active: boolean;
}

export function useHealthQuestions() {
  const [questions, setQuestions] = useState<HealthQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_questions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as HealthQuestion[]);
    } catch (err) {
      console.error('Failed to fetch health questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return { questions, loading, refetch: fetchQuestions };
}

export function useAllHealthQuestions() {
  const [questions, setQuestions] = useState<HealthQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_questions')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setQuestions((data || []) as HealthQuestion[]);
    } catch (err) {
      console.error('Failed to fetch health questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return { questions, loading, refetch: fetchQuestions };
}

/** Calculate risk level from dynamic answers + question definitions */
export function calculateDynamicRiskLevel(
  answers: Record<string, boolean>,
  questions: HealthQuestion[]
): 'red' | 'yellow' | 'green' {
  let maxRisk: 'green' | 'yellow' | 'red' = 'green';

  for (const q of questions) {
    if (answers[q.id]) {
      if (q.risk_level === 'red') return 'red';
      if (q.risk_level === 'yellow') maxRisk = 'yellow';
    }
  }

  return maxRisk;
}
