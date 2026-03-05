import { useState, useEffect } from 'react';
import { Save, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  artistProfileId: string;
  lang: string;
  onTemplatesLoaded?: (templates: {
    birthday?: string; renewal?: string; review?: string;
    birthday_en?: string; renewal_en?: string; review_en?: string;
  }) => void;
}

const DEFAULT_BIRTHDAY_HE = 'היי {{client_name}}, מזל טוב! 🎉🎂 לכבוד היום המיוחד שלך, מחכה לך הטבה מפנקת: {{gift}} על הטיפול הבא שלך. נשיקות, {{artist_name}} 💕';
const DEFAULT_BIRTHDAY_EN = 'Hi {{client_name}}, Happy Birthday! 🎉🎂 To celebrate your special day, we have a treat for you: {{gift}} on your next treatment. Warm wishes, {{artist_name}} 💕';

const DEFAULT_RENEWAL_HE = 'היי {{client_name}}, עברה כמעט שנה מאז הטיפול האחרון! ✨ זה בדיוק הזמן לרענון כדי לשמור על המראה המושלם. קבעי תור השבוע ותהני מהנחת לקוחה חוזרת. מחכה לך, {{artist_name}}';
const DEFAULT_RENEWAL_EN = 'Hi {{client_name}}, it\'s been almost a year since your last treatment! ✨ Now is the perfect time for a touch-up to keep your look flawless. Book this week and enjoy a returning client discount. Looking forward to seeing you, {{artist_name}}';

const DEFAULT_REVIEW_HE = 'היי {{client_name}}! ✨ מקווה שאת מרוצה מהתוצאות! אם יש לך רגע, אשמח מאוד להמלצה קצרה — זה עוזר לנשים נוספות למצוא את הטיפול הנכון. תודה רבה! 💕 — {{artist_name}}';
const DEFAULT_REVIEW_EN = 'Hi {{client_name}}! ✨ I hope you\'re loving your results! If you have a moment, I\'d really appreciate a short review — it helps other women find the right treatment. Thank you so much! 💕 — {{artist_name}}';

// Support both {{placeholder}} and [PLACEHOLDER] formats
function normalizePlaceholders(text: string): string {
  return text
    .replace(/\[CLIENT\]/gi, '{{client_name}}')
    .replace(/\[ARTIST\]/gi, '{{artist_name}}')
    .replace(/\[GIFT\]/gi, '{{gift}}');
}

interface TemplateBlockProps {
  emoji: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  secondaryLabel: string;
  secondaryValue: string;
  onSecondaryChange: (v: string) => void;
  isEn: boolean;
  placeholders: string[];
}

