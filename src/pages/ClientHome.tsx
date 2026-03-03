import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { TreatmentType } from '@/lib/recovery-data';
import { useHealingPhases } from '@/hooks/useHealingPhases';
import { ChevronLeft, ChevronRight, Heart, Clock, Shield, CheckCircle2, Camera, LifeBuoy, Instagram, CalendarCheck, CalendarPlus, Check, Sparkles, Gift, MessageCircle, HelpCircle, ChevronDown, ArrowUp, Bell } from 'lucide-react';
import { subscribeToPush } from '@/lib/push-utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import CircularProgress from '@/components/CircularProgress';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import InstallBanner from '@/components/InstallBanner';

import ClientSharedGallery from '@/components/ClientSharedGallery';
import ClientMyPhotos from '@/components/ClientMyPhotos';
import HealingTimelineCarousel from '@/components/HealingTimelineCarousel';
import { useClientGallery } from '@/hooks/useClientGallery';
import type { SharedGalleryPhoto } from '@/hooks/useClientGallery';
import { STUDIO_LOGO_URL, STUDIO_NAME } from '@/lib/branding';
import oritLogo from '@/assets/glowpush-logo.png';
import heroLogo from '@/assets/glowpush-hero-logo.png';

// --- PWA localStorage keys (outside component to avoid re-creation) ---
const LS_CLIENT_ID = 'glow-client-id';
const LS_CLIENT_NAME = 'glow-client-name';
const LS_START = 'glow-start';
const LS_TREATMENT = 'glow-treatment';
const LS_ARTIST_ID = 'glow-artist-id';

// Eagerly persist URL params on module load (before React hydrates) for iOS PWA
try {
  const url = new URL(window.location.href);
  const cid = url.searchParams.get('client_id');
  const cname = url.searchParams.get('name');
  const cstart = url.searchParams.get('start');
  const ctreat = url.searchParams.get('treatment');
  const cartist = url.searchParams.get('artist_id');
  if (cid) localStorage.setItem(LS_CLIENT_ID, cid);
  if (cname) localStorage.setItem(LS_CLIENT_NAME, cname);
  if (cstart) localStorage.setItem(LS_START, cstart);
  if (ctreat) localStorage.setItem(LS_TREATMENT, ctreat);
  if (cartist) localStorage.setItem(LS_ARTIST_ID, cartist);
} catch (_) { /* SSR-safe */ }

// Metallic Gold accent palette
const SOFT_GOLD = 'hsl(38 55% 62%)';
const SOFT_GOLD_LIGHT = 'hsl(40 50% 78%)';
const SOFT_GOLD_DARK = 'hsl(36 50% 42%)';
const POWDER_PINK_BG = 'hsl(350 50% 93%)';
const POWDER_PINK_CARD = 'hsl(350 40% 90%)';
const CHARCOAL_TEXT = 'hsl(30 15% 22%)';
const CHARCOAL_LIGHT = 'hsl(30 10% 38%)';

// Time-based greeting
function getTimeGreeting(lang: 'en' | 'he', name: string, treatment: string): string {
  const hour = new Date().getHours();
  const bodyPart = treatment === 'lips'
    ? (lang === 'en' ? 'lips' : 'שפתיים')
    : (lang === 'en' ? 'brows' : 'גבות');

  if (hour < 12) {
    return lang === 'en'
      ? `Good morning ${name}, how do your ${bodyPart} feel today? ☀️`
      : `בוקר טוב ${name}, איך ה${bodyPart} מרגישות היום? ☀️`;
  } else if (hour < 18) {
    return lang === 'en'
      ? `Good afternoon ${name}, hope your ${bodyPart} are healing beautifully! 🌸`
      : `צהריים טובים ${name}, מקווה שה${bodyPart} מחלימות יפה! 🌸`;
  } else {
    return lang === 'en'
      ? `Good evening ${name}, time for your evening ${bodyPart} care! 🌙`
      : `ערב טוב ${name}, הגיע הזמן לטיפול ערב ב${bodyPart}! 🌙`;
  }
}

