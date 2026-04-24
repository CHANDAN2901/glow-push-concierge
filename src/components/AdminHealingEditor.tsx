import { useState, useEffect } from 'react';
import { Heart, Save, Loader2 } from 'lucide-react';
import { restSelect, restUpdate, getAccessToken } from '@/lib/supabase-rest';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

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

export default function AdminHealingEditor() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [phases, setPhases] = useState<HealingPhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTreatment, setActiveTreatment] = useState<'eyebrows' | 'lips'>('eyebrows');

  const fetchPhases = async () => {
    setLoading(true);
    try {
      const data = await restSelect<HealingPhaseRow>('healing_phases', 'order=sort_order.asc');
      setPhases(data);
    } catch (e: unknown) {
      console.error('Failed to fetch healing phases:', e instanceof Error ? e.message : e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPhases(); }, []);

  const filtered = phases.filter(p => p.treatment_type === activeTreatment);

  const updateField = (id: string, field: keyof HealingPhaseRow, value: HealingPhaseRow[keyof HealingPhaseRow]) => {
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
    } catch (err: unknown) {
      console.error('Save failed:', err);
      toast({
        title: isHe
          ? 'שגיאה בשמירה: ' + (err instanceof Error ? err.message : 'Unknown error')
          : 'Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'),
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }
    toast({
      title: isHe ? 'השינויים נשמרו בהצלחה במסד הנתונים ✅' : 'Changes saved successfully to the database ✅',
      className: 'bg-green-600 text-white border-green-700',
    });
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
    <div className="space-y-6 max-w-3xl relative pb-20" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Heart className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">{isHe ? 'עריכת תוכן טיימליין ההחלמה' : 'Edit Healing Timeline Content'}</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {isHe
            ? 'ערכי את הטקסטים שהלקוחה רואה בכל שלב של מסע ההחלמה. השינויים מתעדכנים מיידית.'
            : 'Edit the text the client sees at each stage of the healing journey. Changes update immediately.'}
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
              {t === 'eyebrows' ? (isHe ? '✍️ גבות' : '✍️ Eyebrows') : (isHe ? '👄 שפתיים' : '👄 Lips')}
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
                    <label className="text-xs text-muted-foreground">{isHe ? 'מיום' : 'From day'}</label>
                    <Input
                      type="number"
                      value={phase.day_start}
                      onChange={(e) => updateField(phase.id, 'day_start', Number(e.target.value))}
                      className="h-9 text-sm"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{isHe ? 'עד יום' : 'To day'}</label>
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
                  <option value="high">{isHe ? '🔴 חשוב' : '🔴 High priority'}</option>
                  <option value="medium">{isHe ? '🟡 בינוני' : '🟡 Medium'}</option>
                  <option value="low">{isHe ? '🟢 קל' : '🟢 Low'}</option>
                </select>
              </div>

              {/* Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">{isHe ? 'כותרת בעברית' : 'Title in Hebrew'}</label>
                  <Input
                    value={phase.title_he}
                    onChange={(e) => updateField(phase.id, 'title_he', e.target.value)}
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">{isHe ? 'כותרת באנגלית' : 'Title in English'}</label>
                  <Input
                    value={phase.title_en}
                    onChange={(e) => updateField(phase.id, 'title_en', e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Consolidated instruction */}
              <div>
                <label className="text-xs font-medium mb-2 block">{isHe ? '📋 הנחיות ללקוחה' : '📋 Client Instructions'}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{isHe ? 'בעברית' : 'In Hebrew'}</label>
                    <Textarea
                      value={phase.steps_he.join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(l => l.trim());
                        updateField(phase.id, 'steps_he', lines);
                      }}
                      placeholder={isHe ? 'הנחיות ללקוחה בעברית (שורה לכל הנחיה)…' : 'Hebrew instructions for the client (one per line)…'}
                      dir={isHe ? 'rtl' : 'ltr'}
                      className="text-sm min-h-[100px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{isHe ? 'באנגלית' : 'In English'}</label>
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
          {saving ? (isHe ? 'שומר…' : 'Saving…') : (isHe ? 'שמור שינויים בטיימליין' : 'Save Timeline Changes')}
        </Button>
      </div>
    </div>
  );
}