function TemplateBlock({ emoji, label, value, onChange, secondaryLabel, secondaryValue, onSecondaryChange, isEn, placeholders }: TemplateBlockProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
        {emoji} {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        dir={isEn ? 'ltr' : 'rtl'}
        rows={4}
      />
      <details className="group">
        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          {secondaryLabel}
        </summary>
        <textarea
          value={secondaryValue}
          onChange={(e) => onSecondaryChange(e.target.value)}
          className="mt-1.5 flex min-h-[80px] w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          dir={isEn ? 'rtl' : 'ltr'}
          rows={3}
        />
      </details>
      <div className="flex flex-wrap gap-1.5">
        {placeholders.map(tag => (
          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono" style={{ backgroundColor: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)' }}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MessageTemplateSettings({ artistProfileId, lang, onTemplatesLoaded }: Props) {
  const { toast } = useToast();
  const isEn = lang === 'en';

  const [birthdayHe, setBirthdayHe] = useState(DEFAULT_BIRTHDAY_HE);
  const [birthdayEn, setBirthdayEn] = useState(DEFAULT_BIRTHDAY_EN);
  const [renewalHe, setRenewalHe] = useState(DEFAULT_RENEWAL_HE);
  const [renewalEn, setRenewalEn] = useState(DEFAULT_RENEWAL_EN);
  const [reviewHe, setReviewHe] = useState(DEFAULT_REVIEW_HE);
  const [reviewEn, setReviewEn] = useState(DEFAULT_REVIEW_EN);
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
          if (templates.birthday) setBirthdayHe(normalizePlaceholders(templates.birthday));
          if (templates.birthday_en) setBirthdayEn(normalizePlaceholders(templates.birthday_en));
          if (templates.renewal) setRenewalHe(normalizePlaceholders(templates.renewal));
          if (templates.renewal_en) setRenewalEn(normalizePlaceholders(templates.renewal_en));
          if (templates.review) setReviewHe(normalizePlaceholders(templates.review));
          if (templates.review_en) setReviewEn(normalizePlaceholders(templates.review_en));
          onTemplatesLoaded?.({
            birthday: templates.birthday,
            renewal: templates.renewal,
            review: templates.review,
            birthday_en: templates.birthday_en,
            renewal_en: templates.renewal_en,
            review_en: templates.review_en,
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
        review: reviewHe,
        review_en: reviewEn,
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

  const secondaryLabel = isEn ? '🇮🇱 Hebrew Version' : '🇬🇧 English Version';

  const templateBlocks = [
    {
      emoji: '🎂',
      label: isEn ? 'Birthday Message' : 'הודעת יום הולדת',
      value: isEn ? birthdayEn : birthdayHe,
      onChange: isEn ? setBirthdayEn : setBirthdayHe,
      secondary: isEn ? birthdayHe : birthdayEn,
      onSecondary: isEn ? setBirthdayHe : setBirthdayEn,
      placeholders: ['{{client_name}}', '{{gift}}', '{{artist_name}}'],
    },
    {
      emoji: '🔄',
      label: isEn ? 'Renewal Message' : 'הודעת חידוש טיפול',
      value: isEn ? renewalEn : renewalHe,
      onChange: isEn ? setRenewalEn : setRenewalHe,
      secondary: isEn ? renewalHe : renewalEn,
      onSecondary: isEn ? setRenewalHe : setRenewalEn,
      placeholders: ['{{client_name}}', '{{artist_name}}'],
    },
    {
      emoji: '⭐',
      label: isEn ? 'Review Request' : 'בקשת המלצה',
      value: isEn ? reviewEn : reviewHe,
      onChange: isEn ? setReviewEn : setReviewHe,
      secondary: isEn ? reviewHe : reviewEn,
      onSecondary: isEn ? setReviewHe : setReviewEn,
      placeholders: ['{{client_name}}', '{{artist_name}}'],
    },
  ];

  return (
    <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
          <MessageSquareText className="w-4 h-4 text-accent" />
          {isEn ? 'Automated Message Settings' : 'הגדרות הודעות אוטומטיות'}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isEn
            ? 'Set your brand voice once — applied everywhere. Use {{client_name}}, {{artist_name}}, {{gift}} as placeholders.'
            : 'הגדירי את הקול של המותג שלך פעם אחת — יחול בכל מקום. השתמשי ב-{{client_name}}, {{artist_name}}, {{gift}} כמציינים.'}
        </p>
      </div>
      <div className="p-5 space-y-5">
        {templateBlocks.map((block) => (
          <TemplateBlock
            key={block.emoji}
            emoji={block.emoji}
            label={block.label}
            value={block.value}
            onChange={block.onChange}
            secondaryLabel={secondaryLabel}
            secondaryValue={block.secondary}
            onSecondaryChange={block.onSecondary}
            isEn={isEn}
            placeholders={block.placeholders}
          />
        ))}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-gold-cta"
        >
          <Save className="w-4 h-4 ml-2" />
          {saving
            ? (isEn ? 'Saving...' : 'שומרת...')
            : (isEn ? 'Save Templates' : 'שמרי תבניות')}
        </Button>
      </div>
    </div>
  );
}
