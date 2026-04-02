import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, Sparkles, GripVertical, Plus, Trash2 } from 'lucide-react';
import healingCharsImg from '@/assets/healing-characters.jpg';
import { supabase } from '@/integrations/supabase/client';
import { restSelect } from '@/lib/supabase-rest';
import { isLegacyTimelineOverride } from '@/lib/timeline-overrides';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

const STEP_SPRITES: { col: number; row: number }[] = [
  { col: 2, row: 0 },
  { col: 1, row: 0 },
  { col: 0, row: 0 },
  { col: 2, row: 1 },
  { col: 1, row: 1 },
  { col: 0, row: 1 },
];

interface HealingPhaseRow {
  id: string;
  treatment_type: string;
  day_start: number;
  day_end: number;
  title_he: string;
  title_en: string;
  icon: string;
  severity: string;
  steps_he: string[];
  steps_en: string[];
  sort_order: number;
}

interface StepContent {
  step_index: number;
  title_he: string;
  title_en: string;
  instruction_he: string;
  instruction_en: string;
  default_instruction_he: string;
  default_instruction_en: string;
  dayLabel: string;
  isCustom?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const goldGradient = 'linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))';

export default function HealingJourneyEditorDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [steps, setSteps] = useState<StepContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [baseStepCount, setBaseStepCount] = useState(0);

  const loadTimelineSteps = useCallback(async () => {
    if (authLoading || !open) return;
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

      const baseSteps: StepContent[] = globalPhases.map((p, i) => {
        const dayLabel = p.day_start === p.day_end
          ? `יום ${p.day_start}`
          : `ימים ${p.day_start}-${p.day_end}`;
        const defaultInstructionHe = p.steps_he.join('\n') || p.title_he;
        const defaultInstructionEn = p.steps_en.join('\n') || p.title_en;

        return {
          step_index: i,
          dayLabel,
          title_he: p.title_he,
          title_en: p.title_en,
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
        if (!row || isLegacyTimelineOverride(row.quote_he, row.quote_en)) return base;
        return {
          ...base,
          instruction_he: row.quote_he || base.instruction_he,
          instruction_en: row.quote_en || base.instruction_en,
        };
      });

      // Load custom steps (step_index >= baseStepCount)
      const customRows = ((rows as any[]) || []).filter((r: any) => r.step_index >= baseSteps.length);
      const customSteps: StepContent[] = customRows.map((r: any) => ({
        step_index: r.step_index,
        dayLabel: '',
        title_he: r.quote_he || '',
        title_en: r.quote_en || '',
        instruction_he: r.quote_he || '',
        instruction_en: r.quote_en || '',
        default_instruction_he: '',
        default_instruction_en: '',
        isCustom: true,
      }));

      setSteps([...merged, ...customSteps]);
    } catch (e) {
      console.error('Failed to load timeline settings:', e);
      setSteps([]);
      toast({ title: 'שגיאה בטעינת מסע ההחלמה', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, toast, open]);

  useEffect(() => {
    if (open) loadTimelineSteps();
  }, [open, loadTimelineSteps]);

  const updateStep = (idx: number, field: keyof StepContent, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const addCustomStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_index: baseStepCount + prev.filter((s) => s.isCustom).length,
        dayLabel: '',
        title_he: '',
        title_en: '',
        instruction_he: '',
        instruction_en: '',
        default_instruction_he: '',
        default_instruction_en: '',
        isCustom: true,
      },
    ]);
  };

