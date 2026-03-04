import { useState, useEffect } from 'react';
import { Save, MessageSquareText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artistProfileId: string;
  lang: string;
  onTemplatesLoaded?: (templates: { birthday?: string; renewal?: string; birthday_en?: string; renewal_en?: string }) => void;
}

const DEFAULT_BIRTHDAY_HE = 'היי [CLIENT], מזל טוב! 🎉🎂 לכבוד היום המיוחד שלך, מחכה לך הטבה מפנקת: [GIFT] על הטיפול הבא שלך. נשיקות, [ARTIST] 💕';
const DEFAULT_BIRTHDAY_EN = 'Hi [CLIENT], Happy Birthday! 🎉🎂 To celebrate your special day, we have a treat for you: [GIFT] on your next treatment. Warm wishes, [ARTIST] 💕';

const DEFAULT_RENEWAL_HE = 'היי [CLIENT], עברה כמעט שנה מאז הטיפול האחרון! ✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, [ARTIST]';
const DEFAULT_RENEWAL_EN = 'Hi [CLIENT], it\'s been almost a year since your last treatment! ✨ Now is the perfect time for a touch-up to keep your look flawless. Book this week and enjoy a returning client discount. Looking forward to seeing you, [ARTIST]';

export default function MessageTemplateSettings({ artistProfileId, lang, onTemplatesLoaded }: Props) {
  const { toast } = useToast();
  const isEn = lang === 'en';

  const [birthdayHe, setBirthdayHe] = useState(DEFAULT_BIRTHDAY_HE);
  const [birthdayEn, setBirthdayEn] = useState(DEFAULT_BIRTHDAY_EN);
  const [renewalHe, setRenewalHe] = useState(DEFAULT_RENEWAL_HE);
  const [renewalEn, setRenewalEn] = useState(DEFAULT_RENEWAL_EN);
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
          if (templates.birthday) setBirthdayHe(templates.birthday);
          if (templates.birthday_en) setBirthdayEn(templates.birthday_en);
          if (templates.renewal) setRenewalHe(templates.renewal);
          if (templates.renewal_en) setRenewalEn(templates.renewal_en);
          onTemplatesLoaded?.({
            birthday: templates.birthday,
            renewal: templates.renewal,
            birthday_en: templates.birthday_en,
            renewal_en: templates.renewal_en,
          });
        }
        setLoaded(true);
      });
  }, [artistProfileId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('artist_message_settings')
        .select('id, settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();

      const customTemplates = {
        birthday: birthdayHe,
        birthday_en: birthdayEn,
        renewal: renewalHe,
        renewal_en: renewalEn,
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
      toast({ title: isEn ? 'Templates saved! ✅' : 'התבניות נשמרו בהצלחה ✅' });
    } catch (err) {
      toast({ title: isEn ? 'Failed to save' : 'שמירה נכשלה', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  // Show the active language template in main textarea, with secondary language below
  const birthdayValue = isEn ? birthdayEn : birthdayHe;
  const setBirthdayValue = isEn ? setBirthdayEn : setBirthdayHe;
  const renewalValue = isEn ? renewalEn : renewalHe;
  const setRenewalValue = isEn ? setRenewalEn : setRenewalHe;

  const birthdaySecondary = isEn ? birthdayHe : birthdayEn;
  const setBirthdaySecondary = isEn ? setBirthdayHe : setBirthdayEn;
  const renewalSecondary = isEn ? renewalHe : renewalEn;
  const setRenewalSecondary = isEn ? setRenewalHe : setRenewalEn;

  const secondaryLabel = isEn ? '🇮🇱 Hebrew Version' : '🇬🇧 English Version';

  return (
    <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
          <MessageSquareText className="w-4 h-4 text-accent" />
          {isEn ? 'Message Templates' : 'תבניות הודעות'}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isEn
            ? 'Customize your birthday and renewal messages. Use [CLIENT], [ARTIST], [GIFT] as placeholders.'
            : 'התאימי את הודעות יום ההולדת והחידוש שלך. השתמשי ב-[CLIENT], [ARTIST], [GIFT] כמציינים.'}
        </p>
      </div>
      <div className="p-5 space-y-5">
        {/* Birthday Template */}
        <div className="space-y-2">
          <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            🎂 {isEn ? 'Birthday Message' : 'הודעת יום הולדת'}
          </label>
          <textarea
            value={birthdayValue}
            onChange={(e) => setBirthdayValue(e.target.value)}
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            dir={isEn ? 'ltr' : 'rtl'}
            rows={4}
          />
          {/* Secondary language */}
          <details className="group">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              {secondaryLabel}
            </summary>
            <textarea
              value={birthdaySecondary}
              onChange={(e) => setBirthdaySecondary(e.target.value)}
              className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              dir={isEn ? 'rtl' : 'ltr'}
              rows={3}
            />
          </details>
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
            🔄 {isEn ? 'Renewal Message' : 'הודעת חידוש טיפול'}
          </label>
          <textarea
            value={renewalValue}
            onChange={(e) => setRenewalValue(e.target.value)}
            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            dir={isEn ? 'ltr' : 'rtl'}
            rows={4}
          />
          {/* Secondary language */}
          <details className="group">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              {secondaryLabel}
            </summary>
            <textarea
              value={renewalSecondary}
              onChange={(e) => setRenewalSecondary(e.target.value)}
              className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
              dir={isEn ? 'rtl' : 'ltr'}
              rows={3}
            />
          </details>
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
            ? (isEn ? 'Saving...' : 'שומר...')
            : (isEn ? 'Save Templates' : 'שמרי תבניות')}
        </Button>
      </div>
    </div>
  );
}
