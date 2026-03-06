import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { TreatmentType } from '@/lib/recovery-data';
import { useHealingPhases } from '@/hooks/useHealingPhases';
import { ChevronLeft, ChevronRight, Heart, Clock, Shield, CheckCircle2, Camera, Instagram, CalendarCheck, CalendarPlus, Check, Sparkles, Gift, MessageCircle, HelpCircle, ChevronDown, ArrowUp, Bell, Phone, Navigation, Clipboard } from 'lucide-react';
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

import ClientNotificationCenter from '@/components/ClientNotificationCenter';
import ClientSharedGallery from '@/components/ClientSharedGallery';
import ClientMyPhotos from '@/components/ClientMyPhotos';
import HealingTimelineCarousel from '@/components/HealingTimelineCarousel';
import { useClientGallery } from '@/hooks/useClientGallery';
import type { SharedGalleryPhoto } from '@/hooks/useClientGallery';
import { STUDIO_LOGO_URL, STUDIO_NAME } from '@/lib/branding';
import oritLogo from '@/assets/glowpush-logo.png';
import heroLogo from '@/assets/glowpush-hero-logo.png';

// --- Client identity localStorage keys (exact launch-blocker keys) ---
const LS_CLIENT_ID = 'glowpush_client_id';
const LS_CLIENT_NAME = 'glowpush_client_name';
const LEGACY_LS_CLIENT_ID = 'glow-client-id';
const LEGACY_LS_CLIENT_NAME = 'glow-client-name';
const LS_START = 'glow-start';
const LS_TREATMENT = 'glow-treatment';
const LS_ARTIST_ID = 'glow-artist-id';

const getStoredClientIdentity = () => {
  try {
    const storedId = localStorage.getItem(LS_CLIENT_ID) || localStorage.getItem(LEGACY_LS_CLIENT_ID) || '';
    const storedName = localStorage.getItem(LS_CLIENT_NAME) || localStorage.getItem(LEGACY_LS_CLIENT_NAME) || '';
    if (storedId && !localStorage.getItem(LS_CLIENT_ID)) localStorage.setItem(LS_CLIENT_ID, storedId);
    if (storedName && !localStorage.getItem(LS_CLIENT_NAME)) localStorage.setItem(LS_CLIENT_NAME, storedName);
    return { storedId, storedName };
  } catch {
    return { storedId: '', storedName: '' };
  }
};

// Eagerly capture URL identity on module load (before React hydrates) for iOS Home Screen launches
try {
  const url = new URL(window.location.href);
  const pathMatch = url.pathname.match(/^\/c\/([0-9a-f-]{36})$/i);
  const cid = pathMatch?.[1] || url.searchParams.get('client_id') || url.searchParams.get('clientId');
  const cname = url.searchParams.get('name') || url.searchParams.get('clientName');
  const cstart = url.searchParams.get('start');
  const ctreat = url.searchParams.get('treatment');
  const cartist = url.searchParams.get('artist_id');
  if (cid) {
    localStorage.setItem(LS_CLIENT_ID, cid);
    if (cname) localStorage.setItem(LS_CLIENT_NAME, cname);
  }
  if (cstart) localStorage.setItem(LS_START, cstart);
  if (ctreat) localStorage.setItem(LS_TREATMENT, ctreat);
  if (cartist) localStorage.setItem(LS_ARTIST_ID, cartist);
} catch (_) { /* SSR-safe */ }

// Time-based greeting (forced Hebrew for client recovery flow consistency)
function getTimeGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `בוקר טוב, ${name} ☀️`;
  if (hour < 18) return `צהריים טובים, ${name} 🌸`;
  return `ערב טוב, ${name} 🌙`;
}

const MILESTONE_DAYS = [7, 14, 21, 30];
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/* ─── Shared style constants ─── */
const METALLIC_GOLD_GRADIENT = 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)';
const GOLD_TEXT_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.35)';
const CARD_BG = 'rgba(255,255,255,0.85)';
const CARD_SHADOW = '0 4px 24px rgba(212,175,55,0.08), 0 1px 6px rgba(0,0,0,0.03)';
const FBAHAVA = "'FB Ahava', 'Assistant', sans-serif";
const TITLE_FONT = "'Frank Ruhl Libre', 'FB Ahava', serif";

const GoldText = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <span
    className={className}
    style={{
      background: GOLD_TEXT_GRADIENT,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      ...style,
    }}
  >
    {children}
  </span>
);

const goldBtnStyle: React.CSSProperties = {
  background: METALLIC_GOLD_GRADIENT,
  backgroundSize: '200% 100%',
  border: 'none',
  boxShadow: '0 4px 20px rgba(212,175,55,0.4), 0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(249,242,149,0.6)',
  color: '#4A3520',
  fontWeight: 700,
  borderRadius: '16px',
  letterSpacing: '0.03em',
};

