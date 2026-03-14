import { useState, useEffect } from 'react';
import { Heart, Save, Loader2 } from 'lucide-react';
import { restSelect, restUpdate, getAccessToken } from '@/lib/supabase-rest';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

const FALLBACK_PHASES: HealingPhaseRow[] = [
  { id: 'fb-e1', treatment_type: 'eyebrows', day_start: 1, day_end: 3, title_he: 'ימים ראשונים — שמירה והרגעה 💧', title_en: 'Protection & Calm 💧', icon: '💧', severity: 'high', steps_he: ['🧻 בימים הראשונים האזור המטופל ייראה כהה — זה טבעי.', '🧴 למרוח שכבה דקה מאוד של משחה.', '❌💧 אסור להרטיב את האזור במים זורמים!'], steps_en: ['🧻 The treated area will look dark in the first days — totally normal.', '🧴 Apply a very thin layer of ointment.', '❌💧 Do NOT wet the area with running water!'], sort_order: 1 },
  { id: 'fb-e2', treatment_type: 'eyebrows', day_start: 4, day_end: 7, title_he: 'שלב הקילופים — זהירות! 🛡️', title_en: 'Peeling Stage — Caution! 🛡️', icon: '🛡️', severity: 'high', steps_he: ['❌ אסור לגרד או לקלף את הגלד.', '🧴 להמשיך למרוח משחה כשהאזור יבש.', '👀 הצבע ייראה דהוי — זה תקין.'], steps_en: ["❌ Don't scratch or peel the scab.", '🧴 Keep applying ointment.', '👀 Color may look faded — normal.'], sort_order: 2 },
  { id: 'fb-e3', treatment_type: 'eyebrows', day_start: 8, day_end: 14, title_he: 'שלב ה-Ghosting 👻', title_en: 'Ghosting Phase 👻', icon: '👻', severity: 'medium', steps_he: ['👻 הצבע נראה כאילו נעלם? הוא יחזור.', '🧼 אפשר לשטוף פנים כרגיל.', '❌☀️ עדיין להימנע משמש.'], steps_en: ["👻 Color disappeared? It'll come back.", '🧼 Wash face normally.', '❌☀️ Avoid sunlight.'], sort_order: 3 },
  { id: 'fb-e4', treatment_type: 'eyebrows', day_start: 15, day_end: 30, title_he: 'החשיפה הסופית ✨', title_en: 'Final Result ✨', icon: '✨', severity: 'low', steps_he: ['✨ הצבע מתייצב.', '📅 קבעי תור לטאץ׳-אפ.', '🎉 תיהני!'], steps_en: ['✨ Color stabilizing.', '📅 Book touch-up.', '🎉 Enjoy!'], sort_order: 4 },
  { id: 'fb-l1', treatment_type: 'lips', day_start: 1, day_end: 3, title_he: 'נפיחות והגנה 👄', title_en: 'Swelling & Protection 👄', icon: '👄', severity: 'high', steps_he: ['💧 נפיחות היא נורמלית.', '🥤 שתי רק באמצעות קשית.', '🌶️❌ המנעי ממאכלים חמים.'], steps_en: ['💧 Swelling is normal.', '🥤 Drink through a straw.', '🌶️❌ Avoid hot/spicy foods.'], sort_order: 1 },
  { id: 'fb-l2', treatment_type: 'lips', day_start: 4, day_end: 7, title_he: 'שלב היובש 🧴', title_en: 'Dryness Phase 🧴', icon: '🛡️', severity: 'high', steps_he: ['🧴 מרחי משחה בקביעות.', '❌ אל תקלפי!', '👀 הצבע עשוי להיראות כהה — תקין.'], steps_en: ['🧴 Apply ointment regularly.', '❌ Do NOT peel!', '👀 Color may look dark — normal.'], sort_order: 2 },
  { id: 'fb-l3', treatment_type: 'lips', day_start: 8, day_end: 14, title_he: 'קילוף ודהייה 👻', title_en: 'Peeling & Fading 👻', icon: '👻', severity: 'medium', steps_he: ['👻 הצבע עשוי להיראות בהיר.', '🧴 המשיכי ללחלח.', '💄❌ הימנעי משפתון.'], steps_en: ['👻 Color may look light.', '🧴 Continue moisturizing.', '💄❌ Avoid lipstick.'], sort_order: 3 },
  { id: 'fb-l4', treatment_type: 'lips', day_start: 15, day_end: 30, title_he: 'הצבע חוזר ✨', title_en: 'Color Blooming ✨', icon: '✨', severity: 'low', steps_he: ['✨ הצבע חוזר בהדרגה.', '📅 קבעי טאץ׳-אפ.', '🎉 תיהני!'], steps_en: ['✨ Color returning.', '📅 Book touch-up.', '🎉 Enjoy!'], sort_order: 4 },
];