const MILESTONE_DAYS = [7, 14, 21, 30];
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const LogoBrand = ({ logoUrl, lang, setLang }: { logoUrl: string; lang: 'en' | 'he'; setLang: (l: 'en' | 'he') => void }) => {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-2">
      {/* Spacer for balance */}
      <div className="w-14" />
      {/* Centered hero logo */}
      <img
        src={heroLogo}
        alt="Glow Push"
        className="object-contain"
        style={{ maxHeight: '82px', filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.3))' }}
      />
      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 active:scale-95"
        style={{ border: '1px solid hsl(38 30% 82%)', color: 'hsl(30 10% 45%)' }}
      >
        🌐 {lang === 'he' ? 'EN' : 'HE'}
      </button>
    </div>
  );
};

// Soft gold CTA button style
const goldBtnStyle: React.CSSProperties = {
  background: `linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))`,
  border: `1px solid hsl(36 45% 35%)`,
  boxShadow: `0 4px 18px hsl(38 55% 50% / 0.35), inset 0 1px 0 hsl(40 60% 82% / 0.5), inset 0 -1px 2px hsl(36 50% 30% / 0.2)`,
  color: 'hsl(0 0% 100%)',
  fontWeight: 600,
  borderRadius: '9999px',
  letterSpacing: '0.02em',
};

