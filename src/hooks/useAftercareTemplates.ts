import { useState, useEffect } from 'react';
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

function mapArtistSettingsToMessages(settings: unknown, filterPrefix?: string | null): AftercareMessage[] {
  if (!settings || typeof settings !== 'object') return [];

  const parsed = settings as ArtistMessageSettings;
  const drafts = parsed.drafts ?? {};
  const days = parsed.days ?? {};

  const result: AftercareMessage[] = [];

  Object.entries(drafts).forEach(([templateId, templateText]) => {
    if (typeof templateText !== 'string' || !templateText.trim()) return;

    const rawDay = normalizeDayValue(days[templateId]);
    if (rawDay === null) return;

    // Extract prefix from template key (e.g., "brows" from "brows_day1")
    const underscoreIdx = templateId.indexOf('_');
    const keyPrefix = underscoreIdx > 0 ? templateId.substring(0, underscoreIdx) : null;

    // If filtering by treatment, only include matching prefix templates + custom ones
    if (filterPrefix) {
      const isCustom = templateId.startsWith('custom_');
      if (!isCustom && keyPrefix !== filterPrefix) return;
    }

    result.push({
      day: rawDay,
      label: `יום ${rawDay}`,
      labelEn: `Day ${rawDay}`,
      template: templateText,
      treatmentPrefix: keyPrefix || undefined,
    });
  });

  return result.sort((a, b) => a.day - b.day);
}

export function useAftercareTemplates() {
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
              const allMsgs = mapArtistSettingsToMessages(settingsRow.settings);
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
        if (error || !data || data.length === 0) return;

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
  }, []);

  /** Get messages filtered by treatment type */
  const getMessagesForTreatment = (treatmentType?: string): AftercareMessage[] => {
    if (!treatmentType || !rawSettings) return allMessages;
    const prefix = getTreatmentPrefix(treatmentType);
    if (!prefix) return allMessages;
    const filtered = mapArtistSettingsToMessages(rawSettings, prefix);
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
