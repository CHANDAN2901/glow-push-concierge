import { useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useHealingPhases } from '@/hooks/useHealingPhases';
import AdminSidebar from '@/components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

export default function TimelineSettings() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [treatment, setTreatment] = useState<'eyebrows' | 'lips'>('eyebrows');
  const { phases, loading, error } = useHealingPhases(treatment);

  const viewRows = useMemo(() => phases.map((phase, index) => {
    const dayLabel = phase.day_start === phase.day_end
      ? (isHe ? `יום ${phase.day_start}` : `Day ${phase.day_start}`)
      : (isHe ? `ימים ${phase.day_start}-${phase.day_end}` : `Days ${phase.day_start}-${phase.day_end}`);

    return {
      key: phase.id,
      index,
      dayLabel,
      title: isHe ? phase.title_he : phase.title_en,
      instruction: (isHe ? phase.steps_he : phase.steps_en).join(' ') || (isHe ? phase.title_he : phase.title_en),
    };
  }), [phases, isHe]);

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <AdminSidebar active={'timeline-settings' as any} onNavigate={(v) => {
        if (v === 'aftercare') return navigate('/admin/aftercare');
        if (v === 'timeline') return navigate('/admin/timeline');
        if (v === 'timeline-content') return navigate('/admin/timeline-content');
        return navigate('/super-admin', { state: { view: v } });
      }} />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto space-y-5" dir={isHe ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent text-accent-foreground">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">
                {isHe ? 'עריכת מסע ההחלמה' : 'Edit Healing Journey'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isHe
                  ? 'התוכן כאן נמשך בזמן אמת מתבנית הסופר-אדמין (מסע החלמה)'
                  : 'Content here is pulled live from the Super Admin master Recovery Journey template.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2">
            <button
              onClick={() => setTreatment('eyebrows')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                treatment === 'eyebrows'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent/20'
              }`}
            >
              {isHe ? 'גבות' : 'Brows'}
            </button>
            <button
              onClick={() => setTreatment('lips')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                treatment === 'lips'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent/20'
              }`}
            >
              {isHe ? 'שפתיים' : 'Lips'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {isHe ? 'שגיאה בטעינת תבנית מסע ההחלמה' : 'Failed to load recovery journey template'}
            </div>
          ) : (
            <div className="space-y-4">
              {viewRows.map((row) => (
                <div key={row.key} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent text-accent-foreground">
                      {row.dayLabel}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-foreground">{row.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{row.instruction}</p>
                </div>
              ))}

              {viewRows.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground text-center">
                  {isHe ? 'לא הוגדרו שלבים בתבנית הסופר-אדמין' : 'No stages found in Super Admin master template'}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