/* ─── Logo Header ─── */
const LogoBrand = ({ lang, setLang, hasUnread = false, onBellClick }: { lang: 'en' | 'he'; setLang: (l: 'en' | 'he') => void; hasUnread?: boolean; onBellClick?: () => void }) => (
  <div className="flex items-center justify-between px-4 pt-3 pb-2">
    {/* Language toggle — left */}
    <button
      onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
      className="flex items-center justify-center w-9 h-9 rounded-full text-xs font-extrabold tracking-wide transition-all hover:scale-105 active:scale-95"
      style={{
        background: METALLIC_GOLD_GRADIENT,
        backgroundSize: '200% 100%',
        color: '#5C4033',
        boxShadow: '0 2px 10px rgba(191,149,63,0.4)',
      }}
    >
      {lang === 'he' ? 'EN' : 'עב'}
    </button>
    {/* Centered hero logo */}
    <img
      src={heroLogo}
      alt="Glow Push"
      className="object-contain"
      style={{ maxHeight: '82px', filter: 'drop-shadow(0 2px 8px rgba(191,149,63,0.3))' }}
    />
    {/* Notification bell — right */}
    <button
      onClick={onBellClick}
      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all hover:scale-105 active:scale-95"
      style={{
        background: METALLIC_GOLD_GRADIENT,
        backgroundSize: '200% 100%',
        boxShadow: '0 2px 10px rgba(191,149,63,0.4)',
      }}
      aria-label="Notifications"
    >
      <Bell className="w-[18px] h-[18px]" style={{ color: '#5C4033' }} strokeWidth={2.2} />
      {hasUnread && (
        <span
          className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white/80"
          style={{
            background: 'radial-gradient(circle, hsl(350 55% 75%) 0%, hsl(350 50% 65%) 100%)',
            boxShadow: '0 0 6px hsl(350 55% 75% / 0.6)',
          }}
        />
      )}
    </button>
  </div>
);

