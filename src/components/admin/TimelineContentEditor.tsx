import { useState, useEffect } from 'react';
import { Save, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DEFAULT_STEPS = [
  { dayLabel: 'יום 1', instruction_he: 'שמרי על האזור נקי ויבש. מרחי משחה בעדינות. הצבע כהה היום — זה טבעי!', instruction_en: 'Keep the area clean and dry. Apply ointment gently. Color is dark today — totally normal!' },
  { dayLabel: 'ימים 2-4', instruction_he: 'הפיגמנט מתחמצן ומכהה — ידהה בקרוב. המשיכי למרוח משחה.', instruction_en: 'The pigment oxidizes and darkens — it will fade soon. Keep applying ointment.' },
  { dayLabel: 'ימים 5-7', instruction_he: 'לא לקלף! תני לגלד ליפול לבד כדי לשמור על הפיגמנט.', instruction_en: "Don't peel! Let scabs fall off naturally to preserve pigment." },
  { dayLabel: 'ימים 8-10', instruction_he: 'שלב ה-Ghosting — הצבע ייראה בהיר מאוד. הוא יחזור!', instruction_en: 'Ghosting phase — color looks very light. It will come back!' },
  { dayLabel: 'ימים 14-28', instruction_he: 'הצבע מתייצב. שמרי על הגנה מהשמש.', instruction_en: 'Color is stabilizing. Protect from sun exposure.' },
  { dayLabel: 'יום 42', instruction_he: 'מושלם! הגיע הזמן לקבוע תור לטאצ׳ אפ.', instruction_en: "Perfect! Time to schedule your touch-up." },
];

interface StepContent {
  step_index: number;
  instruction_he: string;
  instruction_en: string;
}

export default function TimelineContentEditorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<StepContent[]>(
    DEFAULT_STEPS.map((d, i) => ({ step_index: i, instruction_he: d.instruction_he, instruction_en: d.instruction_en }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
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
          setSteps(prev => prev.map((s, i) => {
            const row = (rows as any[]).find((r: any) => r.step_index === i);
            if (row) return {
              step_index: i,
              instruction_he: row.quote_he || DEFAULT_STEPS[i].instruction_he,
              instruction_en: row.quote_en || DEFAULT_STEPS[i].instruction_en,
            };
            return s;
          }));
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const updateStep = (idx: number, field: keyof StepContent, value: string) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!profileId) return;
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
                    <div key={idx} className="border border-border rounded-xl p-5 space-y-3">
                      <div
                        className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-wide"
                        style={{
                          background: 'linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))',
                          color: 'hsl(0 0% 100%)',
                        }}
                      >
                        {DEFAULT_STEPS[idx].dayLabel}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium mb-1 block">📋 הנחיות ללקוחה בעברית</label>
                          <Textarea
                            value={step.instruction_he}
                            onChange={(e) => updateStep(idx, 'instruction_he', e.target.value)}
                            dir="rtl"
                            className="text-sm min-h-[80px]"
                            placeholder={DEFAULT_STEPS[idx].instruction_he}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">📋 Instructions in English</label>
                          <Textarea
                            value={step.instruction_en}
                            onChange={(e) => updateStep(idx, 'instruction_en', e.target.value)}
                            dir="ltr"
                            className="text-sm min-h-[80px] text-muted-foreground"
                            placeholder={DEFAULT_STEPS[idx].instruction_en}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Save */}
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
