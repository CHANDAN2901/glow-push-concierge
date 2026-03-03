import { useState, useEffect } from 'react';
import { Save, MessageSquareText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artistProfileId: string;
  lang: string;
  onTemplatesLoaded?: (templates: { birthday?: string; renewal?: string }) => void;
}

const DEFAULT_BIRTHDAY = 'היי [CLIENT], מזל טוב! 🎉🎂 לכבוד היום המיוחד שלך, מחכה לך הטבה מפנקת: [GIFT] על הטיפול הבא שלך. נשיקות, [ARTIST] 💕';
const DEFAULT_RENEWAL = 'היי [CLIENT], עברה כמעט שנה מאז הטיפול האחרון! ✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';

export default function MessageTemplateSettings({ artistProfileId, lang, onTemplatesLoaded }: Props) {
  const { toast } = useToast();
  const [birthdayTemplate, setBirthdayTemplate] = useState(DEFAULT_BIRTHDAY);
  const [renewalTemplate, setRenewalTemplate] = useState(DEFAULT_RENEWAL);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!artistProfileId) return;
    supabase
      .from('artist_message_settings')
      .select('settings')
      .eq('artist_profile_id', artistProfileId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.settings && typeof data.settings === 'object') {
          const s = data.settings as Record<string, unknown>;
          const templates = (s.custom_templates || {}) as Record<string, string>;
          if (templates.birthday) setBirthdayTemplate(templates.birthday);
          if (templates.renewal) setRenewalTemplate(templates.renewal);
          onTemplatesLoaded?.({ birthday: templates.birthday, renewal: templates.renewal });
        }
        setLoaded(true);
      });
  }, [artistProfileId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if settings row exists
      const { data: existing } = await supabase
        .from('artist_message_settings')
        .select('id, settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();

      const customTemplates = {
        birthday: birthdayTemplate,
        renewal: renewalTemplate,
      };

      if (existing) {
        const currentSettings = (existing.settings && typeof existing.settings === 'object') ? existing.settings as Record<string, unknown> : {};
        await supabase
          .from('artist_message_settings')
          .update({ settings: { ...currentSettings, custom_templates: customTemplates } as any })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('artist_message_settings')
          .insert({ artist_profile_id: artistProfileId, settings: { custom_templates: customTemplates } as any });
      }

      onTemplatesLoaded?.(customTemplates);
      toast({ title: lang === 'en' ? 'Templates saved! ✅' : 'התבניות נשמרו בהצלחה ✅' });
    } catch (err) {
      toast({ title: lang === 'en' ? 'Failed to save' : 'שמירה נכשלה', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
          <MessageSquareText className="w-4 h-4 text-accent" />
          {lang === 'en' ? 'Message Templates' : 'תבניות הודעות'}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {lang === 'en'
            ? 'Customize your birthday and renewal messages. Use [CLIENT], [ARTIST], [GIFT] as placeholders.'
            : 'התאימי את הודעות יום ההולדת והחידוש שלך. השתמשי ב-[CLIENT], [ARTIST], [GIFT] כמציינים.'}
        </p>
      </div>
      <div className="p-5 space-y-5">
        {/* Birthday Template */}
        <div className="space-y-2">
          <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            🎂 {lang === 'en' ? 'Birthday Message' : 'הודעת יום הולדת'}
          </label>
          <textarea
            value={birthdayTemplate}
            onChange={(e) => setBirthdayTemplate(e.target.value)}
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            dir="rtl"
            rows={4}
          />
          <div className="flex flex-wrap gap-1.5">
            {['[CLIENT]', '[GIFT]', '[ARTIST]'].map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono" style={{ backgroundColor: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Renewal Template */}
        <div className="space-y-2">
          <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            🔄 {lang === 'en' ? 'Renewal Message' : 'הודעת חידוש טיפול'}
          </label>
          <textarea
            value={renewalTemplate}
            onChange={(e) => setRenewalTemplate(e.target.value)}
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            dir="rtl"
            rows={4}
          />
          <div className="flex flex-wrap gap-1.5">
            {['[CLIENT]', '[ARTIST]'].map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono" style={{ backgroundColor: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-gold-cta"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving
            ? (lang === 'en' ? 'Saving...' : 'שומר...')
            : (lang === 'en' ? 'Save Templates' : 'שמרי תבניות')}
        </Button>
      </div>
    </div>
  );
}
