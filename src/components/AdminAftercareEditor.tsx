import { useState, useEffect } from 'react';
import { Heart, Save, Info, Calendar, Loader2 } from 'lucide-react';
import { restSelect, restUpdate, getAccessToken } from '@/lib/supabase-rest';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AftercareTemplate {
  id: string;
  template_key: string;
  label: string;
  default_text: string;
  placeholders: string[];
}

const DAY_ICONS: Record<string, string> = {
  aftercare_day_1: '🎉',
  aftercare_day_3: '🛡️',
  aftercare_day_7: '👻',
  aftercare_day_30: '📅',
};

const DAY_DESCRIPTIONS: Record<string, string> = {
  aftercare_day_1: 'הודעה שנשלחת ביום הטיפול — הוראות לשעות הראשונות',
  aftercare_day_3: 'הודעה לשלב הגלדים — אזהרות מפני גירוד וקילוף',
  aftercare_day_7: 'הודעה לשלב ה-Ghosting — הסבר על דהיית הצבע',
  aftercare_day_30: 'תזכורת לקביעת תור לטאצ׳ אפ ובקשת ביקורת',
};

const FALLBACK_TEMPLATES: AftercareTemplate[] = [
  { id: 'fb-1', template_key: 'aftercare_day_1', label: 'יום הטיפול 🎉', default_text: 'היי [ClientName]! 🎉✨ מזל טוב על הטיפול החדש!\nהנה כמה הוראות חשובות לשעות הקרובות:\n• 🧻 ספגי הפרשות בעדינות\n• 🧴 מרחי שכבה דקה של משחה\n• ❌💧 אסור להרטיב!\n\n[ArtistName]', placeholders: ['[ClientName]', '[ArtistName]'] },
  { id: 'fb-2', template_key: 'aftercare_day_3', label: 'שלב הגלדים 🛡️', default_text: 'היי [ClientName]! 🛡️ את בשלב הגלדים.\n• ❌ אסור לגרד!\n• 🧴 המשיכי למרוח משחה\n• 👀 הצבע עשוי להיראות מוזר — זה תקין\n\n[ArtistName]', placeholders: ['[ClientName]', '[ArtistName]'] },
  { id: 'fb-3', template_key: 'aftercare_day_7', label: 'שלב ה-Ghosting 👻', default_text: 'היי [ClientName]! 👻 הצבע דהה? אל דאגה!\nזה שלב ה-Ghosting — הצבע יחזור בעוד כשבוע-שבועיים.\n🧼 את יכולה לשטוף פנים כרגיל\n❌☀️ הימנעי משמש ישירה\n\n[ArtistName]', placeholders: ['[ClientName]', '[ArtistName]'] },
  { id: 'fb-4', template_key: 'aftercare_day_30', label: 'תזכורת טאצ׳ אפ 📅', default_text: 'היי [ClientName]! 📅 חודש עבר מהטיפול!\nהצבע התייצב — עכשיו זה הזמן המושלם לטאץ׳-אפ.\nנשמח לקבוע תור 💕\n\n[ArtistName]', placeholders: ['[ClientName]', '[ArtistName]'] },
];

export default function AdminAftercareEditor() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AftercareTemplate[]>(FALLBACK_TEMPLATES);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    FALLBACK_TEMPLATES.forEach(t => d[t.id] = t.default_text);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await restSelect<AftercareTemplate>(
          'message_templates',
          'template_key=like.aftercare_%25&order=template_key.asc'
        );
        if (cancelled) return;
        setLoading(false);
        if (data.length > 0) {
          setTemplates(data);
          const d: Record<string, string> = {};
          data.forEach((t) => (d[t.id] = t.default_text));
          setDrafts(d);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoading(false);
          console.error('Fetch aftercare failed:', e?.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchTemplates = async () => {
    const data = await restSelect<AftercareTemplate>(
      'message_templates',
      'template_key=like.aftercare_%25&order=template_key.asc'
    );
    if (data.length > 0) {
      setTemplates(data);
      const d: Record<string, string> = {};
      data.forEach((t) => (d[t.id] = t.default_text));
      setDrafts(d);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = getAccessToken();
      for (const t of templates) {
        if (drafts[t.id] !== t.default_text) {
          await restUpdate('message_templates', t.id, { default_text: drafts[t.id] }, token || undefined);
        }
      }
      await fetchTemplates();
      toast({ title: 'השינויים נשמרו בהצלחה במסד הנתונים ✅', className: 'bg-green-600 text-white border-green-700' });
    } catch (err: any) {
      console.error('Save failed:', err);
      toast({ title: 'שגיאה בשמירה: ' + (err?.message || 'Unknown error'), variant: 'destructive' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl relative pb-20" dir="rtl">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">ניהול הודעות החלמה</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          הגדירי את רצף ההודעות האוטומטיות שנשלחות ללקוחות לפי ימי ההחלמה. שינויים כאן מתעדכנים מיידית עבור כל האמניות.
        </p>

        <div className="space-y-6">
          {templates.map((t) => {
            const icon = DAY_ICONS[t.template_key] || '💬';
            const desc = DAY_DESCRIPTIONS[t.template_key] || '';
            return (
              <div key={t.id} className="border border-border rounded-xl p-5 bg-background">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-lg">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold">{t.label}</label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs text-xs" dir="rtl">
                          <p>{desc}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>

                <Textarea
                  value={drafts[t.id] ?? ''}
                  onChange={(e) => setDrafts({ ...drafts, [t.id]: e.target.value })}
                  rows={6}
                  dir="rtl"
                  className="resize-y font-mono text-sm"
                />

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {t.placeholders.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        const current = drafts[t.id] ?? '';
                        setDrafts({ ...drafts, [t.id]: current + ' ' + p });
                      }}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-mono hover:bg-accent/20 transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">לא נמצאו תבניות החלמה. הוסיפי תבניות דרך מסד הנתונים.</p>
          </div>
        )}
      </div>

      {/* Sticky Save */}
      <div className="sticky bottom-6 flex justify-start">
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg"
          onClick={handleSave}
          disabled={saving || templates.length === 0}
        >
          {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
          {saving ? 'שומר…' : 'שמור תבניות החלמה'}
        </Button>
      </div>
    </div>
  );
}
