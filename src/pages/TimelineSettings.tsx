import { useState, useEffect } from 'react';
import { Save, Loader2, Sparkles, Plus, Trash2, GripVertical } from 'lucide-react';
import healingCharsImg from '@/assets/healing-characters.jpg';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

// Sprite positions for each default step (col, row in the sprite sheet)
const STEP_SPRITES: { col: number; row: number }[] = [
  { col: 2, row: 0 }, // Day 1
  { col: 1, row: 0 }, // Days 2-4
  { col: 0, row: 0 }, // Days 5-7
  { col: 2, row: 1 }, // Days 8-10
  { col: 1, row: 1 }, // Days 14-28
  { col: 0, row: 1 }, // Day 42
];

const DEFAULT_STEPS = [
  { dayLabel: 'יום 1', title_he: 'יום ראשון — מושלם!', title_en: 'Day 1 — Perfect!', instruction_he: 'שמרי על האזור נקי ויבש. מרחי משחה בעדינות. הצבע כהה היום — זה טבעי!', instruction_en: 'Keep the area clean and dry. Apply ointment gently. Color is dark today — totally normal!' },
  { dayLabel: 'ימים 2-4', title_he: 'ימים 2-4 — כהות', title_en: 'Days 2-4 — Darkening', instruction_he: 'הפיגמנט מתחמצן ומכהה — ידהה בקרוב. המשיכי למרוח משחה.', instruction_en: 'The pigment oxidizes and darkens — it will fade soon. Keep applying ointment.' },
  { dayLabel: 'ימים 5-7', title_he: 'ימים 5-7 — קילוף', title_en: 'Days 5-7 — Peeling', instruction_he: 'לא לקלף! תני לגלד ליפול לבד כדי לשמור על הפיגמנט.', instruction_en: "Don't peel! Let scabs fall off naturally to preserve pigment." },
  { dayLabel: 'ימים 8-10', title_he: 'ימים 8-10 — Ghosting', title_en: 'Days 8-10 — Ghosting', instruction_he: 'שלב ה-Ghosting — הצבע ייראה בהיר מאוד. הוא יחזור!', instruction_en: 'Ghosting phase — color looks very light. It will come back!' },
  { dayLabel: 'ימים 14-28', title_he: 'ימים 14-28 — חזרה', title_en: 'Days 14-28 — Coming Back', instruction_he: 'הצבע מתייצב. שמרי על הגנה מהשמש.', instruction_en: 'Color is stabilizing. Protect from sun exposure.' },
  { dayLabel: 'יום 42', title_he: 'יום 42 — מושלם!', title_en: 'Day 42 — Perfect!', instruction_he: 'מושלם! הגיע הזמן לקבוע תור לטאצ׳ אפ.', instruction_en: "Perfect! Time to schedule your touch-up." },
];

interface StepContent {
  step_index: number;
  title_he: string;
  title_en: string;
  instruction_he: string;
  instruction_en: string;
  dayLabel: string;
  isCustom?: boolean;
}

