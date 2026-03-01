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

const CLIENT_PLACEHOLDER_PATTERNS = [/\[ClientName\]/g, /\{שם_לקוחה\}/g, /\{Client_Name\}/g];
const ARTIST_PLACEHOLDER_PATTERNS = [/\[ArtistName\]/g, /\{שם_אמנית\}/g, /\{Artist_Name\}/g];

function normalizeDayValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getMatchingDay(clientDay: number): number {
  if (clientDay <= 1) return 1;
  if (clientDay <= 5) return 3;
  if (clientDay <= 20) return 7;
  return 30;
}

function mapArtistSettingsToMessages(settings: unknown): AftercareMessage[] {
  if (!settings || typeof settings !== 'object') return [];

  const parsed = settings as ArtistMessageSettings;
  const drafts = parsed.drafts ?? {};
  const days = parsed.days ?? {};

  const perDay = new Map<number, AftercareMessage>();

  Object.entries(drafts).forEach(([templateId, templateText]) => {
    if (typeof templateText !== 'string' || !templateText.trim()) return;

    const rawDay = normalizeDayValue(days[templateId]);
    if (rawDay === null) return;

    const day = getMatchingDay(rawDay);
    if (perDay.has(day)) return;

    perDay.set(day, {
      day,
      label: `יום ${day}`,
      labelEn: `Day ${day}`,
      template: templateText,
    });
  });

  return Array.from(perDay.values()).sort((a, b) => a.day - b.day);
}

export function useAftercareTemplates() {
  const [messages, setMessages] = useState<AftercareMessage[]>(FALLBACK_MESSAGES);
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

            const settingsMessages = mapArtistSettingsToMessages(settingsRow?.settings);
            if (!cancelled && settingsMessages.length > 0) {
              setMessages(settingsMessages);
              setIsFromDb(true);
              setLoading(false);
              return;
            }
          }
        }

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

        setMessages(mapped);
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

  const getMatchingDayValue = (clientDay: number): number => {
    const normalized = normalizeDayValue(clientDay);
    return getMatchingDay(normalized ?? 1);
  };

  const getMessageForDay = (clientDay: number): AftercareMessage | null => {
    const normalized = normalizeDayValue(clientDay);
    if (normalized === null) return null;

    const targetDay = getMatchingDay(normalized);
    return messages.find((m) => m.day === targetDay) || null;
  };

  const hasMessageForDay = (clientDay: number): boolean => {
    if (!isFromDb) return false;

    const normalized = normalizeDayValue(clientDay);
    if (normalized === null) return false;

    const targetDay = getMatchingDay(normalized);
    const msg = messages.find((m) => m.day === targetDay);
    return !!msg && msg.template.trim().length > 0;
  };

  const buildWhatsAppText = (
    clientDay: number,
    clientName: string,
    artistName: string
  ): string | null => {
    const msg = getMessageForDay(clientDay);
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

  return { messages, loading, isFromDb, getMessageForDay, getMatchingDayValue, hasMessageForDay, buildWhatsAppText };
}

