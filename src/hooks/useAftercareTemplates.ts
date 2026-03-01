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

function getMatchingDay(clientDay: number): number {
  if (clientDay <= 1) return 1;
  if (clientDay <= 5) return 3;
  if (clientDay <= 20) return 7;
  return 30;
}

export function useAftercareTemplates() {
  const [messages, setMessages] = useState<AftercareMessage[]>(FALLBACK_MESSAGES);
  const [loading, setLoading] = useState(true);
  const [isFromDb, setIsFromDb] = useState(false);

  useEffect(() => {
    supabase
      .from('message_templates')
      .select('*')
      .like('template_key', 'aftercare_%')
      .order('template_key')
      .then(({ data, error }) => {
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
      });
  }, []);

  const getMatchingDayValue = (clientDay: number): number => getMatchingDay(clientDay);

  const getMessageForDay = (clientDay: number): AftercareMessage | null => {
    const targetDay = getMatchingDay(clientDay);
    return messages.find((m) => m.day === targetDay) || null;
  };

  const hasMessageForDay = (clientDay: number): boolean => {
    if (!isFromDb) return false;
    const targetDay = getMatchingDay(clientDay);
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
    return msg.template
      .replace(/\[ClientName\]/g, clientName)
      .replace(/\[ArtistName\]/g, artistName);
  };

  return { messages, loading, isFromDb, getMessageForDay, getMatchingDayValue, hasMessageForDay, buildWhatsAppText };
}
