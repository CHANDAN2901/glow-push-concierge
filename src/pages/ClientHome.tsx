import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { usePromoSettings } from '@/hooks/usePromoSettings';
import { TreatmentType } from '@/lib/recovery-data';
import { useHealingPhases } from '@/hooks/useHealingPhases';
import { ChevronLeft, ChevronRight, Heart, Clock, Shield, CheckCircle2, Camera, Instagram, CalendarCheck, CalendarPlus, Check, Sparkles, Gift, MessageCircle, HelpCircle, ChevronDown, ArrowUp, Bell, Phone, Navigation } from 'lucide-react';
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
import pmuHeroPhoto from '@/assets/pmu-hero-closeup.jpg';

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

// Time-based greeting
function getTimeGreeting(name: string, lang: 'en' | 'he' = 'he'): string {
  const hour = new Date().getHours();
  if (lang === 'en') {
    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 18) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  }
  if (hour < 12) return `בוקר זוהר, ${name}`;
  if (hour < 18) return `צהריים זוהרים, ${name}`;
  return `ערב זוהר, ${name}`;
}

const MILESTONE_DAYS = [7, 14, 21, 30];
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/* ─── Shared style constants ─── */
const METALLIC_GOLD_GRADIENT = 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)';
const GOLD_TEXT_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';
const GOLD_BORDER = '1.5px solid rgba(212,175,55,0.45)';
const CARD_BG = 'linear-gradient(145deg, rgba(60,40,45,0.55) 0%, rgba(80,55,60,0.5) 50%, rgba(60,40,45,0.5) 100%)';
const CARD_SHADOW = '0 12px 40px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(212,175,55,0.15)';
const BODY_TEXT = '#4a3636';
const SUBTEXT_COLOR = '#6b5a5a';
const GOLD_ICON_GLOW = 'drop-shadow(0 0 8px rgba(212,175,55,0.6)) drop-shadow(0 2px 4px rgba(212,175,55,0.4))';
const FBAHAVA = "'FB Ahava', 'Assistant', sans-serif";
const TITLE_FONT = FBAHAVA;

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
  color: '#4a3636',
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
        color: '#4a3636',
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
      <Bell className="w-[18px] h-[18px]" style={{ color: '#4a3636' }} strokeWidth={2.2} />
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
      className="w-full mb-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50 animate-fade-up client-glass-card"
      style={{
        color: status === 'subscribed' ? 'hsl(142 60% 30%)' : '#5C400A',
        fontFamily: FBAHAVA,
        ...(status === 'subscribed' ? {
          background: 'linear-gradient(145deg, rgba(200,240,220,0.9) 0%, rgba(220,250,235,0.85) 100%)',
          border: '2px solid hsl(142 60% 50%)',
        } : {}),
      }}
    >
      {status === 'loading' ? (
        <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <Bell className="w-4 h-4" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
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
  const { promo } = usePromoSettings(artistProfileId || undefined);
  const [showPromoModal, setShowPromoModal] = useState(false);

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0D0D5' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin w-8 h-8 border-3 rounded-full" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (phasesError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0D0D5' }}>
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
      className="min-h-screen pb-32 client-premium-bg"
    >
      {/* ─── HEADER ─── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl"
        style={{
          background: 'linear-gradient(180deg, rgba(240,208,213,0.96) 0%, rgba(240,208,213,0.88) 100%)',
          borderBottom: '2px solid rgba(212,175,55,0.35)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 0 12px rgba(212,175,55,0.06)',
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
        <div className="relative mb-6">
          <div className="relative py-10 px-6 text-center">
            <h1
              className="font-extrabold tracking-wide mb-3"
              style={{
                fontFamily: FBAHAVA,
                fontSize: '28px',
                lineHeight: 1.6,
                background: 'linear-gradient(160deg, #4A0E20 0%, #7A2845 15%, #B5546A 35%, #D4808E 50%, #B5546A 65%, #7A2845 85%, #4A0E20 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: 'none',
                WebkitTextStrokeWidth: '0.3px',
                WebkitTextStrokeColor: 'rgba(74,14,32,0.15)',
              } as React.CSSProperties}
            >
              ✨ {lang === 'en' ? `Welcome to your healing journey, ${clientName}!` : `ברוכה הבאה למסע ההחלמה שלך, ${clientName}!`} ✨
            </h1>
            <p className="text-sm mt-1" style={{ color: SUBTEXT_COLOR, fontFamily: FBAHAVA, letterSpacing: '0.02em' }}>
              {lang === 'en' ? 'Follow your progress daily' : 'עקבי אחר ההתקדמות שלך בכל יום'}
            </p>
            <p className="text-xs mt-2 opacity-80" style={{ color: SUBTEXT_COLOR, fontFamily: FBAHAVA }}>
              {getTimeGreeting(clientName)}
            </p>
            <span className="sr-only" data-client-identity-source={identity.source}>
              {`client-identity-source:${identity.source}|client-id:${clientId || 'none'}|client-name:${clientName || 'none'}`}
            </span>
          </div>
        </div>

        {/* ─── CURRENT TREATMENT STATUS ─── */}
        <div
          className="mb-5 rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.78) 0%, rgba(255,250,248,0.72) 50%, rgba(255,255,255,0.68) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(212,175,55,0.12)',
          }}
        >
          <div className="px-6 pt-8 pb-8 text-center" dir="rtl">
            {/* Phase title */}
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>
                {lang === 'en'
                  ? `✨ Day ${viewingDay}: ${content.titleEn} ✨`
                  : `✨ יום ${viewingDay}: ${content.title} ✨`}
              </GoldText>
            </h2>

            {/* ─── GOLD RING GRAPHIC ─── */}
            <div className="relative mx-auto mb-5" style={{ width: '160px', height: '160px' }}>
              {/* Outer gold ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: METALLIC_GOLD_GRADIENT,
                  padding: '6px',
                  boxShadow: '0 8px 32px rgba(212,175,55,0.35), 0 0 24px rgba(212,175,55,0.15)',
                }}
              >
                <div className="w-full h-full rounded-full" style={{ background: 'rgba(255,255,255,0.85)' }} />
              </div>
              {/* Inner content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold" style={{ fontFamily: FBAHAVA, color: '#8B6508', letterSpacing: '0.1em' }}>
                  {lang === 'en' ? 'DAY' : 'יום'}
                </span>
                <span
                  className="font-bold leading-none"
                  style={{
                    fontSize: '52px',
                    fontFamily: TITLE_FONT,
                    background: METALLIC_GOLD_GRADIENT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 2px 4px rgba(212,175,55,0.3))',
                  }}
                >
                  {viewingDay}
                </span>
              </div>
              {/* Left gold arrow */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ left: '-18px' }}>
                <ChevronRight className="w-6 h-6" style={{ color: '#D4AF37', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' }} />
              </div>
              {/* Right gold arrow */}
              <div className="absolute top-1/2 -translate-y-1/2" style={{ right: '-18px' }}>
                <ChevronLeft className="w-6 h-6" style={{ color: '#D4AF37', filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.5))' }} />
              </div>
            </div>

            {/* "This is how it should look" */}
            <p className="text-sm leading-relaxed mb-5" style={{ fontFamily: FBAHAVA, color: BODY_TEXT, fontWeight: 600 }}>
              {lang === 'en' ? 'Your recovery day' : 'יום ההחלמה שלך'}
            </p>


          </div>

        </div>


        {/* ─── DAILY ACTIONS ─── */}
        <div className="grid grid-cols-2 gap-3 mb-5 animate-fade-up delay-150" dir="rtl">
          {/* Daily Check-in */}
          <button
            onClick={() => {
              const galleryEl = document.getElementById('gallery');
              if (galleryEl) galleryEl.scrollIntoView({ behavior: 'smooth' });
            }}
            className="rounded-2xl p-5 text-center transition-all hover:scale-[1.02] active:scale-[0.97] client-glass-card"
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: METALLIC_GOLD_GRADIENT, boxShadow: '0 4px 20px rgba(212,175,55,0.5), 0 0 16px rgba(212,175,55,0.3)' }}>
              <Camera className="w-6 h-6 text-white" strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Daily Check-in' : 'תיעוד יומי'}</GoldText>
            </h3>
            <p className="text-[10px] leading-relaxed" style={{ fontFamily: FBAHAVA, color: BODY_TEXT }}>
              {lang === 'en' ? 'Photograph and upload to the shared gallery' : 'צלמי את אזור הטיפול והעלי לגלריה המשותפת'}
            </p>
          </button>

          {/* Moisture Tracker */}
          <div
            className="rounded-2xl p-5 text-center client-glass-card"
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(100,180,230,0.2), rgba(60,140,200,0.15))' }}>
              <span className="text-2xl">💧</span>
            </div>
            <h3 className="text-sm font-bold mb-1" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Moisture Tracker' : 'מעקב לחות'}</GoldText>
            </h3>
            <p className="text-[10px] leading-relaxed" style={{ fontFamily: FBAHAVA, color: BODY_TEXT }}>
              {lang === 'en' ? 'Next: apply moisturizer / drink water' : 'הטיימר הבא: מריחת מלחח / שתיית מים'}
            </p>
            {/* Mini progress bar */}
            <div className="mt-3 w-full rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(212,175,55,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: '65%',
                  background: 'linear-gradient(90deg, #64B4E6, #3C8CC8)',
                  boxShadow: '0 0 6px rgba(100,180,230,0.4)',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ─── DAY NAVIGATION (minimal) ─── */}
        <div className="flex items-center justify-center gap-4 mb-5 animate-fade-up delay-200">
          <button
            onClick={() => handleDayChange(viewingDay - 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: 'rgba(139,101,8,0.1)', border: '1.5px solid rgba(139,101,8,0.25)' }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: '#8B6508' }} />
          </button>
          <span className="text-sm font-bold" style={{ fontFamily: FBAHAVA, color: '#5C400A' }}>
            {isPreviewing
              ? (lang === 'en' ? `Previewing Day ${viewingDay}` : `תצוגה מקדימה — יום ${viewingDay}`)
              : (lang === 'en' ? `Day ${viewingDay} of 30` : `יום ${viewingDay} מתוך 30`)}
          </span>
          <button
            onClick={() => handleDayChange(viewingDay + 1)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: 'rgba(139,101,8,0.1)', border: '1.5px solid rgba(139,101,8,0.25)' }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: '#8B6508' }} />
          </button>
        </div>
        {isPreviewing && (
          <div className="text-center mb-4">
            <button onClick={() => handleDayChange(actualDay)} className="text-xs underline underline-offset-2 hover:opacity-80" style={{ color: '#8B6508', fontFamily: FBAHAVA }}>
              {lang === 'en' ? '← Back to Today' : '← חזרה להיום'}
            </button>
          </div>
        )}

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
                <Check className="w-5 h-5" />
                {lang === 'en' ? "I finished today's care routine" : '✅ סיימתי את הטיפול היומי'}
              </>
            )}
          </button>
        </div>

        {/* ─── SYNC CALENDAR ─── */}
        <button
          onClick={handleSyncCalendar}
          className="w-full mb-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] animate-fade-up client-glass-card"
          style={{ color: '#5C400A', fontFamily: FBAHAVA }}
        >
          <CalendarPlus className="w-4 h-4" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
          {lang === 'en' ? 'Sync Calendar Reminders 📅' : 'סנכרני תזכורות ליומן 📅'}
        </button>

        {/* ─── UPSELL CARD (Dynamic from DB) ─── */}
        {promo.is_enabled && (
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up relative overflow-hidden client-glass-card"
        >
          {/* Illuminated glow border effect */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ boxShadow: 'inset 0 0 30px rgba(212,175,55,0.08)' }} />
          {/* Corner badge */}
          <div className="absolute top-3 left-3">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg, #d69da9 0%, #cf8f9b 40%, #c4869a 70%, #cf8f9b 90%, #d69da9 100%)', color: '#fff', fontFamily: FBAHAVA, boxShadow: '0 4px 12px rgba(214,157,169,0.4), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(180,100,120,0.15)', textShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
              {promo.tag_text}
            </span>
          </div>
          {/* Sparkle decorations */}
          <div className="absolute top-4 right-4 text-lg opacity-60" style={{ animation: 'sparkle-fade 2s ease-in-out infinite' }}>⭐</div>
          <div className="absolute bottom-6 left-6 text-sm opacity-40" style={{ animation: 'sparkle-fade 2.5s ease-in-out infinite 0.5s' }}>✨</div>
          <div className="pt-8 text-center relative">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: METALLIC_GOLD_GRADIENT, boxShadow: '0 6px 28px rgba(212,175,55,0.5), 0 0 16px rgba(212,175,55,0.3)' }}>
              <Gift className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{promo.title || (lang === 'en' ? 'Complete the Look Offer!' : 'מבצע להשלמת המראה!')}</GoldText>
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: FBAHAVA, color: BODY_TEXT }}>
              {promo.description}
            </p>
            <button
              onClick={() => setShowPromoModal(true)}
              className="inline-flex items-center justify-center gap-2.5 px-10 py-3.5 text-sm font-bold transition-all hover:brightness-105 active:scale-[0.97] rounded-2xl cursor-pointer"
              style={{ ...goldBtnStyle, fontFamily: FBAHAVA, border: 'none', fontSize: '15px' }}
            >
              <Sparkles className="w-4.5 h-4.5" />
              {promo.button_text || (lang === 'en' ? 'Book Now' : 'הזמיני עכשיו')}
            </button>
          </div>
        </div>
        )}

        {/* ─── REFERRAL CARD ─── */}
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up overflow-hidden relative text-center client-glass-card"
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
              <Gift className="w-7 h-7" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Bring a friend, get a gift!' : 'הביאי חברה, קבלי מתנה!'}</GoldText>
            </h2>
          </div>
          <p className="text-sm leading-relaxed mb-5 max-w-xs mx-auto" style={{ fontFamily: FBAHAVA, color: BODY_TEXT }}>
            {lang === 'en' ? voucherTextEn : voucherTextHe}
          </p>
          <div className="flex items-center justify-center mb-5">
            <div className="px-8 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #e8b8c0 0%, #d69da9 30%, #c4838f 60%, #d69da9 80%, #e8b8c0 100%)', backgroundSize: '200% 100%', color: '#fff', border: 'none', boxShadow: '0 4px 15px rgba(214,157,169,0.45), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
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
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] client-glass-card"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                <Phone className="w-4.5 h-4.5" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
              </div>
              <span className="text-[11px]" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Call' : 'חייגי'}</span>
            </a>
            {/* Waze */}
            <a
              href={artistWaze || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] client-glass-card"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                <Navigation className="w-4.5 h-4.5" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
              </div>
              <span className="text-[11px]" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Navigate' : 'נווטי'}</span>
            </a>
            {/* WhatsApp */}
            <a
              href={`https://wa.me/${artistBusinessPhone || artistPhone || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] client-glass-card"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                <MessageCircle className="w-4.5 h-4.5" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
              </div>
              <span className="text-[11px]" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Chat' : 'וואטסאפ'}</span>
            </a>
            {/* Instagram */}
            <a
              href={artistInstagram || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-all hover:scale-[1.03] active:scale-[0.97] client-glass-card"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
                <Instagram className="w-4.5 h-4.5" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
              </div>
              <span className="text-[11px]" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>{lang === 'en' ? 'Inspire' : 'השראה'}</span>
            </a>
          </div>
        </div>

        {/* ─── SHARED GALLERY ─── */}
        <div id="gallery" className="scroll-mt-20" />
        <div
          className="rounded-3xl p-6 mb-8 animate-fade-up client-glass-card"
          dir="rtl"
        >
          {/* Premium Title */}
          <h2
            className="text-xl font-bold text-center mb-1"
            style={{
              fontFamily: TITLE_FONT,
              background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ✨ הגלריה שלך ✨
          </h2>
          {/* Delicate Subtitle */}
          <p
            className="text-[11px] text-center mb-5"
            style={{
              fontFamily: FBAHAVA,
              background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {lang === 'en' ? 'A peek at your results' : 'הצצה לתוצאות'}
          </p>

          <ClientSharedGallery
            clientId={clientId}
            artistId={artistProfileId}
            gallery={gallery}
          />
        </div>

        {/* ─── FAQ ─── */}
        <div id="faq" className="scroll-mt-20" />
        <div
          className="rounded-3xl p-6 mb-5 animate-fade-up client-glass-card"
          dir={lang === 'he' ? 'rtl' : 'ltr'}
        >
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-1.5 mb-4 text-xs hover:underline underline-offset-2" style={{ color: '#8B6508', fontFamily: FBAHAVA }}>
            <ArrowUp className="w-3.5 h-3.5" />
            {lang === 'en' ? 'Back to top' : 'חזרה למעלה'}
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)' }}>
              <HelpCircle className="w-5 h-5" style={{ color: '#D4AF37', filter: GOLD_ICON_GLOW }} />
            </div>
            <h2 className="text-xl tracking-wide" style={{ fontFamily: TITLE_FONT }}>
              <GoldText>{lang === 'en' ? 'Frequently Asked Questions' : 'שאלות נפוצות'}</GoldText>
            </h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {[
              {
                key: 'faq-1',
                q_he: 'הצבע נראה לי כהה ועבה מדי, זה יישאר ככה?',
                q_en: 'The color looks too dark and thick, will it stay like this?',
                a_he: 'ממש לא! בימים הראשונים הפיגמנט מתחמצן ומתכהה, וזה טבעי לגמרי. לאחר שלב הקילוף, הצבע יתבהר משמעותית (בין 30% ל-50%) ויתרכך לגוון הטבעי והמדויק שבחרנו.',
                a_en: 'Not at all! In the first days the pigment oxidizes and darkens, which is completely natural. After the peeling stage, the color will lighten significantly (30-50%) and soften to the natural, precise shade we chose.',
              },
              {
                key: 'faq-2',
                q_he: 'אחרי שהקילוף ירד, נראה כאילו אין לי צבע בכלל. זה הגיוני?',
                q_en: 'After the peeling, it looks like there\'s no color at all. Is this normal?',
                a_he: 'כן! זה נקרא "שלב החלביות" של העור. העור החדש שצומח מסתיר מעט את הפיגמנט. הצבע יחזור ויצוף אל פני השטח בהדרגה במהלך השבועות הקרובים.',
                a_en: 'Yes! This is called the "milky phase" of the skin. The new skin growing hides the pigment slightly. The color will gradually resurface over the coming weeks.',
              },
              {
                key: 'faq-3',
                q_he: 'האזור מתחיל להתקלף ומאוד מגרד לי, מותר לי לגרד או לעזור לקילוף לרדת?',
                q_en: 'The area is peeling and very itchy, can I scratch or help the peeling come off?',
                a_he: 'בשום פנים ואופן לא. משיכה או גירוד של הקילופים עלולים למשוך החוצה את הפיגמנט ולפגוע בתוצאה, ואפילו ליצור צלקת. תני לעור להחלים בקצב שלו. אם מאוד מגרד, אפשר לטפוח ממש בעדינות מסביב.',
                a_en: 'Absolutely not. Pulling or scratching the peeling skin can pull out pigment, damage results, and even cause scarring. Let your skin heal at its own pace. If very itchy, you can gently pat around the area.',
              },
              {
                key: 'faq-4',
                q_he: 'מתי אפשר לחזור להתאפר, לשים קרמים או לשטוף את הפנים כרגיל?',
                q_en: 'When can I wear makeup, apply creams, or wash my face normally again?',
                a_he: 'יש להימנע מאיפור, קרמים (שלא נתתי לך) או סבון על אזור הטיפול עצמו למשך 10 ימים לפחות. את שאר הפנים אפשר לנקות כרגיל, רק בזהירות מסביב.',
                a_en: 'Avoid makeup, creams (other than what I provided), or soap on the treated area for at least 10 days. You can clean the rest of your face normally, just be careful around the area.',
              },
              {
                key: 'faq-5',
                q_he: 'מותר לי לעשות ספורט או ללכת לבריכה/לים?',
                q_en: 'Can I exercise or go to the pool/beach?',
                a_he: 'בשבוע הראשון יש להימנע מפעילות גופנית מאומצת שגורמת להזעה רבה, מכיוון שהזיעה עלולה לדחות את הפיגמנט החוצה. כמו כן, חובה להימנע מבריכה, ים, סאונה או שמש ישירה עד להחלמה מלאה של העור.',
                a_en: 'During the first week, avoid intense physical activity that causes heavy sweating, as sweat can push out the pigment. Also, you must avoid pools, the sea, saunas, or direct sunlight until the skin is fully healed.',
              },
              {
                key: 'faq-6',
                q_he: 'עברו שבועיים והכל נעלם, עשיתי את הטיפול לחינם?',
                q_en: 'Two weeks passed and everything disappeared, was the treatment for nothing?',
                a_he: 'אל דאגה, זה חלק טבעי מהתהליך! העור בונה את עצמו מחדש ושכבה עליונה מסתירה זמנית את הפיגמנט. הצבע יתחיל "לצוף" בחזרה בהדרגה, ובטיפול הטאצ\'-אפ נשלים את הכל.',
                a_en: 'Don\'t worry, this is a natural part of the process! The skin rebuilds itself and a top layer temporarily hides the pigment. The color will gradually "float" back, and the touch-up treatment will complete everything.',
              },
              {
                key: 'faq-7',
                q_he: 'מתי מותר לי להיחשף לשמש או למרוח קרם הגנה?',
                q_en: 'When can I be in the sun or apply sunscreen?',
                a_he: 'בשבועיים הראשונים חובה להימנע משמש ישירה. לאחר עשרה ימים, כשהקילופים ירדו, חשוב מאוד למרוח קרם הגנה על האזור כדי לשמור על הפיגמנט ולמנוע דהייה.',
                a_en: 'During the first two weeks, you must avoid direct sunlight. After ten days, once the peeling is done, it\'s very important to apply sunscreen to the area to preserve the pigment and prevent fading.',
              },
              {
                key: 'faq-8',
                q_he: 'למה אני חייבת להגיע לטיפול השני (הטאצ\'-אפ)?',
                q_en: 'Why do I need to come for the second treatment (touch-up)?',
                a_he: 'איפור קבוע הוא תהליך של שני שלבים. בטיפול הראשון בונים את הבסיס, ובשני מחזקים את הצבע ומדייקים את הצורה. בלי הטיפול השני, התוצאה לא תישמר לאורך זמן.',
                a_en: 'Permanent makeup is a two-step process. The first treatment builds the base, and the second strengthens the color and refines the shape. Without the second treatment, the result won\'t last long-term.',
              },
              {
                key: 'faq-9',
                q_he: 'האם מותר לעשן או לשתות אלכוהול בימי ההחלמה?',
                q_en: 'Can I smoke or drink alcohol during the healing days?',
                a_he: 'מומלץ להימנע מאלכוהול 24 שעות לפני ואחרי הטיפול, שכן הוא מדלל את הדם ופוגע בקליטת הפיגמנט. עישון עלול להאט את קצב ריפוי העור ולגרום לדהייה מהירה יותר, לכן כדאי להפחית ככל הניתן בימים הראשונים.',
                a_en: 'It\'s recommended to avoid alcohol 24 hours before and after treatment, as it thins the blood and affects pigment absorption. Smoking can slow skin healing and cause faster fading, so try to reduce as much as possible in the first days.',
              },
            ].map((faq, idx, arr) => (
              <div key={faq.key}>
                <AccordionItem value={faq.key} className="border-none">
                  <AccordionTrigger
                    className={`text-sm ${lang === 'he' ? 'text-right' : 'text-left'} py-5 hover:no-underline gap-3 [&>svg]:hidden`}
                    style={{ fontFamily: FBAHAVA, direction: lang === 'he' ? 'rtl' : 'ltr' }}
                  >
                    <span
                      className={`font-bold ${lang === 'he' ? 'text-right' : 'text-left'} flex-1`}
                      style={{ color: '#2A1810' }}
                    >
                      {lang === 'he' ? faq.q_he : faq.q_en}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent
                    className={`text-sm leading-[1.85] pb-5 ${lang === 'he' ? 'text-right' : 'text-left'}`}
                    style={{ color: BODY_TEXT, fontFamily: FBAHAVA, fontWeight: 400, direction: lang === 'he' ? 'rtl' : 'ltr' }}
                  >
                    {lang === 'he' ? faq.a_he : faq.a_en}
                  </AccordionContent>
                </AccordionItem>
                {idx < arr.length - 1 && (
                  <div className="py-1">
                    <div
                      style={{
                        height: '3px',
                        width: '80%',
                        marginRight: lang === 'he' ? 0 : 'auto',
                        marginLeft: lang === 'he' ? 'auto' : 0,
                        borderRadius: '2px',
                        background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
                        boxShadow: '0 0 8px rgba(212,175,55,0.35), 0 0 16px rgba(212,175,55,0.1)',
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </Accordion>
        </div>

        {/* Spacer */}
        <div className="pb-24 pt-4" />

        {/* ─── BOTTOM NAVIGATION (B2C Only) ─── */}
        <div
          className="fixed bottom-0 left-0 right-0 z-[60]"
          style={{
            background: 'linear-gradient(180deg, rgba(240,208,213,0.97) 0%, rgba(234,200,205,0.99) 100%)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.08), 0 -1px 0 rgba(212,175,55,0.3)',
            borderTop: '2px solid rgba(212,175,55,0.35)',
          }}
        >
          <div className="h-[2px] w-full" style={{ background: METALLIC_GOLD_GRADIENT }} />
          <div className="max-w-md mx-auto px-6 pt-3 pb-5 flex items-center justify-around">
            {/* Home */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex flex-col items-center gap-1.5 py-1 text-[10px] font-semibold transition-all hover:scale-105 active:scale-[0.93]"
              style={{ color: '#5C400A', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <Heart className="w-6 h-6" strokeWidth={2} style={{ color: '#B8860B', filter: GOLD_ICON_GLOW }} />
              <span>{lang === 'en' ? 'Home' : 'בית'}</span>
            </button>

            {/* My Journey */}
            <a
              href="#care"
              className="flex flex-col items-center gap-1.5 py-1 text-[10px] font-semibold transition-all hover:scale-105 active:scale-[0.93]"
              style={{ color: '#5C400A', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <Shield className="w-6 h-6" strokeWidth={2} style={{ color: '#B8860B', filter: GOLD_ICON_GLOW }} />
              <span>{lang === 'en' ? 'My Journey' : 'החלמה'}</span>
            </a>

            {/* Center FAB: Camera */}
            <div className="flex flex-col items-center -mt-8">
              <button
                onClick={() => bottomFileRef.current?.click()}
                disabled={bottomUploading}
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center disabled:opacity-50 gold-sphere-btn"
              >
                {bottomUploading ? (
                  <span className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Camera className="w-7 h-7 text-white" strokeWidth={1.8} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }} />
                )}
              </button>
              <span className="text-[10px] mt-1 font-semibold" style={{ color: '#5C400A', fontFamily: FBAHAVA }}>
                {bottomUploading ? (lang === 'en' ? 'Uploading...' : 'מעלה...') : (lang === 'en' ? 'Photo' : 'צילום')}
              </span>
            </div>
            <input ref={bottomFileRef} type="file" accept="image/*" className="hidden" onChange={handleBottomUpload} />

            {/* Messages */}
            <a
              href={`https://wa.me/${artistBusinessPhone || artistPhone || ''}?text=${encodeURIComponent(
                lang === 'en' ? `Hi! I have a question about my treatment (Day ${actualDay}) ✨` : `היי! יש לי שאלה לגבי הטיפול (יום ${actualDay}) ✨`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 py-1 text-[10px] font-semibold transition-all hover:scale-105 active:scale-[0.93]"
              style={{ color: '#5C400A', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <MessageCircle className="w-6 h-6" strokeWidth={2} style={{ color: '#B8860B', filter: GOLD_ICON_GLOW }} />
              <span>{lang === 'en' ? 'Messages' : 'הודעות'}</span>
            </a>

            {/* FAQ */}
            <a
              href="#faq"
              className="flex flex-col items-center gap-1.5 py-1 text-[10px] font-semibold transition-all hover:scale-105 active:scale-[0.93]"
              style={{ color: '#5C400A', fontFamily: FBAHAVA, minWidth: '56px' }}
            >
              <HelpCircle className="w-6 h-6" strokeWidth={2} style={{ color: '#B8860B', filter: GOLD_ICON_GLOW }} />
              <span>{lang === 'en' ? 'FAQ' : 'שאלות נפוצות'}</span>
            </a>
          </div>
          <InstallBanner />
        </div>
      </div>

      {/* ─── PROMO DETAILS MODAL ─── */}
      {showPromoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowPromoModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm rounded-3xl p-7 animate-in fade-in zoom-in-95 duration-200"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(212,175,55,0.15)',
              border: GOLD_BORDER,
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setShowPromoModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-black/5"
              style={{ color: '#8B7355' }}
            >
              ✕
            </button>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.1))' }}>
                <Sparkles className="w-7 h-7" style={{ color: '#B8860B' }} />
              </div>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: TITLE_FONT }}>
                <GoldText>{promo.title}</GoldText>
              </h2>
              <p className="text-sm leading-relaxed mb-7" style={{ fontFamily: FBAHAVA, color: '#8B7355' }}>
                {promo.description}
              </p>

              <a
                href={`https://wa.me/${(artistBusinessPhone || artistPhone || '').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(
                  lang === 'en'
                    ? `Hi! I saw the offer in the app: ${promo.title}, and I'd love to hear more details!`
                    : `היי! ראיתי באפליקציה את ההטבה: ${promo.title}, ואשמח לשמוע עוד פרטים!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPromoModal(false)}
                className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-bold no-underline transition-all hover:brightness-105 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, hsl(38 55% 42%), hsl(40 45% 32%))',
                  color: '#fff',
                  fontFamily: FBAHAVA,
                  boxShadow: '0 6px 24px -4px hsla(38, 55%, 42%, 0.5)',
                }}
              >
                <MessageCircle className="w-5 h-5" />
                {lang === 'en' ? 'Send message to artist' : 'שלחי הודעה למאפרת'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientHome;
