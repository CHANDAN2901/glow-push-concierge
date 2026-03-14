import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { restSelect } from '@/lib/supabase-rest';
import { isLegacyTimelineOverride } from '@/lib/timeline-overrides';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HealingPhaseRow {
  id: string;
  day_start: number;
  day_end: number;
  title_he: string;
  title_en: string;
  steps_he: string[];
  steps_en: string[];
  sort_order: number;
}

interface StepContent {
  step_index: number;
  dayLabel: string;
  instruction_he: string;
  instruction_en: string;
  default_instruction_he: string;
  default_instruction_en: string;
}

export default function TimelineContentEditorPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<StepContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [baseStepCount, setBaseStepCount] = useState(0);

  const loadData = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setSteps([]);
      setProfileId(null);
      setBaseStepCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const globalPhases = await restSelect<HealingPhaseRow>(
        'healing_phases',
        'treatment_type=eq.eyebrows&order=sort_order.asc'
      );

      const baseSteps: StepContent[] = globalPhases.map((phase, i) => {
        const dayLabel = phase.day_start === phase.day_end
          ? `יום ${phase.day_start}`
          : `ימים ${phase.day_start}-${phase.day_end}`;

        const defaultInstructionHe = phase.steps_he.join('\n') || phase.title_he;
        const defaultInstructionEn = phase.steps_en.join('\n') || phase.title_en;

        return {
          step_index: i,
          dayLabel,
          instruction_he: defaultInstructionHe,
          instruction_en: defaultInstructionEn,
          default_instruction_he: defaultInstructionHe,
          default_instruction_en: defaultInstructionEn,
        };
      });

      setBaseStepCount(baseSteps.length);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        setProfileId(null);
        setSteps(baseSteps);
        return;
      }

      setProfileId(profile.id);

      const { data: rows, error: rowsError } = await supabase
        .from('timeline_content' as any)
        .select('step_index, quote_he, quote_en')
        .eq('artist_profile_id', profile.id)
        .order('step_index');

      if (rowsError) throw rowsError;

      const overridesByIndex = new Map<number, { quote_he: string | null; quote_en: string | null }>(
        ((rows as any[]) || []).map((row: any) => [row.step_index, { quote_he: row.quote_he, quote_en: row.quote_en }])
      );

      const merged = baseSteps.map((base) => {
        const row = overridesByIndex.get(base.step_index);
        if (!row) return base;

        return {
          ...base,
          instruction_he: row.quote_he || base.instruction_he,
          instruction_en: row.quote_en || base.instruction_en,
        };
      });

      setSteps(merged);
    } catch (error) {
      console.error('Failed to load timeline content editor data:', error);
      setSteps([]);
      toast({ title: 'שגיאה בטעינת מסע ההחלמה', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStep = (idx: number, field: 'instruction_he' | 'instruction_en', value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    if (!profileId) return;

    setSaving(true);
    try {
      await supabase
        .from('timeline_content')
        .delete()
        .eq('artist_profile_id', profileId)
        .gte('step_index', baseStepCount);

      for (const step of steps.filter((s) => s.step_index < baseStepCount)) {
        const currentHe = step.instruction_he.trim();
        const currentEn = step.instruction_en.trim();
        const defaultHe = step.default_instruction_he.trim();
        const defaultEn = step.default_instruction_en.trim();
        const isDefault = currentHe === defaultHe && currentEn === defaultEn;

        if (isDefault) {
          const { error: deleteError } = await supabase
            .from('timeline_content')
            .delete()
            .eq('artist_profile_id', profileId)
            .eq('step_index', step.step_index);
          if (deleteError) throw deleteError;
          continue;
        }

        const { error: upsertError } = await (supabase as any)
          .from('timeline_content')
          .upsert(
            {
              artist_profile_id: profileId,
              step_index: step.step_index,
              quote_he: step.instruction_he,
              quote_en: step.instruction_en,
              tip_he: '',
              tip_en: '',
            },
            { onConflict: 'artist_profile_id,step_index' }
          );

        if (upsertError) throw upsertError;
      }

      await loadData();
      toast({ title: 'התוכן עודכן בהצלחה ויוצג ללקוחותייך ✅', className: 'bg-green-600 text-white border-green-700' });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'שגיאה בשמירה: ' + (err?.message || 'Unknown'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <AdminSidebar active={'timeline' as any} onNavigate={(v) => {
        if (v === 'timeline') return;
        if (v === 'aftercare') return navigate('/admin/aftercare');
        return navigate('/super-admin', { state: { view: v } });
      }} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">ניהול תכני החלמה</h1>
              <p className="text-xs text-muted-foreground">עריכת ההנחיות שמוצגות ללקוחות בכל שלב של מסע ההחלמה</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : (
            <div className="space-y-4 relative pb-20" dir="rtl">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h2 className="font-serif font-semibold text-lg">הנחיות ללקוחה — לפי שלב</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  כתבי הנחיה אחת לכל שלב. הלקוחה תראה אותה מתחת לתמונת ההחלמה.
                </p>

                <div className="space-y-5">
                  {steps.map((step, idx) => (
                    <div key={step.step_index} className="border border-border rounded-xl p-5 space-y-3">
                      <div
                        className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wide"
                        style={{
                          background: 'linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))',
                          color: 'hsl(0 0% 100%)',
                        }}
                      >
                        {step.dayLabel}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">📋 הנחיות ללקוחה בעברית</label>
                          <Textarea
                            value={step.instruction_he}
                            onChange={(e) => updateStep(idx, 'instruction_he', e.target.value)}
                            dir="rtl"
                            className="text-sm min-h-[80px]"
                            placeholder={step.default_instruction_he}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">📋 Instructions in English</label>
                          <Textarea
                            value={step.instruction_en}
                            onChange={(e) => updateStep(idx, 'instruction_en', e.target.value)}
                            dir="ltr"
                            className="text-sm min-h-[80px] text-muted-foreground"
                            placeholder={step.default_instruction_en}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-6 flex justify-start">
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                  {saving ? 'שומר…' : 'שמור שינויים'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
