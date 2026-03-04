import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface AftercareTemplate {
  id: string;
  template_key: string;
  label: string;
  default_text: string;
  placeholders: string[];
}

interface AftercareMessage {
  day: number;
  label: string;
  labelEn: string;
  template: string;
  treatmentPrefix?: string;
}

interface ArtistMessageSettings {
  drafts?: Record<string, string>;
  days?: Record<string, number | string | null>;
}

const AFTERCARE_DAY_MAP: Record<string, { day: number; labelEn: string }> = {
  aftercare_day_1: { day: 1, labelEn: 'Day 1 — Treatment Day 🎉' },
  aftercare_day_3: { day: 3, labelEn: 'Day 3 — Scabbing Phase 🛡️' },
  aftercare_day_7: { day: 7, labelEn: 'Day 7 — Ghosting Phase 👻' },
  aftercare_day_30: { day: 30, labelEn: 'Day 30 — Touch-up Reminder 📅' },
};

// Fallback messages if DB is empty
const FALLBACK_MESSAGES: AftercareMessage[] = [
  { day: 1, label: 'ברכות 🎉', labelEn: 'Congrats 🎉', template: 'היי [ClientName]! 🎉✨ מזל טוב על הטיפול החדש!\n[ArtistName]' },
  { day: 3, label: 'אזהרת קילופים 🛡️', labelEn: 'Peeling Warning 🛡️', template: 'היי [ClientName]! 🛡️ את בשלב הקילופים — לא לגרד!\n[ArtistName]' },
  { day: 7, label: 'הסבר Ghosting 👻', labelEn: 'Ghosting 👻', template: 'היי [ClientName]! 👻 הצבע דהה? זה נורמלי!\n[ArtistName]' },
  { day: 30, label: 'תזכורת טאצ׳ אפ 📅', labelEn: 'Touch-up 📅', template: 'היי [ClientName]! 📅 הזמן לטאצ׳ אפ!\n[ArtistName]' },
];

const CLIENT_PLACEHOLDER_PATTERNS = [/\[ClientName\]/g, /\{שם_לקוחה\}/g, /\{Client_Name\}/g, /\[שם הלקוחה\]/g];
const ARTIST_PLACEHOLDER_PATTERNS = [/\[ArtistName\]/g, /\{שם_אמנית\}/g, /\{Artist_Name\}/g];

// Map Hebrew treatment names to the prefix used in settings keys
const TREATMENT_PREFIX_MAP: Record<string, string> = {
  'גבות': 'brows',
  'שפתיים': 'lips',
  'eyebrows': 'brows',
  'lips': 'lips',
  'brows': 'brows',
  'Brows': 'brows',
  'Lips': 'lips',
};

type TemplateLanguage = 'he' | 'en';

const PUSH_TEMPLATE_DICTIONARY: Record<string, { he: string; en: string }> = {
  welcome: {
    he: 'היי {שם_לקוחה} אהובה, מתרגשת לקראת התור שלנו! ✨ כדי שנוכל להתחיל את הטיפול ברוגע, אשמח שתמלאי את הצהרת הבריאות: {קישור_לשאלון}',
    en: 'Hi {Client_Name}, this is Orit Aharoni. Just checking in on you! ❤️ A quick reminder that the area might be slightly dark or sensitive today, which is completely normal. Please strictly follow the aftercare instructions. I am right here if you have any questions.',
  },
  brows_day1: {
    he: 'בוקר טוב {שם_לקוחה}, איך הגבות החדשות שלך? רק מזכירה למרוח את המשחה. הצבע עשוי להיראות כהה היום וזה טבעי לגמרי!',
    en: 'Hi [Client Name], this is Orit Aharoni. Just checking in on you! ❤️ A quick reminder that the area might be slightly dark or sensitive today, which is completely normal. Please strictly follow the aftercare instructions. I am right here if you have any questions.',
  },
  brows_day4: {
    he: 'היי {שם_לקוחה}, שלב הקילוף אולי התחיל. נא לא לגעת ולא לקלף! תני לזה לנשור לבד כדי לשמור על הפיגמנט.',
    en: 'Hi {Client_Name}, the peeling stage may have started. Please do not touch or pick. Let it flake off naturally to preserve the pigment.',
  },
  brows_day10: {
    he: 'תתחדשי {שם_לקוחה}! ההחלמה החיצונית הסתיימה. איך התוצאה נראית לך? אשמח לראות תמונה!',
    en: 'Looking great {Client_Name}! The external healing is complete. How does the result look? I would love to see a photo.',
  },
  lips_day1: {
    he: 'היי {שם_לקוחה}, איך השפתיים החדשות? זכרי לשתות בקש ולהימנע מאוכל חריף/חם מדי. אל תשכחי למרוח את המשחה!',
    en: 'Hi {Client_Name}, how are your new lips? Please drink with a straw for the next couple of days and avoid spicy or very hot food. Do not forget the ointment.',
  },
  lips_day3: {
    he: 'בוקר טוב! השפתיים עשויות להרגיש יבשות או להתחיל להתקלף. זה הזמן להקפיד על לחות מקסימלית ולא לקלף!',
    en: 'Good morning! Your lips may feel dry or start peeling. Keep them well moisturized and avoid picking.',
  },
  lips_day10: {
    he: 'תתחדשי! הצבע של השפתיים עשוי להיראות בהיר כרגע, הוא יתייצב בשבועות הקרובים. איך התחושה?',
    en: 'Looking great! Lip color may appear lighter right now and will settle over the coming weeks. How does it feel?',
  },
};