// Push notification subscription banner for clients
function ClientPushBanner({ clientId, clientName, artistProfileId, lang }: { clientId: string; clientName: string; artistProfileId: string; lang: 'en' | 'he' }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed'>('idle');
  const validClientId = isUUID(clientId);

  useEffect(() => {
    let cancelled = false;
    if (!validClientId) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('client_id', clientId)
          .limit(1);

        if (cancelled) return;
        if (error) {
          console.warn('[ClientPushBanner] Failed to check existing subscription:', error.message);
          return;
        }
        if (data && data.length > 0) setStatus('subscribed');
      } catch (err) {
        if (!cancelled) {
          console.error('[ClientPushBanner] Unexpected check error:', err);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, validClientId]);

  const handleSubscribe = async () => {
    if (!validClientId) {
      toast({
        title: lang === 'en' ? 'Missing secure client link' : 'חסר מזהה לקוחה מאובטח בקישור',
        description: lang === 'en' ? 'Please open the full client link sent by your artist.' : 'פתחי את הקישור המלא שנשלח אלייך מהמאפרת.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('loading');
    try {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) {
        console.warn('[ClientPushBanner] Could not clear old subscription:', deleteError.message);
      }

      const result = await subscribeToPush({ clientId, clientName, artistProfileId });
      if (result.success) {
        setStatus('subscribed');
        toast({ title: lang === 'en' ? 'Notifications enabled! ✅' : 'התראות הופעלו בהצלחה! ✅' });
      } else {
        setStatus('idle');
        toast({ title: lang === 'en' ? 'Failed to subscribe' : 'ההרשמה נכשלה', description: result.error, variant: 'destructive' });
      }
    } catch (err) {
      console.error('[ClientPushBanner] Unexpected subscribe error:', err);
      setStatus('idle');
      toast({
        title: lang === 'en' ? 'Failed to subscribe' : 'ההרשמה נכשלה',
        variant: 'destructive',
      });
    }
  };

  if (!clientId && !clientName) return null;

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === 'loading'}
      className="w-full rounded-3xl p-5 mb-6 flex items-center justify-center gap-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50 animate-fade-up"
      style={{
        animationDelay: '50ms',
        backgroundColor: status === 'subscribed' ? 'hsl(142 50% 94%)' : 'hsl(0 0% 100%)',
        border: status === 'subscribed' ? '2px solid hsl(142 60% 50%)' : `2px solid ${SOFT_GOLD}`,
        color: status === 'subscribed' ? 'hsl(142 60% 30%)' : SOFT_GOLD_DARK,
        boxShadow: status === 'subscribed' ? '0 2px 12px hsl(142 50% 70% / 0.25)' : `0 2px 16px hsl(38 50% 70% / 0.25)`,
      }}
    >
      {status === 'loading' ? (
        <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <Bell className="w-5 h-5" />
      )}
      {status === 'subscribed'
        ? (lang === 'en' ? 'Notifications enabled ✅' : 'התראות מופעלות ✅')
        : status === 'loading'
          ? (lang === 'en' ? 'Enabling...' : 'מפעילה...')
          : (lang === 'en' ? 'Enable notifications for recovery updates 🔔' : 'הפעילי התראות לקבלת עדכוני החלמה 🔔')}
    </button>
  );
}

const ClientHome = () => {
  const { toast } = useToast();
  const { t, lang, setLang } = useI18n();
  const [searchParams] = useSearchParams();
  const timelineRef = useRef<HTMLDivElement>(null);

  // PWA localStorage keys defined at module level above

  const rawClientId = searchParams.get('client_id') || '';
  const paramName = searchParams.get('name');

  // Save to localStorage when URL params are present
  useEffect(() => {
    if (rawClientId) localStorage.setItem(LS_CLIENT_ID, rawClientId);
    if (paramName) localStorage.setItem(LS_CLIENT_NAME, paramName);
    const s = searchParams.get('start');
    if (s) localStorage.setItem(LS_START, s);
    const t = searchParams.get('treatment');
    if (t) localStorage.setItem(LS_TREATMENT, t);
    const a = searchParams.get('artist_id');
    if (a) localStorage.setItem(LS_ARTIST_ID, a);
  }, [rawClientId, paramName, searchParams]);

  // Restore from localStorage if URL params missing (PWA mode)
  const clientId = rawClientId || localStorage.getItem(LS_CLIENT_ID) || '';
  const fallbackName = lang === 'en' ? 'Client' : 'לקוחה';
  const [dbClientName, setDbClientName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isUUID(clientId)) {
      setDbClientName(null);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('full_name')
          .eq('id', clientId)
          .maybeSingle();

        if (cancelled || error || !data?.full_name) return;
        setDbClientName(data.full_name.split(' ')[0]);
      } catch (err) {
        if (!cancelled) {
          console.error('[ClientHome] Failed to load client name:', err);
          setDbClientName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const clientName = paramName || dbClientName || localStorage.getItem(LS_CLIENT_NAME) || fallbackName;
  const startDateParam = searchParams.get('start') || localStorage.getItem(LS_START) || '';
  const treatmentParam = searchParams.get('treatment') || localStorage.getItem(LS_TREATMENT) || '';
  const treatment: TreatmentType = treatmentParam === 'lips' ? 'lips' : 'eyebrows';
  const beforeImg = searchParams.get('before') || '';
  const afterImg = searchParams.get('after') || '';
  const logoUrl = searchParams.get('logo') || STUDIO_LOGO_URL || '';
  const artistName = searchParams.get('artist') || '';
  const artistPhone = searchParams.get('phone') || '';
  const artistProfileId = searchParams.get('artist_id') || localStorage.getItem(LS_ARTIST_ID) || '';
  // clientId already declared above
  const { phases, loading: phasesLoading, error: phasesError, getPhaseForDay } = useHealingPhases(treatment);

  // Single gallery hook instance — shared across all gallery components
  const validClientId = isUUID(clientId) ? clientId : undefined;
  const gallery = useClientGallery(validClientId, artistProfileId || undefined);

  // Bottom-nav photo upload
  const bottomFileRef = useRef<HTMLInputElement>(null);
  const [bottomUploading, setBottomUploading] = useState(false);

  const handleBottomUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBottomUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await gallery.uploadPhoto(base64, { photoType: 'healing', uploadedBy: 'client' });
      toast({ title: 'התמונה הועלתה בהצלחה! 📸✨' });
    } catch (err) {
      console.error('Bottom upload error:', err);
      toast({ title: 'שגיאה בהעלאת התמונה', variant: 'destructive' });
    } finally {
      setBottomUploading(false);
      e.target.value = '';
    }
  }, [gallery.uploadPhoto, toast]);

  const calculatedDay = useMemo(() => {
    if (!startDateParam) return 3;

    const start = new Date(startDateParam);
    if (Number.isNaN(start.getTime())) return 3;

    const today = new Date();
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(30, diff + 1));
  }, [startDateParam]);

  const actualDay = calculatedDay;
  // Support deep-link from push notification: ?day=X
  const pushDay = searchParams.get('day');
  const parsedPushDay = pushDay ? Number.parseInt(pushDay, 10) : Number.NaN;
  const safeInitialDay = Number.isFinite(parsedPushDay)
    ? Math.max(1, Math.min(30, parsedPushDay))
    : calculatedDay;
  const [viewingDay, setViewingDay] = useState(safeInitialDay);
  const isPreviewing = viewingDay !== actualDay;

  const doneKey = `pmu-done-day-${viewingDay}`;
  const [isDone, setIsDone] = useState(() => localStorage.getItem(doneKey) === '1');
  const [glowRing, setGlowRing] = useState(false);

  const handleDone = useCallback(() => {
    if (isDone) return;
    localStorage.setItem(doneKey, '1');
    setIsDone(true);
    setGlowRing(true);
    setTimeout(() => setGlowRing(false), 1500);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      colors: ['#d4af37', '#e8d48b', '#fff', '#f5e6c8'],
    });
  }, [isDone, doneKey]);

  const [slideDir, setSlideDir] = useState<'left' | 'right' | null>(null);
  const [slideKey, setSlideKey] = useState(viewingDay);

  const handleDayChange = useCallback((newDay: number) => {
    const clamped = Math.max(1, Math.min(30, newDay));
    setSlideDir(clamped > viewingDay ? 'left' : 'right');
    setViewingDay(clamped);
    setSlideKey(clamped);
    setIsDone(localStorage.getItem(`pmu-done-day-${clamped}`) === '1');

    if (MILESTONE_DAYS.includes(clamped) && clamped === actualDay) {
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#d4af37', '#e8d48b', '#fff', '#f5e6c8'],
          shapes: ['star', 'circle'],
        });
      }, 400);
    }
  }, [viewingDay, actualDay]);

  const progress = Math.min(Math.round((viewingDay / 30) * 100), 100);

  const content = (() => {
    const dbPhase = getPhaseForDay(viewingDay);
    if (dbPhase) {
      return {
        title: dbPhase.title_he,
        titleEn: dbPhase.title_en,
        icon: dbPhase.icon,
        severity: dbPhase.severity as 'high' | 'medium' | 'low',
        steps: dbPhase.steps_he.map((he, i) => ({
          he,
          en: dbPhase.steps_en[i] || he,
        })),
      };
    }
    return {
      title: 'החשיפה הסופית ✨', titleEn: 'Final Result ✨',
      icon: '✨', severity: 'low' as const,
      steps: [{ he: '✨ הצבע מתייצב.', en: '✨ The color is stabilizing.' }],
    };
  })();

  const handleSyncCalendar = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(tomorrow);
    end.setMinutes(end.getMinutes() + 15);
    const url = window.location.href;

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Glow Push//Recovery//EN',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(tomorrow)}`,
      `DTEND:${fmt(end)}`,
      'RRULE:FREQ=DAILY;COUNT=30',
      `SUMMARY:Glow Push: טיפול יומי 🎀`,
      `DESCRIPTION:היי! זה הזמן להיכנס לאפליקציה ולבדוק את ההנחיות להיום: ${url}`,
      `URL:${url}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'glow-push-plan.ics';
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      description: lang === 'en' ? 'Your calendar is set! See you tomorrow morning ✨' : 'היומן שלך מסודר! נתראה מחר בבוקר ✨',
    });
  }, [lang, toast]);

  if (phasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: POWDER_PINK_BG }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-3 rounded-full" style={{ borderColor: SOFT_GOLD, borderTopColor: 'transparent' }} />
          <p className="text-sm font-light" style={{ color: 'hsl(0 0% 50%)' }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (phasesError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: POWDER_PINK_BG }}>
        <div className="max-w-sm text-center p-6 rounded-2xl bg-white border border-destructive/30">
          <p className="text-destructive font-medium mb-2">שגיאה בטעינת נתונים</p>
          <p className="text-xs text-muted-foreground">{phasesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: POWDER_PINK_BG }}>
      {/* Centered Logo Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl" style={{ background: 'hsl(350 50% 93% / 0.85)', borderBottom: `1px solid hsl(38 40% 82% / 0.5)` }}>
        <div className="max-w-md mx-auto">
          <LogoBrand logoUrl={logoUrl} lang={lang} setLang={setLang} />
        </div>
      </header>

      <div className="pt-28 max-w-md mx-auto px-4">
        {/* Push Notification Banner */}
        <ClientPushBanner clientId={clientId} clientName={clientName} artistProfileId={artistProfileId} lang={lang} />

        {/* Greeting Card */}
        <div className="relative mb-8 animate-fade-up rounded-3xl overflow-hidden" style={{ backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 4px 24px hsl(350 30% 88% / 0.35)' }}>
          <div className="relative py-10 px-6 text-center">
            <h1 className="tracking-wide mb-5" style={{ color: CHARCOAL_TEXT, fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '28px', letterSpacing: '0.05em', lineHeight: 1.5 }}>
              {getTimeGreeting(lang, clientName, treatment)}
            </h1>
            <p className="leading-relaxed mb-6 font-light" style={{ color: CHARCOAL_LIGHT, fontSize: '15px' }}>
              {lang === 'en'
                ? 'Here you can follow every step of the process, get daily instructions, and see how your perfect result takes shape. I\'m with you all the way! ✍️👄'
                : 'כאן תוכלי לעקוב אחרי כל שלב ושלב בתהליך, לקבל הנחיות מדויקות לכל יום ולראות איך התוצאה המושלמת מתגבשת. אני כאן איתך לאורך כל הדרך! ✍️👄'}
            </p>

            {/* Treatment badge */}
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-light" style={{ background: POWDER_PINK_CARD, border: '1px solid hsl(350 30% 90%)', color: 'hsl(0 0% 25%)', fontSize: '14px' }}>
              {treatment === 'lips' ? '👄' : '✍️'}{' '}
              {lang === 'en'
                ? `Treatment: ${treatment === 'lips' ? 'Lips' : 'Brows'} ✨`
                : `סוג הטיפול: ${treatment === 'lips' ? 'שפתיים' : 'גבות'} ✨`}
            </span>

            <button
              onClick={handleSyncCalendar}
              className="relative mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-xs transition-all hover:opacity-90 active:scale-[0.97]"
              style={goldBtnStyle}
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              {lang === 'en' ? 'Sync Calendar Reminders 📅' : 'סנכרני תזכורות ליומן 📅'}
            </button>
          </div>
        </div>

        {/* Day Counter with Circular Progress */}
        <div className="rounded-3xl p-8 mb-6 animate-fade-up delay-100" style={{ backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 2px 16px hsl(350 30% 88% / 0.3)', border: '1px solid hsl(350 30% 92%)' }}>
          {isPreviewing && (
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-light" style={{ background: 'hsl(40 50% 92%)', color: SOFT_GOLD_DARK }}>
                {lang === 'en' ? `Previewing Day ${viewingDay}` : `תצוגה מקדימה — יום ${viewingDay}`}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => handleDayChange(viewingDay - 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: POWDER_PINK_CARD }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: 'hsl(0 0% 50%)' }} />
            </button>

            <div className={`relative flex items-center justify-center transition-all duration-500 ${glowRing ? 'scale-105' : ''}`}
              style={glowRing ? { filter: `drop-shadow(0 0 20px hsl(40 55% 72% / 0.5))` } : undefined}
            >
              <CircularProgress percentage={(viewingDay / 30) * 100} size={160} strokeWidth={5} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl" style={{ color: CHARCOAL_TEXT, fontFamily: 'var(--font-serif)', fontWeight: 300 }}>{viewingDay}</div>
                <p className="text-xs mt-1 font-light" style={{ color: 'hsl(0 0% 50%)' }}>
                  {t('client.day')} {viewingDay} {t('client.of')} 30
                </p>
                {isPreviewing && (
                  <p className="text-[10px] mt-0.5 font-light" style={{ color: SOFT_GOLD_DARK }}>{lang === 'en' ? '(Preview)' : '(תצוגה מקדימה)'}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDayChange(viewingDay + 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: POWDER_PINK_CARD }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: 'hsl(0 0% 50%)' }} />
            </button>
          </div>

          <p className="text-center text-base mt-4 tracking-wider" style={{ color: CHARCOAL_TEXT, fontFamily: 'var(--font-serif)', fontWeight: 300 }}>
            {lang === 'en' ? content.titleEn : content.title}
          </p>
          <p className="text-center text-xs mt-1 font-light" style={{ color: 'hsl(0 0% 50%)' }}>
            {treatment === 'lips'
              ? (lang === 'en' ? '💋 Lip Recovery' : '💋 החלמת שפתיים')
              : (lang === 'en' ? '✨ Brow Recovery' : '✨ החלמת גבות')}
          </p>
          {isPreviewing && (
            <button
              onClick={() => handleDayChange(actualDay)}
              className="block mx-auto mt-2 text-xs font-light underline underline-offset-2 hover:opacity-80"
              style={{ color: SOFT_GOLD_DARK }}
            >
              {lang === 'en' ? '← Back to Today' : '← חזרה להיום'}
            </button>
          )}
        </div>


        {/* Visual Healing Timeline - Main Recovery View */}
        <div id="care" className="scroll-mt-20" />
        <HealingTimelineCarousel currentDay={viewingDay} artistProfileId={artistProfileId} treatment={treatment} />

        {/* Mark as Done */}
        <div className="mb-6">
          <button
            onClick={handleDone}
            disabled={isDone}
            className={`w-full py-3.5 text-sm transition-all duration-300 active:scale-[0.97] rounded-full ${
              isDone ? 'cursor-default opacity-70' : ''
            }`}
            style={goldBtnStyle}
          >
            {isDone
              ? (lang === 'en' ? 'Great job! See you tomorrow ✨' : 'כל הכבוד! נתראה מחר ✨')
              : (lang === 'en' ? '✅ I finished today\'s care' : '✅ סיימתי את הטיפול היומי')}
          </button>
        </div>


        {/* Refer a Friend Widget */}
        <div
          className="rounded-3xl p-8 mb-6 animate-fade-up overflow-hidden relative text-center"
          style={{ animationDelay: '350ms', backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 2px 16px hsl(350 30% 88% / 0.3)', border: '1px solid hsl(350 30% 92%)' }}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="relative">
            <div className="flex flex-col items-center gap-2 mb-5">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(40 50% 93%)' }}>
                <Gift className="w-7 h-7" style={{ color: SOFT_GOLD_DARK }} />
              </div>
              <h2 className="text-2xl tracking-wide" style={{ color: 'hsl(0 0% 5%)', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>
                {lang === 'en' ? 'Bring a friend, get a gift!' : 'הביאי חברה, קבלי מתנה!'}
              </h2>
            </div>
            <p className="text-sm leading-relaxed mb-6 font-light max-w-xs mx-auto" style={{ color: 'hsl(0 0% 30%)' }}>
              {lang === 'en'
                ? 'Send your code to a friend! She gets ₪100 off her first treatment, and you get ₪50 credit for your next touch-up.'
                : 'שלחי לחברה את הקוד שלך! היא תקבל 100 ש"ח הנחה לטיפול ראשון, ואת תקבלי 50 ש"ח קרדיט לטיפול החיזוק הבא שלך.'}
            </p>
            <div className="flex items-center justify-center mb-6">
              <div className="px-10 py-3.5 rounded-full" style={{ ...goldBtnStyle }}>
                <span className="font-bold text-2xl tracking-[0.15em]" style={{ color: 'hsl(0 0% 100%)' }}>SHIR50</span>
              </div>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                lang === 'en'
                  ? `Hey! 🎁 Use my code SHIR50 and get ₪100 off your first PMU treatment! ✨`
                  : `היי! 🎁 הנה קוד ההנחה שלי: SHIR50 — תקבלי 100 ש"ח הנחה על הטיפול הראשון! ✨`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-4 text-base font-bold no-underline transition-all hover:opacity-90 active:scale-[0.97]"
              style={goldBtnStyle}
            >
              <MessageCircle className="w-5 h-5" />
              {lang === 'en' ? 'Share via WhatsApp' : 'שתפי בוואטסאפ'}
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" className="scroll-mt-20" />
        <div
          className="rounded-3xl p-6 mb-6 animate-fade-up"
          style={{ animationDelay: '400ms', backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 2px 16px hsl(350 30% 88% / 0.3)', border: '1px solid hsl(350 30% 92%)' }}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-1.5 mb-4 text-xs font-light hover:underline underline-offset-2"
            style={{ color: SOFT_GOLD_DARK }}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Back to top' : 'חזרה למעלה'}
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(40 50% 93%)' }}>
              <HelpCircle className="w-5 h-5" style={{ color: SOFT_GOLD_DARK }} />
            </div>
            <h2 className="text-xl tracking-wide" style={{ color: 'hsl(0 0% 8%)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
              {lang === 'en' ? 'Frequently Asked Questions' : 'שאלות נפוצות'}
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="faq-1" className="rounded-2xl px-4 overflow-hidden" style={{ border: '1px solid hsl(350 30% 92%)' }}>
              <AccordionTrigger className="text-sm font-light text-start py-4 hover:no-underline" style={{ color: 'hsl(0 0% 15%)' }}>
                {lang === 'en' ? 'Why do my brows look so dark today?' : 'למה הגבות שלי נראות כל כך כהות היום?'}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed pb-4 font-light" style={{ color: 'hsl(0 0% 40%)' }}>
                {lang === 'en'
                  ? "That's completely natural! In the first few days the pigment oxidizes and darkens. After healing, the color will fade and look natural."
                  : 'זה טבעי לגמרי! בימים הראשונים הפיגמנט מתחמצן ומתכהה. לאחר ההחלמה הצבע ידהה וייראה טבעי.'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-2" className="rounded-2xl px-4 overflow-hidden" style={{ border: '1px solid hsl(350 30% 92%)' }}>
              <AccordionTrigger className="text-sm font-light text-start py-4 hover:no-underline" style={{ color: 'hsl(0 0% 15%)' }}>
                {lang === 'en' ? "I'm peeling and it's really itchy, can I scratch?" : 'התחיל לי קילוף וממש מגרד לי, מותר לגרד?'}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed pb-4 font-light" style={{ color: 'hsl(0 0% 40%)' }}>
                {lang === 'en'
                  ? "Absolutely not. Let your skin heal at its own pace so you don't damage the pigment."
                  : 'בשום פנים ואופן לא. תני לעור להחלים בקצב שלו כדי לא לפגוע בפיגמנט.'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-3" className="rounded-2xl px-4 overflow-hidden" style={{ border: '1px solid hsl(350 30% 92%)' }}>
              <AccordionTrigger className="text-sm font-light text-start py-4 hover:no-underline" style={{ color: 'hsl(0 0% 15%)' }}>
                {lang === 'en' ? 'When can I wear makeup again?' : 'מתי אפשר לחזור להתאפר?'}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed pb-4 font-light" style={{ color: 'hsl(0 0% 40%)' }}>
                {lang === 'en'
                  ? 'Avoid applying makeup directly on the treated area for 10-14 days.'
                  : 'הימנעי מאיפור ישירות על האזור המטופל למשך 10-14 ימים.'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="faq-4" className="rounded-2xl px-4 overflow-hidden" style={{ border: '1px solid hsl(350 30% 92%)' }}>
              <AccordionTrigger className="text-sm font-light text-start py-4 hover:no-underline" style={{ color: 'hsl(0 0% 15%)' }}>
                {lang === 'en' ? 'Can I get the area wet in the shower?' : 'מותר לי להרטיב את האזור במקלחת?'}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed pb-4 font-light" style={{ color: 'hsl(0 0% 40%)' }}>
                {lang === 'en'
                  ? 'In the first few days, keep the area as dry as possible.'
                  : 'בימים הראשונים יש לשמור על האזור יבש ככל הניתן.'}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Shared Client Gallery — all photos */}
        {validClientId && (
          <div className="rounded-3xl p-6 mb-6 animate-fade-up" style={{ animationDelay: '380ms', backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 2px 16px hsl(350 30% 88% / 0.3)', border: '1px solid hsl(350 30% 92%)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(40 50% 93%)' }}>
                <Camera className="w-5 h-5" style={{ color: SOFT_GOLD_DARK }} />
              </div>
              <h2 className="text-xl tracking-wide" style={{ color: CHARCOAL_TEXT, fontFamily: 'var(--font-serif)', fontWeight: 300 }}>
                {lang === 'en' ? 'My Healing Gallery' : 'גלריית ההחלמה שלי'}
              </h2>
            </div>
            <ClientSharedGallery clientId={validClientId} artistId={artistProfileId || undefined} gallery={gallery} />
          </div>
        )}

        {/* My Uploaded Photos — client-only uploads */}
        {validClientId && <ClientMyPhotos clientId={validClientId} artistId={artistProfileId || undefined} lang={lang} gallery={gallery} />}

        {/* My Artist Card */}
        <div className="rounded-3xl p-6 mt-6 animate-fade-up" style={{ animationDelay: '500ms', backgroundColor: 'hsl(0 0% 100%)', boxShadow: '0 2px 16px hsl(350 30% 88% / 0.3)', border: '1px solid hsl(350 30% 92%)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: 'hsl(40 50% 93%)' }}>
              👩‍🎨
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-light text-base tracking-wide" style={{ color: 'hsl(0 0% 15%)', fontFamily: 'var(--font-serif)' }}>{lang === 'en' ? 'Sarah Cohen' : 'שרה כהן'}</h3>
              <p className="text-xs font-light" style={{ color: 'hsl(0 0% 50%)' }}>Master PMU Artist</p>
              <div className="flex items-center gap-3 mt-1.5">
                <a href="#" className="transition-colors" style={{ color: SOFT_GOLD }}><Instagram className="w-4 h-4" /></a>
              </div>
            </div>
          </div>
          <a
            href={`https://wa.me/${artistPhone || ''}?text=${encodeURIComponent(
              lang === 'en'
                ? `Hi${artistName ? ` ${artistName}` : ''}! ✨ I'd like to schedule my touch-up appointment. My name is: ${clientName} 👄`
                : `היי${artistName ? ` ${artistName}` : ''}! ✨ אני רוצה לקבוע תור לטיפול הטאץ׳ אפ שלי. השם שלי הוא: ${clientName} 👄`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 text-center text-sm no-underline transition-all hover:opacity-90 active:scale-[0.97]"
            style={goldBtnStyle}
          >
            <span className="flex items-center justify-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              {lang === 'en' ? 'Schedule Touch-up 🗓️' : 'קביעת טאץ׳ אפ 🗓️'}
            </span>
          </a>
        </div>

        {/* Spacer before bottom nav */}
        <div className="pb-24 pt-4" />

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] backdrop-blur-lg" style={{ background: 'hsla(0, 0%, 100%, 0.97)', boxShadow: '0 -1px 0 hsl(38 30% 88%), 0 -4px 24px -6px hsla(38, 30%, 60%, 0.1)' }}>
          <div className="max-w-md mx-auto px-2 pt-3 pb-4 grid grid-cols-4 gap-2">
            <a
              href="#care"
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all hover:opacity-80 active:scale-[0.93]"
              style={{ color: 'hsl(38 40% 35%)' }}
            >
              <Heart className="w-5 h-5" strokeWidth={1.5} style={{ color: 'hsl(38 55% 62%)' }} />
              <span>{lang === 'en' ? 'Aftercare' : 'ההחלמה שלי'}</span>
            </a>
            <button
              onClick={() => bottomFileRef.current?.click()}
              disabled={bottomUploading}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 text-xs font-serif tracking-wide transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
              style={goldBtnStyle}
            >
              {bottomUploading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Camera className="w-5 h-5" strokeWidth={1.5} />
              )}
              <span>{bottomUploading ? (lang === 'en' ? 'Uploading...' : 'מעלה...') : (lang === 'en' ? 'Upload Photo' : 'העלאת תמונה')}</span>
            </button>
            <input ref={bottomFileRef} type="file" accept="image/*" className="hidden" onChange={handleBottomUpload} />
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`היי, אני ביום ${actualDay} ויש לי שאלה דחופה לגבי הטיפול... 🆘`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all active:scale-[0.93]"
              style={{ border: '1px solid hsl(0 60% 85%)', color: 'hsl(0 50% 45%)' }}
            >
              <LifeBuoy className="w-5 h-5" strokeWidth={1.5} />
              <span>{lang === 'en' ? 'Emergency' : 'חירום'}</span>
            </a>
            <a
              href="#faq"
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all hover:opacity-80 active:scale-[0.93]"
              style={{ color: 'hsl(38 40% 35%)' }}
            >
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: 'hsl(38 55% 62%)' }} />
              <span>{lang === 'en' ? 'FAQ' : 'שאלות'}</span>
            </a>
          </div>
          <InstallBanner />
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