export default function TimelineSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [steps, setSteps] = useState<StepContent[]>(
    DEFAULT_STEPS.map((d, i) => ({ step_index: i, ...d }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setProfileId(profile.id);
        const { data: rows } = await supabase
          .from('timeline_content' as any)
          .select('*')
          .eq('artist_profile_id', profile.id)
          .order('step_index');

        if (rows && rows.length > 0) {
          const dbSteps = (rows as any[]);
          const merged: StepContent[] = DEFAULT_STEPS.map((d, i) => {
            const row = dbSteps.find((r: any) => r.step_index === i);
            if (row) return {
              step_index: i,
              dayLabel: d.dayLabel,
              title_he: row.title_he || d.title_he,
              title_en: row.title_en || d.title_en,
              instruction_he: row.quote_he || d.instruction_he,
              instruction_en: row.quote_en || d.instruction_en,
            };
            return { step_index: i, ...d };
          });
          dbSteps
            .filter((r: any) => r.step_index >= 6)
            .sort((a: any, b: any) => a.step_index - b.step_index)
            .forEach((r: any) => {
              merged.push({
                step_index: r.step_index,
                dayLabel: r.title_he?.split('—')[0]?.trim() || `שלב ${r.step_index + 1}`,
                title_he: r.title_he || '',
                title_en: r.title_en || '',
                instruction_he: r.quote_he || '',
                instruction_en: r.quote_en || '',
                isCustom: true,
              });
            });
          setSteps(merged);
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updateStep = (idx: number, field: keyof StepContent, value: string) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addCustomStep = () => {
    const nextIndex = Math.max(...steps.map(s => s.step_index)) + 1;
    setSteps(prev => [...prev, {
      step_index: nextIndex,
      dayLabel: `שלב ${nextIndex + 1}`,
      title_he: '',
      title_en: '',
      instruction_he: '',
      instruction_en: '',
      isCustom: true,
    }]);
  };

  const removeCustomStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!profileId) {
      toast({ title: 'יש להתחבר כדי לשמור שינויים', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      for (const step of steps) {
        const { error } = await (supabase as any)
          .from('timeline_content')
          .upsert({
            artist_profile_id: profileId,
            step_index: step.step_index,
            quote_he: step.instruction_he,
            quote_en: step.instruction_en,
            tip_he: '',
            tip_en: '',
          }, { onConflict: 'artist_profile_id,step_index' });
        if (error) throw error;
      }
      toast({ title: 'התוכן עודכן בהצלחה ויוצג ללקוחותייך ✅', className: 'bg-green-600 text-white border-green-700' });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'שגיאה בשמירה: ' + (err?.message || 'Unknown'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const goldGradient = 'linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))';

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <AdminSidebar active={'timeline-settings' as any} onNavigate={(v) => {
        if (v === 'aftercare') return navigate('/admin/aftercare');
        if (v === 'timeline') return navigate('/admin/timeline');
        if (v === 'timeline-content') return navigate('/admin/timeline-content');
        return navigate('/super-admin', { state: { view: v } });
      }} />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: goldGradient }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold" style={{ color: 'hsl(30 15% 22%)' }}>
                {isHe ? 'עריכת מסע ההחלמה' : 'Edit Healing Journey'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isHe ? 'ערכי את הכותרות, הטקסטים והטיפים שמוצגים ללקוחות שלך' : 'Edit the titles, texts, and tips displayed to your clients'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'hsl(36 50% 42%)' }} />
            </div>
          ) : (
            <div className="space-y-4 relative pb-24" dir="rtl">
              {/* Info banner */}
              <div
                className="rounded-xl p-4 flex items-start gap-3"
                style={{
                  background: 'hsl(40 50% 97%)',
                  border: '1px solid hsl(38 40% 85%)',
                }}
              >
                <span className="text-lg mt-0.5">💡</span>
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(36 40% 30%)' }}>
                  {isHe ? 'שיני את הטקסטים כאן וכל הלקוחות שלך יראו את העדכון מיד באפליקציה שלהן. אין צורך בידע טכני — פשוט כתבי ושמרי!' : 'Update texts here and your clients will instantly see the changes in their app. No tech skills needed — just write and save!'}
                </p>
              </div>

              {/* Steps list */}
              <div className="space-y-4">
                {steps.map((step, idx) => (
                  <div
                    key={step.step_index}
                    className="rounded-2xl p-5 space-y-4 transition-all"
                    style={{
                      background: 'hsl(0 0% 100%)',
                      border: '1.5px solid hsl(38 40% 85%)',
                      boxShadow: '0 2px 12px hsl(38 30% 50% / 0.06)',
                    }}
                  >
                    {/* Step header with character */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                        {/* Character illustration */}
                        {idx < 6 && (
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0"
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
                          className="px-4 py-1.5 rounded-full text-xs font-bold tracking-wide"
                          style={{
                            background: goldGradient,
                            color: 'hsl(0 0% 100%)',
                            boxShadow: '0 2px 8px hsl(38 55% 50% / 0.25)',
                          }}
                        >
                          {step.isCustom ? (isHe ? `שלב מותאם ${step.step_index + 1}` : `Custom Step ${step.step_index + 1}`) : (isHe ? step.dayLabel : step.dayLabel.replace('יום', 'Day').replace('ימים', 'Days'))}
                        </div>
                      </div>
                      {step.isCustom && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive mr-auto"
                          onClick={() => removeCustomStep(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Title fields */}
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
                          placeholder="כותרת השלב..."
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
                          placeholder="Step title..."
                        />
                      </div>
                    </div>

                    {/* Instruction fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                          📋 {isHe ? 'הנחיות ללקוחה בעברית' : 'Hebrew Instructions'}
                        </label>
                        <Textarea
                          value={step.instruction_he}
                          onChange={(e) => updateStep(idx, 'instruction_he', e.target.value)}
                          dir="rtl"
                          className="text-sm min-h-[80px]"
                          style={{ borderColor: 'hsl(38 40% 85%)' }}
                          placeholder="הנחיות ללקוחה..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block" style={{ color: 'hsl(36 40% 30%)' }}>
                          📋 Instructions in English
                        </label>
                        <Textarea
                          value={step.instruction_en}
                          onChange={(e) => updateStep(idx, 'instruction_en', e.target.value)}
                          dir="ltr"
                          className="text-sm min-h-[80px] text-muted-foreground"
                          style={{ borderColor: 'hsl(38 40% 85%)' }}
                          placeholder="Client instructions..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Step FAB */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={addCustomStep}
                  className="group flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-[0.98]"
                  style={{
                    background: goldGradient,
                    color: 'hsl(0 0% 100%)',
                    boxShadow: '0 4px 16px hsl(38 55% 50% / 0.3), 0 2px 6px hsl(38 40% 40% / 0.2)',
                  }}
                >
                  <Plus className="w-5 h-5" />
                  הוסיפי שלב מותאם אישית
                </button>
              </div>

              {/* Sticky Save */}
              <div className="sticky bottom-6 flex justify-start z-10">
                <Button
                  className="h-12 px-8 text-base shadow-lg border-0 font-bold"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: goldGradient,
                    color: 'hsl(0 0% 100%)',
                    boxShadow: '0 4px 16px hsl(38 55% 50% / 0.3)',
                  }}
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