const LANGUAGE_SUFFIX_REGEX = /__(he|en)$/i;

function getLanguageDraftKey(templateId: string, language: TemplateLanguage): string {
  return `${templateId}__${language}`;
}

function getDictionaryTemplateText(templateId: string, language: TemplateLanguage): string | null {
  return PUSH_TEMPLATE_DICTIONARY[templateId]?.[language] ?? null;
}

function normalizeDayValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTreatmentPrefix(treatmentType: string): string | null {
  const normalized = treatmentType.trim().toLowerCase();
  // Direct match
  for (const [key, prefix] of Object.entries(TREATMENT_PREFIX_MAP)) {
    if (key.toLowerCase() === normalized) return prefix;
  }
  // Partial match
  if (normalized.includes('גבות') || normalized.includes('brow')) return 'brows';
  if (normalized.includes('שפתיי') || normalized.includes('lip')) return 'lips';
  return null;
}

function mapArtistSettingsToMessages(settings: unknown, language: TemplateLanguage, filterPrefix?: string | null): AftercareMessage[] {
  if (!settings || typeof settings !== 'object') return [];

  const parsed = settings as ArtistMessageSettings;
  const drafts = parsed.drafts ?? {};
  const days = parsed.days ?? {};

  const groupedDrafts = new Map<string, { legacy?: string; he?: string; en?: string }>();

  Object.entries(drafts).forEach(([rawTemplateId, templateText]) => {
    if (typeof templateText !== 'string' || !templateText.trim()) return;

    const languageMatch = rawTemplateId.match(LANGUAGE_SUFFIX_REGEX);
    const baseTemplateId = languageMatch ? rawTemplateId.replace(LANGUAGE_SUFFIX_REGEX, '') : rawTemplateId;
    const current = groupedDrafts.get(baseTemplateId) ?? {};

    if (languageMatch) {
      const keyLanguage = languageMatch[1].toLowerCase() as TemplateLanguage;
      current[keyLanguage] = templateText;
    } else {
      current.legacy = templateText;
    }

    groupedDrafts.set(baseTemplateId, current);
  });

  const result: AftercareMessage[] = [];

  groupedDrafts.forEach((bucket, baseTemplateId) => {
    const selectedTemplate = language === 'en'
      ? bucket.en ?? getDictionaryTemplateText(baseTemplateId, 'en') ?? bucket.legacy
      : bucket.he ?? bucket.legacy ?? getDictionaryTemplateText(baseTemplateId, 'he');

    if (!selectedTemplate || !selectedTemplate.trim()) return;

    const dayFromLangKey = normalizeDayValue(days[getLanguageDraftKey(baseTemplateId, language)]);
    const rawDay = dayFromLangKey ?? normalizeDayValue(days[baseTemplateId]);
    if (rawDay === null) return;

    const underscoreIdx = baseTemplateId.indexOf('_');
    const keyPrefix = underscoreIdx > 0 ? baseTemplateId.substring(0, underscoreIdx) : null;

    if (filterPrefix) {
      const isCustom = baseTemplateId.startsWith('custom_');
      if (!isCustom && keyPrefix !== filterPrefix) return;
    }

    result.push({
      day: rawDay,
      label: `יום ${rawDay}`,
      labelEn: `Day ${rawDay}`,
      template: selectedTemplate,
      treatmentPrefix: keyPrefix || undefined,
    });
  });

  return result.sort((a, b) => a.day - b.day);
}

