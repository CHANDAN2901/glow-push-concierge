import { useState, useEffect, useMemo } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const METALLIC_GOLD_GRADIENT = 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)';
const FBAHAVA = "'FB Ahava', 'Assistant', sans-serif";

interface Notification {
  id: string;
  day: number;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

interface ArtistSettings {
  drafts?: Record<string, string>;
  days?: Record<string, number | string | null>;
}

const LS_READ_KEY = 'glowpush_read_notifications';

function getReadNotifications(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_READ_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function markAsRead(ids: string[]) {
  const read = getReadNotifications();
  ids.forEach(id => read.add(id));
  localStorage.setItem(LS_READ_KEY, JSON.stringify([...read]));
}

/** Map artist push settings into notifications for days that have already passed */
function buildNotifications(
  settings: ArtistSettings,
  treatmentType: string,
  daysSinceTreatment: number,
  clientName: string,
  lang: 'he' | 'en',
  startDate: Date,
): Notification[] {
  const drafts = settings.drafts ?? {};
  const days = settings.days ?? {};
  const readSet = getReadNotifications();
  const prefix = treatmentType === 'lips' ? 'lips' : 'brows';
  const results: Notification[] = [];

  // Collect all template keys that belong to this treatment
  const relevantKeys = Object.keys(days).filter(key => {
    // Skip language-suffixed keys
    if (/__(?:he|en)$/i.test(key)) return false;
    // Skip welcome
    if (key === 'welcome') return false;
    // Match treatment prefix or custom
    return key.startsWith(`${prefix}_`) || key.startsWith('custom_');
  });

  for (const key of relevantKeys) {
    const dayValue = Number(days[key]);
    if (!Number.isFinite(dayValue) || dayValue < 1) continue;
    // Only show notifications for days that have passed or are today
    if (dayValue > daysSinceTreatment) continue;

    // Resolve template text based on language
    const langKey = `${key}__${lang}`;
    let text = drafts[langKey] || drafts[key] || '';
    if (!text.trim()) continue;

    // Replace placeholders
    text = text
      .replace(/\[ClientName\]/g, clientName)
      .replace(/\{שם_לקוחה\}/g, clientName)
      .replace(/\{Client_Name\}/g, clientName)
      .replace(/\[שם הלקוחה\]/g, clientName)
      .replace(/\[ArtistName\]/g, '')
      .replace(/\{שם_אמנית\}/g, '')
      .replace(/\{Artist_Name\}/g, '');

    const notifId = `aftercare_${key}_day${dayValue}`;
    const notifDate = new Date(startDate);
    notifDate.setDate(notifDate.getDate() + dayValue - 1);

    results.push({
      id: notifId,
      day: dayValue,
      title: lang === 'en' ? `Day ${dayValue} Update` : `עדכון יום ${dayValue}`,
      body: text.substring(0, 250),
      timestamp: notifDate,
      read: readSet.has(notifId),
    });
  }

  return results.sort((a, b) => b.day - a.day);
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  artistProfileId: string;
  treatmentType: string;
  daysSinceTreatment: number;
  clientName: string;
  lang: 'he' | 'en';
  startDate: Date;
  onUnreadCountChange: (count: number) => void;
}

export default function ClientNotificationCenter({
  isOpen, onClose, artistProfileId, treatmentType, daysSinceTreatment,
  clientName, lang, startDate, onUnreadCountChange,
}: Props) {
  const [settings, setSettings] = useState<ArtistSettings | null>(null);

  useEffect(() => {
    if (!artistProfileId) return;
    (async () => {
      const { data } = await supabase
        .from('artist_message_settings')
        .select('settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();
      if (data?.settings && typeof data.settings === 'object') {
        setSettings(data.settings as ArtistSettings);
      }
    })();
  }, [artistProfileId]);

  const notifications = useMemo(() => {
    if (!settings) return [];
    return buildNotifications(settings, treatmentType, daysSinceTreatment, clientName, lang, startDate);
  }, [settings, treatmentType, daysSinceTreatment, clientName, lang, startDate]);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  const [localRead, setLocalRead] = useState<Set<string>>(getReadNotifications);

  const handleMarkAllRead = () => {
    const ids = notifications.map(n => n.id);
    markAsRead(ids);
    setLocalRead(new Set([...localRead, ...ids]));
    onUnreadCountChange(0);
  };

  const isRead = (id: string) => localRead.has(id);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="absolute top-16 left-4 right-4 max-w-md mx-auto rounded-3xl overflow-hidden animate-fade-up"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 12px rgba(212,175,55,0.15)',
          border: '1.5px solid rgba(212,175,55,0.3)',
          maxHeight: 'calc(100vh - 120px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(212,175,55,0.15)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: METALLIC_GOLD_GRADIENT }}>
              <Bell className="w-[17px] h-[17px]" style={{ color: '#4a3636' }} />
            </div>
            <h2 className="text-base font-bold" style={{ fontFamily: FBAHAVA, color: '#4a3636' }}>
              {lang === 'en' ? 'Notifications' : 'התראות'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !isRead(n.id)) && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#8B6914', fontFamily: FBAHAVA }}
              >
                {lang === 'en' ? 'Mark all read' : 'סמני הכל כנקרא'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors">
              <X className="w-4 h-4" style={{ color: '#8B7355' }} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" style={{ color: '#B8860B' }} />
              <p className="text-sm" style={{ color: '#8B7355', fontFamily: FBAHAVA }}>
                {lang === 'en' ? 'No notifications yet' : 'אין התראות עדיין'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
              {notifications.map(notif => {
                const read = isRead(notif.id);
                return (
                  <div
                    key={notif.id}
                    className="px-5 py-4 transition-colors"
                    style={{ background: read ? 'transparent' : 'rgba(212,175,55,0.04)' }}
                    dir={lang === 'he' ? 'rtl' : 'ltr'}
                  >
                    <div className="flex items-start gap-3">
                      {!read && (
                        <span
                          className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                          style={{
                            background: 'radial-gradient(circle, hsl(350 55% 75%) 0%, hsl(350 50% 65%) 100%)',
                            boxShadow: '0 0 6px hsl(350 55% 75% / 0.5)',
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: '#8B6914', fontFamily: FBAHAVA }}>
                            {notif.title}
                          </span>
                          <span className="text-[10px]" style={{ color: '#B8A87E' }}>
                            {lang === 'en' ? `Day ${notif.day}` : `יום ${notif.day}`}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: '#5C4033', fontFamily: FBAHAVA }}>
                          {notif.body}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