  const removeCustomStep = (idx: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!profileId) {
      toast({ title: 'יש להתחבר כדי לשמור שינויים', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await supabase
        .from('timeline_content')
        .delete()
        .eq('artist_profile_id', profileId)
        .gte('step_index', baseStepCount);

      for (const step of steps) {
        if (!step.isCustom) {
          const currentHe = step.instruction_he.trim();
          const currentEn = step.instruction_en.trim();
          const defaultHe = step.default_instruction_he.trim();
          const defaultEn = step.default_instruction_en.trim();
          const isDefault = currentHe === defaultHe && currentEn === defaultEn;

          if (isDefault) {
            await supabase
              .from('timeline_content')
              .delete()
              .eq('artist_profile_id', profileId)
              .eq('step_index', step.step_index);
            continue;
          }
        }

        const { error: upsertError } = await (supabase as any)
          .from('timeline_content')
          .upsert(
            {
              artist_profile_id: profileId,
              step_index: step.step_index,
              quote_he: step.isCustom ? step.title_he : step.instruction_he,
              quote_en: step.isCustom ? step.title_en : step.instruction_en,
              tip_he: '',
              tip_en: '',
            },
            { onConflict: 'artist_profile_id,step_index' }
          );

        if (upsertError) throw upsertError;
      }

      await loadTimelineSteps();
      toast({ title: 'התוכן עודכן בהצלחה ויוצג ללקוחותייך ✅', className: 'bg-green-600 text-white border-green-700' });
      onClose();
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'שגיאה בשמירה: ' + (err?.message || 'Unknown'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: goldGradient }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-bold" style={{ color: 'hsl(30 15% 22%)' }}>
                {isHe ? 'עריכת מסע ההחלמה' : 'Edit Healing Journey'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isHe ? 'ערכי את הטקסטים וההנחיות שמוצגים ללקוחות שלך' : 'Edit the texts and instructions displayed to your clients'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4" dir="rtl">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(36 50% 42%)' }} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info banner */}
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: 'hsl(40 50% 97%)', border: '1px solid hsl(38 40% 85%)' }}
              >
                <span className="text-lg mt-0.5">💡</span>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(36 40% 30%)' }}>
                  {isHe
                    ? 'שיני את הטקסטים כאן וכל הלקוחות שלך יראו את העדכון מיד באפליקציה שלהן.'
                    : 'Update texts here and your clients will instantly see the changes in their app.'}
                </p>
              </div>

              {/* Steps */}
              {steps.map((step, idx) => (
                <div
                  key={step.step_index}
                  className="rounded-2xl p-5 space-y-4"
                  style={{
                    background: 'hsl(0 0% 100%)',
                    border: '1.5px solid hsl(38 40% 85%)',
                    boxShadow: '0 2px 12px hsl(38 30% 50% / 0.06)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                    {!step.isCustom && idx < 6 && (
                      <div
                        className="w-10 h-10 rounded-full overflow-hidden border-2 shrink-0"
                        style={{ borderColor: 'hsl(38 55% 58%)' }}
                      >
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${healingCharsImg})`,
                            backgroundSize: '300% 200%',
                            backgroundPosition: `${STEP_SPRITES[idx].col * 50}% ${STEP_SPRITES[idx].row * 100}%`,
                          }}
                        />
                      </div>
                    )}
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ background: goldGradient, color: '#fff', boxShadow: '0 2px 8px hsl(38 55% 50% / 0.25)' }}
                    >
                      {step.isCustom
                        ? (isHe ? `שלב מותאם ${steps.filter(s => s.isCustom).indexOf(step) + 1}` : `Custom Step ${steps.filter(s => s.isCustom).indexOf(step) + 1}`)
                        : (isHe ? step.dayLabel : step.dayLabel.replace('יום', 'Day').replace('ימים', 'Days'))}
                    </div>
                    {step.isCustom && (
                      <button
                        onClick={() => removeCustomStep(idx)}
                        className="mr-auto p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                        title={isHe ? 'מחיקת שלב' : 'Delete step'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                        📌 {isHe ? 'כותרת בעברית' : 'Hebrew Title'}
                      </label>
                      <Input
                        value={step.title_he}
                        onChange={(e) => updateStep(idx, 'title_he', e.target.value)}
                        dir="rtl"
                        className="text-sm"
                        style={{ borderColor: 'hsl(38 40% 85%)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                        📌 {isHe ? 'כותרת באנגלית' : 'English Title'}
                      </label>
                      <Input
                        value={step.title_en}
                        onChange={(e) => updateStep(idx, 'title_en', e.target.value)}
                        dir="ltr"
                        className="text-sm text-muted-foreground"
                        style={{ borderColor: 'hsl(38 40% 85%)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                        📋 {isHe ? 'הנחיות בעברית' : 'Hebrew Instructions'}
                      </label>
                      <Textarea
                        value={step.instruction_he}
                        onChange={(e) => updateStep(idx, 'instruction_he', e.target.value)}
                        dir="rtl"
                        className="text-sm min-h-[80px]"
                        style={{ borderColor: 'hsl(38 40% 85%)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                        📋 {isHe ? 'הנחיות באנגלית' : 'English Instructions'}
                      </label>
                      <Textarea
                        value={step.instruction_en}
                        onChange={(e) => updateStep(idx, 'instruction_en', e.target.value)}
                        dir="ltr"
                        className="text-sm min-h-[80px] text-muted-foreground"
                        style={{ borderColor: 'hsl(38 40% 85%)' }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Custom Step */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={addCustomStep}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-[0.98]"
                  style={{ background: goldGradient, color: '#fff', boxShadow: '0 4px 16px hsl(38 55% 50% / 0.3)' }}
                >
                  <Plus className="w-5 h-5" />
                  {isHe ? 'הוסיפי שלב מותאם אישית' : 'Add Custom Step'}
                </button>
              </div>

              {/* Save button */}
              <div className="flex justify-start pt-2 pb-2">
                <Button
                  className="h-11 px-8 text-sm font-bold border-0"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: goldGradient, color: '#fff', boxShadow: '0 4px 16px hsl(38 55% 50% / 0.3)' }}
                >
                  {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                  {saving ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? 'שמירת שינויים' : 'Save Changes')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