export function useAftercareTemplates() {
  const { lang } = useI18n();
  const activeLanguage: TemplateLanguage = lang === 'en' ? 'en' : 'he';

  const [allMessages, setAllMessages] = useState<AftercareMessage[]>([]);
  const [rawSettings, setRawSettings] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [isFromDb, setIsFromDb] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTemplates = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authUser.id)
            .maybeSingle();

          if (profile?.id) {
            const { data: settingsRow } = await supabase
              .from('artist_message_settings')
              .select('settings')
              .eq('artist_profile_id', profile.id)
              .maybeSingle();

            if (!cancelled && settingsRow?.settings) {
              setRawSettings(settingsRow.settings);
              const allMsgs = mapArtistSettingsToMessages(settingsRow.settings, activeLanguage);
              if (allMsgs.length > 0) {
                setAllMessages(allMsgs);
                setIsFromDb(true);
                setLoading(false);
                return;
              }
            }
          }
        }

        // Fallback to global message_templates
        const { data, error } = await supabase
          .from('message_templates')
          .select('*')
          .like('template_key', 'aftercare_%')
          .order('template_key');

        if (cancelled) return;
        setLoading(false);
        if (error || !data || data.length === 0) {
          const fallbackByLang = activeLanguage === 'en'
            ? [
                { day: 1, label: 'Day 1', labelEn: 'Day 1', template: 'Hi [ClientName]! 🎉 Congratulations on your new treatment. Please follow the aftercare instructions carefully.\n[ArtistName]' },
                { day: 3, label: 'Day 3', labelEn: 'Day 3', template: 'Hi [ClientName]! 🛡️ You may be in the peeling phase. Please do not pick or scratch.\n[ArtistName]' },
                { day: 7, label: 'Day 7', labelEn: 'Day 7', template: 'Hi [ClientName]! 👻 Temporary fading can happen now and is completely normal.\n[ArtistName]' },
                { day: 30, label: 'Day 30', labelEn: 'Day 30', template: 'Hi [ClientName]! 📅 It may be time to schedule your touch-up.\n[ArtistName]' },
              ]
            : FALLBACK_MESSAGES;
          setAllMessages(fallbackByLang);
          return;
        }

        const mapped: AftercareMessage[] = (data as AftercareTemplate[]).map((t) => {
          const meta = AFTERCARE_DAY_MAP[t.template_key];
          return {
            day: meta?.day ?? 1,
            label: t.label,
            labelEn: meta?.labelEn ?? t.label,
            template: t.default_text,
          };
        });

        setAllMessages(mapped);
        setIsFromDb(true);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [activeLanguage]);

  /** Get messages filtered by treatment type */
  const getMessagesForTreatment = (treatmentType?: string): AftercareMessage[] => {
    if (!treatmentType || !rawSettings) return allMessages;
    const prefix = getTreatmentPrefix(treatmentType);
    if (!prefix) return allMessages;
    const filtered = mapArtistSettingsToMessages(rawSettings, activeLanguage, prefix);
    return filtered.length > 0 ? filtered : [];
  };

  const getMessageForDay = (clientDay: number, treatmentType?: string): AftercareMessage | null => {
    const normalized = normalizeDayValue(clientDay);
    if (normalized === null) return null;

    const msgs = treatmentType ? getMessagesForTreatment(treatmentType) : allMessages;
    // Exact day match first
    const exact = msgs.find((m) => m.day === normalized);
    if (exact) return exact;
    return null;
  };

  const hasMessageForDay = (clientDay: number, treatmentType?: string): boolean => {
    const msg = getMessageForDay(clientDay, treatmentType);
    return !!msg && msg.template.trim().length > 0;
  };

  const buildWhatsAppText = (
    clientDay: number,
    clientName: string,
    artistName: string,
    treatmentType?: string
  ): string | null => {
    const msg = getMessageForDay(clientDay, treatmentType);
    if (!msg) return null;

    let text = msg.template;
    CLIENT_PLACEHOLDER_PATTERNS.forEach((pattern) => {
      text = text.replace(pattern, clientName);
    });
    ARTIST_PLACEHOLDER_PATTERNS.forEach((pattern) => {
      text = text.replace(pattern, artistName);
    });

    return text;
  };

  // Keep backward compatibility
  const messages = allMessages;
  const getMatchingDayValue = (clientDay: number): number => {
    const normalized = normalizeDayValue(clientDay);
    return normalized ?? 1;
  };

  return { messages, loading, isFromDb, getMessageForDay, getMatchingDayValue, hasMessageForDay, buildWhatsAppText };
}