/* ─── Push Notification Banner ─── */
function ClientPushBanner({ clientId, clientName, artistProfileId, lang }: { clientId: string; clientName: string; artistProfileId: string; lang: 'en' | 'he' }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed'>('idle');
  const validClientId = isUUID(clientId);

  useEffect(() => {
    let cancelled = false;
    if (!validClientId) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('push_subscriptions').select('id').eq('client_id', clientId).limit(1);
        if (cancelled) return;
        if (error) { console.warn('[ClientPushBanner] check err:', error.message); return; }
        if (data && data.length > 0) setStatus('subscribed');
      } catch (err) { if (!cancelled) console.error('[ClientPushBanner] err:', err); }
    })();
    return () => { cancelled = true; };
  }, [clientId, validClientId]);

  const handleSubscribe = async () => {
    if (!validClientId) {
      toast({ title: lang === 'en' ? 'Missing secure client link' : 'חסר מזהה לקוחה מאובטח בקישור', variant: 'destructive' });
      return;
    }
    setStatus('loading');
    try {
      await supabase.from('push_subscriptions').delete().eq('client_id', clientId);
      const result = await subscribeToPush({ clientId, clientName, artistProfileId });
      if (result.success) {
        setStatus('subscribed');
        toast({ title: lang === 'en' ? 'Notifications enabled! ✅' : 'התראות הופעלו בהצלחה! ✅' });
      } else {
        setStatus('idle');
        toast({ title: lang === 'en' ? 'Failed to subscribe' : 'ההרשמה נכשלה', description: result.error, variant: 'destructive' });
      }
    } catch {
      setStatus('idle');
      toast({ title: lang === 'en' ? 'Failed to subscribe' : 'ההרשמה נכשלה', variant: 'destructive' });
    }
  };

  if (!clientId && !clientName) return null;

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === 'loading'}
      className="w-full rounded-2xl p-4 mb-5 flex items-center justify-center gap-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50 animate-fade-up"
      style={{
        animationDelay: '50ms',
        background: status === 'subscribed' ? 'hsl(142 50% 94%)' : CARD_BG,
        border: status === 'subscribed' ? '2px solid hsl(142 60% 50%)' : GOLD_BORDER,
        color: status === 'subscribed' ? 'hsl(142 60% 30%)' : '#7A5C2E',
        backdropFilter: 'blur(12px)',
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

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
const ClientHome = () => {
  const { toast } = useToast();
  const { t, lang, setLang } = useI18n();
  const [searchParams] = useSearchParams();
  const { clientId: pathClientId } = useParams<{ clientId?: string }>();
  const navigate = useNavigate();
  const timelineRef = useRef<HTMLDivElement>(null);

  const urlClientId = pathClientId || searchParams.get('client_id') || searchParams.get('clientId') || '';
  const urlClientName = searchParams.get('name') || searchParams.get('clientName') || '';
  const fallbackName = 'לקוחה';

  // Auto-redirect: if on /client with no identity in URL but localStorage has one, redirect to /c/:id
  useEffect(() => {
    if (!pathClientId && !searchParams.get('client_id') && !searchParams.get('clientId')) {
      const { storedId } = getStoredClientIdentity();
      if (storedId && isUUID(storedId)) {
        const storedName = localStorage.getItem(LS_CLIENT_NAME) || '';
        const storedStart = localStorage.getItem(LS_START) || '';
        const storedTreatment = localStorage.getItem(LS_TREATMENT) || '';
        const storedArtist = localStorage.getItem(LS_ARTIST_ID) || '';
        const params = new URLSearchParams();
        if (storedName) params.set('name', storedName);
        if (storedStart) params.set('start', storedStart);
        if (storedTreatment) params.set('treatment', storedTreatment);
        if (storedArtist) params.set('artist_id', storedArtist);
        const qs = params.toString();
        navigate(`/c/${storedId}${qs ? '?' + qs : ''}`, { replace: true });
      }
    }
  }, [pathClientId, searchParams, navigate]);

  const [identity, setIdentity] = useState<{ clientId: string; clientName: string; source: 'url' | 'storage' | 'empty' }>(() => {
    if (urlClientId) return { clientId: urlClientId, clientName: urlClientName, source: 'url' };
    const { storedId, storedName } = getStoredClientIdentity();
    if (storedId) return { clientId: storedId, clientName: storedName, source: 'storage' };
    return { clientId: '', clientName: '', source: 'empty' };
  });

  useEffect(() => {
    if (urlClientId) {
      localStorage.setItem(LS_CLIENT_ID, urlClientId);
      if (urlClientName) localStorage.setItem(LS_CLIENT_NAME, urlClientName);
      setIdentity({ clientId: urlClientId, clientName: urlClientName, source: 'url' });
    } else {
      const { storedId, storedName } = getStoredClientIdentity();
      if (storedId) setIdentity({ clientId: storedId, clientName: storedName, source: 'storage' });
      else setIdentity({ clientId: '', clientName: '', source: 'empty' });
    }
    const s = searchParams.get('start'); if (s) localStorage.setItem(LS_START, s);
    const tt = searchParams.get('treatment'); if (tt) localStorage.setItem(LS_TREATMENT, tt);
    const a = searchParams.get('artist_id'); if (a) localStorage.setItem(LS_ARTIST_ID, a);
  }, [urlClientId, urlClientName, searchParams]);

  const clientId = identity.clientId;
  const [dbClientName, setDbClientName] = useState<string | null>(null);
  const [dbClientPhone, setDbClientPhone] = useState<string | null>(null);
  const [dbReferralCode, setDbReferralCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isUUID(clientId)) { setDbClientName(null); setDbClientPhone(null); setDbReferralCode(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase.from('clients').select('full_name, phone, referral_code').eq('id', clientId).maybeSingle();
        if (cancelled || error) return;
        if (data?.full_name) setDbClientName(data.full_name.split(' ')[0]);
        if (data?.phone) setDbClientPhone(data.phone);
        if (data?.referral_code) setDbReferralCode(data.referral_code);
      } catch (err) { if (!cancelled) console.error('[ClientHome] err:', err); }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const clientName = urlClientName || identity.clientName || dbClientName || fallbackName;

  // Referral code
  const generatedReferralCode = useMemo(() => {
    const firstName = (clientName || '').split(' ')[0].toUpperCase();
    const phoneSuffix = dbClientPhone ? dbClientPhone.replace(/\D/g, '').slice(-4) : '';
    const idSuffix = clientId ? clientId.replace(/-/g, '').slice(0, 4).toUpperCase() : '';
    return firstName + (phoneSuffix.length === 4 ? phoneSuffix : idSuffix);
  }, [clientName, dbClientPhone, clientId]);

  const referralCode = generatedReferralCode;

  useEffect(() => {
    if (!isUUID(clientId) || !referralCode || dbReferralCode === referralCode) return;
    supabase.rpc('save_client_referral_code', { p_client_id: clientId, p_code: referralCode }).then(({ error }) => {
      if (!error) setDbReferralCode(referralCode);
    });
  }, [clientId, referralCode, dbReferralCode]);

  const startDateParam = searchParams.get('start') || localStorage.getItem(LS_START) || '';
  const treatmentParam = searchParams.get('treatment') || localStorage.getItem(LS_TREATMENT) || '';
  const treatment: TreatmentType = treatmentParam === 'lips' ? 'lips' : 'eyebrows';
  const logoUrl = searchParams.get('logo') || STUDIO_LOGO_URL || '';
  const artistName = searchParams.get('artist') || '';
  const artistPhone = searchParams.get('phone') || '';
  const artistProfileId = searchParams.get('artist_id') || localStorage.getItem(LS_ARTIST_ID) || '';

  const { phases, loading: phasesLoading, error: phasesError, getPhaseForDay } = useHealingPhases(treatment);

  const validClientId = isUUID(clientId) ? clientId : undefined;
  const gallery = useClientGallery(validClientId, artistProfileId || undefined);

  // Voucher settings
  const [voucherTextHe, setVoucherTextHe] = useState('שלחי לחברה את הקוד שלך! היא תקבל 100 ש"ח הנחה לטיפול ראשון, ואת תקבלי 50 ש"ח קרדיט לטיפול החיזוק הבא שלך.');
  const [voucherTextEn, setVoucherTextEn] = useState('Send your code to a friend! She gets ₪100 off her first treatment, and you get ₪50 credit for your next touch-up.');
  const [voucherWaHe, setVoucherWaHe] = useState('היי! 🎁 הנה קוד ההנחה שלי: [CODE] — תקבלי 100 ש"ח הנחה על הטיפול הראשון! ✨');
  const [voucherWaEn, setVoucherWaEn] = useState('Hey! 🎁 Use my code [CODE] and get ₪100 off your first PMU treatment! ✨');
  const [artistInstagram, setArtistInstagram] = useState('');
  const [artistWaze, setArtistWaze] = useState('');
  const [artistBusinessPhone, setArtistBusinessPhone] = useState('');

  useEffect(() => {
    if (!artistProfileId) return;
    (async () => {
      const { data } = await supabase
        .from('artist_message_settings')
        .select('settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();
      if (data?.settings && typeof data.settings === 'object') {
        const s = data.settings as Record<string, unknown>;
        if (s.voucher_text_he) setVoucherTextHe(s.voucher_text_he as string);
        if (s.voucher_text_en) setVoucherTextEn(s.voucher_text_en as string);
        if (s.voucher_wa_he) setVoucherWaHe(s.voucher_wa_he as string);
        if (s.voucher_wa_en) setVoucherWaEn(s.voucher_wa_en as string);
      }
      // Get artist profile for contact info
      const { data: profile } = await supabase
        .from('profiles')
        .select('instagram_url, waze_address, business_phone')
        .eq('id', artistProfileId)
        .maybeSingle();
      if (profile) {
        if (profile.instagram_url) setArtistInstagram(profile.instagram_url);
        if (profile.waze_address) setArtistWaze(profile.waze_address);
        if (profile.business_phone) setArtistBusinessPhone(profile.business_phone);
      }
    })();
  }, [artistProfileId]);

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
  const pushDay = searchParams.get('day');
  const parsedPushDay = pushDay ? Number.parseInt(pushDay, 10) : Number.NaN;
  const safeInitialDay = Number.isFinite(parsedPushDay) ? Math.max(1, Math.min(30, parsedPushDay)) : calculatedDay;
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
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors: ['#d4af37', '#e8d48b', '#fff', '#f5e6c8'] });
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
      setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors: ['#d4af37', '#e8d48b', '#fff', '#f5e6c8'], shapes: ['star', 'circle'] }), 400);
    }
  }, [viewingDay, actualDay]);

  const content = (() => {
    const dbPhase = getPhaseForDay(viewingDay);
    if (dbPhase) {
      return {
        title: dbPhase.title_he, titleEn: dbPhase.title_en,
        icon: dbPhase.icon, severity: dbPhase.severity as 'high' | 'medium' | 'low',
        steps: dbPhase.steps_he.map((he, i) => ({ he, en: dbPhase.steps_en[i] || he })),
      };
    }
    return { title: 'החשיפה הסופית ✨', titleEn: 'Final Result ✨', icon: '✨', severity: 'low' as const, steps: [{ he: '✨ הצבע מתייצב.', en: '✨ The color is stabilizing.' }] };
  })();

  const handleSyncCalendar = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(tomorrow); end.setMinutes(end.getMinutes() + 15);
    const url = window.location.href;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Glow Push//Recovery//EN', 'BEGIN:VEVENT',
      `DTSTART:${fmt(tomorrow)}`, `DTEND:${fmt(end)}`, 'RRULE:FREQ=DAILY;COUNT=30',
      `SUMMARY:Glow Push: טיפול יומי 🎀`, `DESCRIPTION:היי! זה הזמן להיכנס לאפליקציה ולבדוק את ההנחיות להיום: ${url}`,
      `URL:${url}`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'glow-push-plan.ics'; link.click(); URL.revokeObjectURL(link.href);
    toast({ description: lang === 'en' ? 'Your calendar is set! See you tomorrow morning ✨' : 'היומן שלך מסודר! נתראה מחר בבוקר ✨' });
  }, [lang, toast]);

  /* ─── Notification Center ─── */
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const treatmentStartDate = useMemo(() => {
    if (!startDateParam) return new Date();
    const d = new Date(startDateParam);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [startDateParam]);
  const handleUnreadCountChange = useCallback((count: number) => setUnreadCount(count), []);

  /* ─── Loading / Error ─── */
  if (phasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(350 50% 96%) 0%, hsl(350 45% 93%) 40%, hsl(30 30% 92%) 70%, hsl(40 35% 94%) 100%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-3 rounded-full" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (phasesError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, hsl(350 50% 96%) 0%, hsl(350 45% 93%) 40%, hsl(30 30% 92%) 70%, hsl(40 35% 94%) 100%)' }}>
        <div className="max-w-sm text-center p-6 rounded-2xl bg-white border border-destructive/30">
          <p className="text-destructive font-medium mb-2">שגיאה בטעינת נתונים</p>
          <p className="text-xs text-muted-foreground">{phasesError}</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: 'linear-gradient(160deg, hsl(350 50% 96%) 0%, hsl(350 45% 93%) 30%, hsl(30 25% 93%) 60%, hsl(40 30% 95%) 80%, hsl(350 40% 94%) 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* ─── HEADER ─── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(180deg, hsla(350,45%,95%,0.95) 0%, hsla(350,40%,94%,0.9) 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.2)',
          boxShadow: '0 2px 16px rgba(212,175,55,0.06)',
        }}
      >
        <div className="max-w-md mx-auto">
          <LogoBrand lang={lang} setLang={setLang} hasUnread={unreadCount > 0} onBellClick={() => setNotifOpen(true)} />
        </div>
      </header>

      {/* ─── NOTIFICATION CENTER ─── */}
      <ClientNotificationCenter
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        artistProfileId={artistProfileId}
        treatmentType={treatment}
        daysSinceTreatment={actualDay}
        clientName={clientName}
        lang={lang}
        startDate={treatmentStartDate}
        onUnreadCountChange={handleUnreadCountChange}
      />

      <div className="pt-28 max-w-md mx-auto px-4" dir="rtl">

        {/* ─── PUSH BANNER ─── */}
        <ClientPushBanner clientId={clientId} clientName={clientName} artistProfileId={artistProfileId} lang={lang} />

        {/* ─── GREETING CARD ─── */}
        <div
          className="relative mb-5 animate-fade-up rounded-3xl overflow-hidden"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
        >
          <div className="py-8 px-6 text-center">
            <h1
              className="text-2xl font-bold tracking-wide mb-3"
              style={{ fontFamily: TITLE_FONT, fontSize: '28px', lineHeight: 1.6 }}
            >
              <GoldText>{getTimeGreeting(clientName)}</GoldText>
            </h1>
            <span className="sr-only" data-client-identity-source={identity.source}>
              {`client-identity-source:${identity.source}|client-id:${clientId || 'none'}|client-name:${clientName || 'none'}`}
            </span>
          </div>
        </div>

        {/* ─── INSTRUCTIONS CARD ─── */}
        <div
          className="mb-5 animate-fade-up delay-100 rounded-3xl overflow-hidden"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
        >
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
              <Clipboard className="w-6 h-6" style={{ color: '#B8860B' }} />
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Daily Recovery Instructions' : 'הנחיות ההחלמה היומיות'}</GoldText>
            </h2>
            <p className="text-sm leading-relaxed" style={{ fontFamily: FBAHAVA, color: '#8B7355' }}>
              {lang === 'en'
                ? 'Follow the steps below to ensure perfect healing results. I\'m with you every step of the way! ✍️👄'
                : 'עקבי אחרי ההנחיות למטה כדי להבטיח תוצאות החלמה מושלמות. אני כאן איתך לאורך כל הדרך! ✍️👄'}
            </p>
            {/* Treatment badge */}
            <span
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mt-4 text-sm"
              style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)', color: '#8B6914', fontFamily: FBAHAVA }}
            >
              {treatment === 'lips' ? '👄' : '✍️'}{' '}
              {lang === 'en'
                ? `Treatment: ${treatment === 'lips' ? 'Lips' : 'Brows'} ✨`
                : `סוג הטיפול: ${treatment === 'lips' ? 'שפתיים' : 'גבות'} ✨`}
            </span>
          </div>
        </div>

        {/* ─── DAY COUNTER ─── */}
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up delay-200"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
        >
          {isPreviewing && (
            <div className="text-center mb-3">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(212,175,55,0.1)', color: '#8B6914', fontFamily: FBAHAVA }}>
                {lang === 'en' ? `Previewing Day ${viewingDay}` : `תצוגה מקדימה — יום ${viewingDay}`}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button onClick={() => handleDayChange(viewingDay - 1)} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(212,175,55,0.08)' }}>
              <ChevronRight className="w-4 h-4" style={{ color: '#B8860B' }} />
            </button>

            <div className={`relative flex items-center justify-center transition-all duration-500 ${glowRing ? 'scale-105' : ''}`}
              style={glowRing ? { filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))' } : undefined}
            >
              <CircularProgress percentage={(viewingDay / 30) * 100} size={160} strokeWidth={5} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <GoldText className="text-5xl" style={{ fontFamily: 'var(--font-serif)', fontWeight: 300 }}>{viewingDay}</GoldText>
                <p className="text-xs mt-1" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>
                  {t('client.day')} {viewingDay} {t('client.of')} 30
                </p>
              </div>
            </div>

            <button onClick={() => handleDayChange(viewingDay + 1)} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(212,175,55,0.08)' }}>
              <ChevronLeft className="w-4 h-4" style={{ color: '#B8860B' }} />
            </button>
          </div>

          <p className="text-center text-base mt-4 tracking-wider" style={{ fontFamily: TITLE_FONT }}>
            <GoldText>{lang === 'en' ? content.titleEn : content.title}</GoldText>
          </p>
          <p className="text-center text-xs mt-1" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>
            {treatment === 'lips'
              ? (lang === 'en' ? '💋 Lip Recovery' : '💋 החלמת שפתיים')
              : (lang === 'en' ? '✨ Brow Recovery' : '✨ החלמת גבות')}
          </p>
          {isPreviewing && (
            <button onClick={() => handleDayChange(actualDay)} className="block mx-auto mt-2 text-xs underline underline-offset-2 hover:opacity-80" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>
              {lang === 'en' ? '← Back to Today' : '← חזרה להיום'}
            </button>
          )}
        </div>

        {/* ─── HEALING TIMELINE ─── */}
        <div id="care" className="scroll-mt-20" />
        <HealingTimelineCarousel currentDay={viewingDay} artistProfileId={artistProfileId} treatment={treatment} />

        {/* ─── DAILY TREATMENT BUTTON ─── */}
        <div className="mb-5">
          <button
            onClick={handleDone}
            disabled={isDone}
            className={`w-full py-4 text-base transition-all duration-300 active:scale-[0.97] rounded-2xl flex items-center justify-center gap-3 ${isDone ? 'cursor-default opacity-80' : ''}`}
            style={{
              ...goldBtnStyle,
              fontSize: '16px',
              fontFamily: FBAHAVA,
            }}
          >
            {isDone ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {lang === 'en' ? 'Great job! See you tomorrow ✨' : 'כל הכבוד! נתראה מחר ✨'}
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-green-300" />
                {lang === 'en' ? 'I finished today\'s care' : '✅ סיימתי את הטיפול היומי'}
              </>
            )}
          </button>
        </div>

        {/* ─── SYNC CALENDAR ─── */}
        <button
          onClick={handleSyncCalendar}
          className="w-full mb-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] animate-fade-up"
          style={{ background: CARD_BG, backdropFilter: 'blur(12px)', border: GOLD_BORDER, color: '#8B6914', fontFamily: FBAHAVA }}
        >
          <CalendarPlus className="w-4 h-4" style={{ color: '#B8860B' }} />
          {lang === 'en' ? 'Sync Calendar Reminders 📅' : 'סנכרני תזכורות ליומן 📅'}
        </button>

        {/* ─── UPSELL CARD (Dynamic) ─── */}
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up relative overflow-hidden"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
        >
          {/* Corner badge */}
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold" style={{ background: 'rgba(212,175,55,0.12)', color: '#B8860B', fontFamily: FBAHAVA }}>
              {lang === 'en' ? '✨ Special Treat' : '✨ פינוק במיוחד בשבילך'}
            </span>
          </div>
          <div className="pt-6 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#B8860B' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Complete Your Look' : 'להשלמת המראה'}</GoldText>
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ fontFamily: FBAHAVA, color: '#8B7355' }}>
              {lang === 'en'
                ? 'Enhance your beauty with a complementary treatment. Ask your artist about exclusive offers just for you!'
                : 'השלימי את המראה שלך עם טיפול משלים. שאלי את המאפרת שלך על הצעות בלעדיות!'}
            </p>
            <a
              href={`https://wa.me/${artistBusinessPhone || artistPhone || ''}?text=${encodeURIComponent(
                lang === 'en'
                  ? `Hi! I'd love to hear about your special offer for completing my look ✨`
                  : `היי! אשמח לשמוע על ההטבה המיוחדת להשלמת המראה ✨`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm no-underline transition-all hover:opacity-90 active:scale-[0.97] rounded-2xl"
              style={{ ...goldBtnStyle, fontFamily: FBAHAVA }}
            >
              <Sparkles className="w-4 h-4" />
              {lang === 'en' ? 'Redeem Offer' : 'למימוש ההטבה'}
            </a>
          </div>
        </div>

        {/* ─── REFERRAL CARD ─── */}
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up overflow-hidden relative text-center"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
              <Gift className="w-7 h-7" style={{ color: '#B8860B' }} />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Bring a friend, get a gift!' : 'הביאי חברה, קבלי מתנה!'}</GoldText>
            </h2>
          </div>
          <p className="text-sm leading-relaxed mb-5 max-w-xs mx-auto" style={{ fontFamily: FBAHAVA, color: '#8B7355' }}>
            {lang === 'en' ? voucherTextEn : voucherTextHe}
          </p>
          <div className="flex items-center justify-center mb-5">
            <div className="px-8 py-3 rounded-2xl" style={{ ...goldBtnStyle }}>
              <span className="font-bold text-xl tracking-[0.15em]">{referralCode}</span>
            </div>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              (lang === 'en' ? voucherWaEn : voucherWaHe).replace(/\[CODE\]/g, referralCode)
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3.5 text-sm font-bold no-underline transition-all hover:opacity-90 active:scale-[0.97] rounded-2xl"
            style={{ ...goldBtnStyle, fontFamily: FBAHAVA }}
          >
            <MessageCircle className="w-5 h-5" />
            {lang === 'en' ? 'Share via WhatsApp' : 'שתפי בוואטסאפ'}
          </a>
        </div>

        {/* ─── CONTACT & QUICK LINKS ─── */}
        <div className="mb-5 animate-fade-up" dir="rtl">
          <div className="grid grid-cols-4 gap-3">
            {/* Phone */}
            <a
              href={`tel:${artistBusinessPhone || artistPhone || ''}`}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: CARD_BG, backdropFilter: 'blur(12px)', border: GOLD_BORDER, boxShadow: '0 2px 12px rgba(212,175,55,0.06)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
                <Phone className="w-4.5 h-4.5" style={{ color: '#B8860B' }} />
              </div>
              <span className="text-[11px]" style={{ color: '#8B6914', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Call' : 'חייגי'}</span>
            </a>
            {/* Waze */}
            <a
              href={artistWaze || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: CARD_BG, backdropFilter: 'blur(12px)', border: GOLD_BORDER, boxShadow: '0 2px 12px rgba(212,175,55,0.06)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
                <Navigation className="w-4.5 h-4.5" style={{ color: '#B8860B' }} />
              </div>
              <span className="text-[11px]" style={{ color: '#8B6914', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Navigate' : 'נווטי'}</span>
            </a>
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${artistBusinessPhone || artistPhone || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: CARD_BG, backdropFilter: 'blur(12px)', border: GOLD_BORDER, boxShadow: '0 2px 12px rgba(212,175,55,0.06)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
                <MessageCircle className="w-4.5 h-4.5" style={{ color: '#B8860B' }} />
              </div>
              <span className="text-[11px]" style={{ color: '#8B6914', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Chat' : 'וואטסאפ'}</span>
            </a>
            {/* Instagram */}
            <a
              href={artistInstagram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: CARD_BG, backdropFilter: 'blur(12px)', border: GOLD_BORDER, boxShadow: '0 2px 12px rgba(212,175,55,0.06)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
                <Instagram className="w-4.5 h-4.5" style={{ color: '#B8860B' }} />
              </div>
              <span className="text-[11px]" style={{ color: '#8B6914', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Inspire' : 'השראה'}</span>
            </a>
          </div>
        </div>

        {/* ─── FAQ ─── */}
        <div id="faq" className="scroll-mt-20" />
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up"
          style={{ background: CARD_BG, backdropFilter: 'blur(16px)', boxShadow: CARD_SHADOW, border: GOLD_BORDER }}
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1.5 mb-4 text-xs hover:underline underline-offset-2" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>
            <ArrowUp className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Back to top' : 'חזרה למעלה'}
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
              <HelpCircle className="w-5 h-5" style={{ color: '#B8860B' }} />
            </div>
            <h2 className="text-xl tracking-wide" style={{ fontFamily: FBAHAVA }}>
              <GoldText>{lang === 'en' ? 'Frequently Asked Questions' : 'שאלות נפוצות'}</GoldText>
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { key: 'faq-1', q: { en: 'Why do my brows look so dark today?', he: 'למה הגבות שלי נראות כל כך כהות היום?' }, a: { en: "That's completely natural! In the first few days the pigment oxidizes and darkens. After healing, the color will fade and look natural.", he: 'זה טבעי לגמרי! בימים הראשונים הפיגמנט מתחמצן ומתכהה. לאחר ההחלמה הצבע ידהה וייראה טבעי.' } },
              { key: 'faq-2', q: { en: "I'm peeling and it's really itchy, can I scratch?", he: 'התחיל לי קילוף וממש מגרד לי, מותר לגרד?' }, a: { en: "Absolutely not. Let your skin heal at its own pace so you don't damage the pigment.", he: 'בשום פנים ואופן לא. תני לעור להחלים בקצב שלו כדי לא לפגוע בפיגמנט.' } },
              { key: 'faq-3', q: { en: 'When can I wear makeup again?', he: 'מתי אפשר לחזור להתאפר?' }, a: { en: 'Avoid applying makeup directly on the treated area for 10-14 days.', he: 'הימנעי מאיפור ישירות על האזור המטופל למשך 10-14 ימים.' } },
              { key: 'faq-4', q: { en: 'Can I get the area wet in the shower?', he: 'מותר לי להרטיב את האזור במקלחת?' }, a: { en: 'In the first few days, keep the area as dry as possible.', he: 'בימים הראשונים יש לשמור על האזור יבש ככל הניתן.' } },
            ].map(faq => (
              <AccordionItem key={faq.key} value={faq.key} className="rounded-2xl px-4 overflow-hidden" style={{ border: '1px solid rgba(212,175,55,0.15)', background: 'rgba(212,175,55,0.03)' }}>
                <AccordionTrigger className="text-sm text-start py-4 hover:no-underline" style={{ color: '#5C4033', fontFamily: FBAHAVA }}>
                  {lang === 'en' ? faq.q.en : faq.q.he}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-4" style={{ color: '#8B7355', fontFamily: FBAHAVA }}>
                  {lang === 'en' ? faq.a.en : faq.a.he}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Spacer */}
        <div className="pb-24 pt-4" />

        {/* ─── BOTTOM NAVIGATION ─── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[60]"
          style={{
            background: 'linear-gradient(180deg, hsla(350,45%,95%,0.97) 0%, hsla(350,40%,94%,0.99) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -2px 20px rgba(212,175,55,0.08)',
            borderTop: '1px solid rgba(212,175,55,0.15)',
          }}
        >
          <div className="max-w-md mx-auto px-3 pt-2 pb-4 flex items-end justify-around">
            {/* Left 1: Aftercare */}
            <a
              href="#care"
              className="flex flex-col items-center gap-1 py-2 text-[11px] transition-all hover:opacity-80 active:scale-[0.93]"
              style={{ color: '#B8860B', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <Heart className="w-5 h-5" strokeWidth={1.5} style={{ color: '#D4AF37' }} />
              <span>{lang === 'en' ? 'Aftercare' : 'ההחלמה שלי'}</span>
            </a>

            {/* Left 2: Ask Artist (replaces Emergency) */}
            <a
              href={`https://wa.me/${artistBusinessPhone || artistPhone || ''}?text=${encodeURIComponent(
                lang === 'en' ? `Hi! I have a question about my treatment (Day ${actualDay}) ✨` : `היי! יש לי שאלה לגבי הטיפול (יום ${actualDay}) ✨`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 py-2 text-[11px] transition-all hover:opacity-80 active:scale-[0.93]"
              style={{ color: '#B8860B', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <MessageCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: '#D4AF37' }} />
              <span>{lang === 'en' ? 'Ask Artist' : 'שאלה למאפרת'}</span>
            </a>

            {/* Center FAB: Camera */}
            <div className="flex flex-col items-center -mt-6">
              <button
                onClick={() => bottomFileRef.current?.click()}
                disabled={bottomUploading}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 shadow-lg"
                style={{
                  background: METALLIC_GOLD_GRADIENT,
                  backgroundSize: '200% 100%',
                  boxShadow: '0 6px 24px rgba(212,175,55,0.5), 0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(249,242,149,0.6)',
                }}
              >
                {bottomUploading ? (
                  <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Camera className="w-7 h-7 text-white" strokeWidth={1.8} />
                )}
              </button>
              <span className="text-[10px] mt-1" style={{ color: '#B8860B', fontFamily: FBAHAVA }}>
                {bottomUploading ? (lang === 'en' ? 'Uploading...' : 'מעלה...') : (lang === 'en' ? 'Photo' : 'צילום')}
              </span>
            </div>
            <input ref={bottomFileRef} type="file" accept="image/*" className="hidden" onChange={handleBottomUpload} />

            {/* Right 1: FAQ */}
            <a
              href="#faq"
              className="flex flex-col items-center gap-1 py-2 text-[11px] transition-all hover:opacity-80 active:scale-[0.93]"
              style={{ color: '#B8860B', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: '#D4AF37' }} />
              <span>{lang === 'en' ? 'FAQ' : 'שאלות'}</span>
            </a>

            {/* Right 2: Gallery */}
            {validClientId && (
              <a
                href="#gallery"
                className="flex flex-col items-center gap-1 py-2 text-[11px] transition-all hover:opacity-80 active:scale-[0.93]"
                style={{ color: '#B8860B', fontFamily: FBAHAVA, minWidth: '56px' }}
              >
                <Heart className="w-5 h-5" strokeWidth={1.5} style={{ color: '#D4AF37' }} />
                <span>{lang === 'en' ? 'Gallery' : 'גלריה'}</span>
              </a>
            )}
          </div>
          <InstallBanner />
        </div>
      </div>
    </div>
  );
};

export default ClientHome;