export default function AdminHealingEditor() {
  const { toast } = useToast();
  const [phases, setPhases] = useState<HealingPhaseRow[]>(FALLBACK_PHASES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTreatment, setActiveTreatment] = useState<'eyebrows' | 'lips'>('eyebrows');

  const fetchPhases = async () => {
    setLoading(true);
    try {
      const data = await restSelect<HealingPhaseRow>('healing_phases', 'order=sort_order.asc');
      if (data.length > 0) {
        setPhases(data);
      }
    } catch (e: any) {
      console.error('Failed to fetch healing phases:', e?.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPhases(); }, []);

  const filtered = phases.filter(p => p.treatment_type === activeTreatment);

  const updateField = (id: string, field: keyof HealingPhaseRow, value: any) => {
    setPhases(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const updateStep = (id: string, field: 'steps_he' | 'steps_en', idx: number, value: string) => {
    setPhases(prev => prev.map(p => {
      if (p.id !== id) return p;
      const arr = [...p[field]];
      arr[idx] = value;
      return { ...p, [field]: arr };
    }));
  };

  const addStep = (id: string) => {
    setPhases(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, steps_he: [...p.steps_he, ''], steps_en: [...p.steps_en, ''] };
    }));
  };

  const removeStep = (id: string, idx: number) => {
    setPhases(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        steps_he: p.steps_he.filter((_, i) => i !== idx),
        steps_en: p.steps_en.filter((_, i) => i !== idx),
      };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAccessToken();
      for (const phase of phases) {
        await restUpdate('healing_phases', phase.id, {
          title_he: phase.title_he,
          title_en: phase.title_en,
          icon: phase.icon,
          severity: phase.severity,
          steps_he: phase.steps_he,
          steps_en: phase.steps_en,
          day_start: phase.day_start,
          day_end: phase.day_end,
        }, token || undefined);
      }
      await fetchPhases();
      toast({ title: 'השינויים נשמרו בהצלחה במסד הנתונים ✅', className: 'bg-green-600 text-white border-green-700' });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'שגיאה בשמירה: ' + (err?.message || 'Unknown error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl relative pb-20" dir="rtl">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Heart className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">עריכת תוכן טיימליין ההחלמה</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          ערכי את הטקסטים שהלקוחה רואה בכל שלב של מסע ההחלמה. השינויים מתעדכנים מיידית.
        </p>

        {/* Treatment toggle */}
        <div className="flex gap-2 mb-6">
          {(['eyebrows', 'lips'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTreatment(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTreatment === t
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/30'
              }`}
            >
              {t === 'eyebrows' ? '✍️ גבות' : '👄 שפתיים'}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filtered.map((phase) => (
            <div key={phase.id} className="border border-border rounded-xl p-5 space-y-4">
              {/* Phase header */}
              <div className="flex items-center gap-3">
                <Input
                  value={phase.icon}
                  onChange={(e) => updateField(phase.id, 'icon', e.target.value)}
                  className="w-14 text-center text-2xl p-1 h-12"
                  dir="ltr"
                />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">מיום</label>
                    <Input
                      type="number"
                      value={phase.day_start}
                      onChange={(e) => updateField(phase.id, 'day_start', Number(e.target.value))}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">עד יום</label>
                    <Input
                      type="number"
                      value={phase.day_end}
                      onChange={(e) => updateField(phase.id, 'day_end', Number(e.target.value))}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                </div>
                <select
                  value={phase.severity}
                  onChange={(e) => updateField(phase.id, 'severity', e.target.value)}
                  className="text-xs rounded-lg border border-border bg-background px-3 py-2"
                >
                  <option value="high">🔴 חשוב</option>
                  <option value="medium">🟡 בינוני</option>
                  <option value="low">🟢 קל</option>
                </select>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">כותרת בעברית</label>
                  <Input
                    value={phase.title_he}
                    onChange={(e) => updateField(phase.id, 'title_he', e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">כותרת באנגלית</label>
                  <Input
                    value={phase.title_en}
                    onChange={(e) => updateField(phase.id, 'title_en', e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Consolidated instruction */}
              <div>
                <label className="text-xs font-medium mb-2 block">📋 הנחיות ללקוחה</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">בעברית</label>
                    <Textarea
                      value={phase.steps_he.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(l => l.trim());
                        updateField(phase.id, 'steps_he', lines);
                      }}
                      placeholder="הנחיות ללקוחה בעברית (שורה לכל הנחיה)…"
                      dir="rtl"
                      className="text-sm min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">In English</label>
                    <Textarea
                      value={phase.steps_en.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(l => l.trim());
                        updateField(phase.id, 'steps_en', lines);
                      }}
                      placeholder="Instructions in English (one per line)…"
                      dir="ltr"
                      className="text-sm min-h-[100px] text-muted-foreground"
                    />
                  </div>
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
          {saving ? 'שומר…' : 'שמור שינויים בטיימליין'}
        </Button>
      </div>
    </div>
  );
}
