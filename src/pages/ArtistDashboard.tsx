import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TREATMENT_OPTIONS, getTreatmentLabel as getTreatmentLabelFn } from '@/lib/treatment-options';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import {
  Users, Upload, ToggleLeft, ToggleRight, Settings, FileText, Bell, Sparkles,
  Plus, MessageCircle, Clock, MessageSquare, Copy, CheckCircle, Trash2, Calendar, Gift,
  Lock, Globe, Camera, Star, Zap, Crown, AlertTriangle, X, ClipboardCheck,
  Share2, Image, DollarSign, CalendarCheck, Eye, HelpCircle, Smartphone, ShieldCheck, ShieldAlert,
  Mic, FileOutput, ChevronRight, CreditCard, Pencil, Home, ScrollText, ArrowRight, Loader2, Search,
} from 'lucide-react';
import defaultLogo from '@/assets/glowpush-logo.png';
import BackButton from '@/components/BackButton';
import DigitalCard from '@/pages/DigitalCard';
import HealthDeclaration, { type HealthDeclarationData } from '@/components/HealthDeclaration';
import VoiceTreatmentRecord from '@/components/VoiceTreatmentRecord';
import NewClientDispatch from '@/components/NewClientDispatch';
import UpgradeModal from '@/components/UpgradeModal';
import FeatureGate from '@/components/FeatureGate';
import { FK } from '@/lib/featureKeys';
import ReferralTab from '@/components/ReferralTab';
import HealthDeclarationPreview from '@/components/HealthDeclarationPreview';
import AiMagicSection from '@/components/AiMagicSection';
import HelpCenter from '@/components/HelpCenter';
import HealthDeclarationEditor from '@/components/HealthDeclarationEditor';
import ClinicPolicyEditor from '@/components/ClinicPolicyEditor';
import SmartCalendar from '@/components/SmartCalendar';
import SimpleGallery from '@/components/SimpleGallery';
import { DualPhotoGallery } from '@/components/DualPhotoGallery';
import HealingGallery from '@/components/HealingGallery';
import HealingPhotoGallery from '@/components/HealingPhotoGallery';
import BonusCenter from '@/components/BonusCenter';
import HealingJourneyTimeline from '@/components/HealingJourneyTimeline';
import MessageEditor from '@/components/MessageEditor';
import PlansUpgradeScreen from '@/components/PlansUpgradeScreen';
import DeclarationViewer from '@/components/DeclarationViewer';
import NotificationUpgradeSection from '@/components/NotificationUpgradeSection';
import HealingNotificationBadge from '@/components/HealingNotificationBadge';
import OnboardingWizard from '@/components/OnboardingWizard';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import EmptyClientState from '@/components/EmptyClientState';
import ClientImportDialog from '@/components/ClientImportDialog';
import BirthdayWishDialog from '@/components/BirthdayWishDialog';
import MessageTemplateSettings from '@/components/MessageTemplateSettings';
import RenewalMessageDialog, { isRenewalDue } from '@/components/RenewalMessageDialog';
import HelpTooltip from '@/components/HelpTooltip';
import WelcomeTour from '@/components/WelcomeTour';
import DailyGrowthEngine from '@/components/DailyGrowthEngine';
import ReferralVoucherEditor from '@/components/ReferralVoucherEditor';
import { useAftercareTemplates } from '@/hooks/useAftercareTemplates';
import { usePromoSettings } from '@/hooks/usePromoSettings';
import { useHealthQuestions, calculateDynamicRiskLevel } from '@/hooks/useHealthQuestions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { supabase } from '@/integrations/supabase/client';
import { extractEdgeFunctionError, isPushSubscriptionExpired } from '@/lib/edge-function-errors';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import PremiumPolicySwitch from '@/components/PremiumPolicySwitch';
import { useAuth } from '@/hooks/useAuth';
import { getImpersonation } from '@/lib/impersonation';
import { generateWhatsAppMessage, buildWhatsAppUrl } from '@/lib/whatsapp-messages';

interface ClientEntry {
  dbId?: string;
  name: string;
  phone: string;
  email?: string;
  day: number;
  treatment: string;
  link: string;
  beforeImg: string;
  afterImg: string;
  pushOptedIn?: boolean;
  birthDate?: string | null;
  medicalExceptionApproved?: boolean;
}

interface SmartMessage {
  id: string;
  label: string;
  labelEn: string;
  message: (name: string, link: string) => string;
  matchDay: (day: number) => boolean;
}

const SMART_MESSAGES: SmartMessage[] = [
  {
    id: 'congrats',
    label: 'ברכות 🎉',
    labelEn: 'Congrats 🎉',
    matchDay: (d) => d <= 1,
    message: (name, link) =>
      `היי ${name}! 🎉✨ מזל טוב על הטיפול החדש! הכנתי לך אפליקציה אישית שתלווה אותך בכל שלב של ההחלמה.\n\nהנה הקישור שלך:\n${link}\n\nשמרי עליו — הוא מעודכן כל יום עם הוראות מותאמות אישית 💕`,
  },
  {
    id: 'peeling',
    label: 'אזהרת קילופים 🛡️',
    labelEn: 'Peeling Warning 🛡️',
    matchDay: (d) => d >= 4 && d <= 7,
    message: (name, link) =>
      `היי ${name}! 🛡️ את בשלב הקילופים — זה נורמלי לגמרי! הדבר הכי חשוב: לא לגרד ולא לקלף! תני לזה לנשור לבד.\n\nכל ההוראות המפורטות ממתינות לך באפליקציה:\n${link}\n\nאת עושה עבודה מעולה 💪`,
  },
  {
    id: 'ghosting',
    label: 'הסבר Ghosting 👻',
    labelEn: 'Ghosting Explanation 👻',
    matchDay: (d) => d >= 9 && d <= 15,
    message: (name, link) =>
      `היי ${name}! 👻 אם את מרגישה שהצבע כמעט נעלם — זה בדיוק מה שצריך לקרות! זה נקרא שלב ה-Ghosting. הפיגמנט מתחבא מתחת לעור החדש ויחזור בהדרגה.\n\nעוד פרטים באפליקציה שלך:\n${link}\n\nסבלנות, יפה שלי! ✨`,
  },
  {
    id: 'touchup',
    label: 'תזכורת טאצ׳ אפ 📅',
    labelEn: 'Touch-up Reminder 📅',
    matchDay: (d) => d >= 25 && d <= 30,
    message: (name, link) =>
      `היי ${name}! 📅 את מתקרבת לסוף תהליך ההחלמה — את נראית מדהים! זה הזמן לקבוע תור לטאצ׳ אפ אם צריך.\n\nתסתכלי על ההתקדמות שלך:\n${link}\n\nנתראה בקרוב! 💕`,
  },
];

function getSmartMessage(day: number): SmartMessage {
  return SMART_MESSAGES.find(m => m.matchDay(day)) || SMART_MESSAGES[0];
}

function loadSentLog(): Record<string, string> {
  try {
    const raw = localStorage.getItem('gp-wa-sent-log');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveSentLog(log: Record<string, string>) {
  localStorage.setItem('gp-wa-sent-log', JSON.stringify(log));
}

const TRIAL_DAYS = 30;
const TRIAL_FEATURES = ['auto-messages', 'qr-code'];

// Features included per tier (master gets health-declaration for free)
const MASTER_INCLUDED_FEATURES = ['health-declaration'];

function calcTrialDaysLeft(createdAt: string | null): number {
  if (!createdAt) return TRIAL_DAYS;
  const start = new Date(createdAt);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, TRIAL_DAYS - elapsed);
}

export interface ShopProduct {
  name: string;
  price: string;
  emoji: string;
  url: string;
}

export function loadShopProducts(): ShopProduct[] {
  try {
    const raw = localStorage.getItem('gp-shop-products');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function encodeShopForUrl(products: ShopProduct[]): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(products))));
}

export function decodeShopFromUrl(encoded: string): ShopProduct[] {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch { return []; }
}

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (!digits.startsWith('972')) return '972' + digits;
  return digits;
};

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9א-ת]/g, '') +
  Math.floor(Math.random() * 900 + 100);

const ArtistDashboard = () => {
  const { t, lang, setLang } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { getMessageForDay, buildWhatsAppText, hasMessageForDay, getMatchingDayValue } = useAftercareTemplates();

  // Trial system — driven by profile created_at from DB
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('trial');
  const [subscriptionTier, setSubscriptionTier] = useState<string>('lite');

  const trialDaysLeft = calcTrialDaysLeft(profileCreatedAt);
  const trialActive = trialDaysLeft > 0;
  const isPaidUser = subscriptionStatus === 'active' || subscriptionTier === 'professional' || subscriptionTier === 'master';
  const trialExpired = !trialActive && !isPaidUser;

  // Redirect to /pricing if trial expired and not paid
  useEffect(() => {
    if (profileCreatedAt && trialExpired) {
      navigate('/pricing');
    }
  }, [profileCreatedAt, trialExpired, navigate]);

  // User tier
  const userTier = subscriptionTier as 'lite' | 'professional' | 'master';

  // Check if feature is available (tier, trial or purchased)
  const isFeatureAvailable = (featureId: string): boolean => {
    if (userTier === 'master' && MASTER_INCLUDED_FEATURES.includes(featureId)) return true;
    const savedFeatures = (() => { try { const r = localStorage.getItem('gp-enabled-features'); return r ? JSON.parse(r) : {}; } catch { return {}; } })();
    if (savedFeatures[featureId]) return true;
    if (TRIAL_FEATURES.includes(featureId) && trialActive) return true;
    return false;
  };
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [dismissedTouchup, setDismissedTouchup] = useState(() => !!localStorage.getItem('gp-dismiss-touchup'));
  const [medicalForm, setMedicalForm] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientPreviewOpen, setClientPreviewOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dispatchPrefill, setDispatchPrefill] = useState<{ name?: string; phone?: string; treatment?: string } | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [generatedClientName, setGeneratedClientName] = useState('');
  const [generatedClientPhone, setGeneratedClientPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [treatmentType, setTreatmentType] = useState('');
  const [treatmentDate, setTreatmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [beforeImg, setBeforeImg] = useState('');
  const [afterImg, setAfterImg] = useState('');
  const [formError, setFormError] = useState('');
  const [livePreviewLink, setLivePreviewLink] = useState('');
  const [savedLogoUrl, setSavedLogoUrl] = useState(() => localStorage.getItem('gp-artist-logo') || '');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('gp-artist-logo') || '');
  const [hasUnsavedLogoChange, setHasUnsavedLogoChange] = useState(false);
  const [artistName, setArtistName] = useState(() => localStorage.getItem('gp-artist-name') || '');
  const [artistPhone, setArtistPhone] = useState(() => localStorage.getItem('gp-artist-phone') || '');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [wazeAddress, setWazeAddress] = useState('');
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>(() => loadShopProducts());

  // URL-synced active tab
  const activeTabParam = searchParams.get('tab') as 'home' | 'clients' | 'calendar' | 'upgrades' | 'messages' | 'digital-card' | 'profile' | 'healing' | 'bonuses' | 'push' | null;
  const [activeTab, setActiveTabInternal] = useState<'home' | 'clients' | 'calendar' | 'upgrades' | 'messages' | 'digital-card' | 'profile' | 'healing' | 'bonuses' | 'push'>(activeTabParam || 'home');
  const selectedClientParam = searchParams.get('client');

  // Sync activeTab when URL tab param changes (e.g. from checklist navigation)
  useEffect(() => {
    if (activeTabParam && activeTabParam !== activeTab) {
      setActiveTabInternal(activeTabParam);
    }
  }, [activeTabParam]);

  // Use a ref to avoid searchParams in callback dependencies (prevents re-render loops)
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  // Wrap setActiveTab to sync URL
  const setActiveTab = useCallback((tab: 'home' | 'clients' | 'calendar' | 'upgrades' | 'messages' | 'digital-card' | 'profile' | 'healing' | 'bonuses' | 'push') => {
    setActiveTabInternal(tab);
    // Haptic feedback on tab switch
    if (navigator.vibrate) navigator.vibrate(50);
    const params = new URLSearchParams(searchParamsRef.current);
    params.set('tab', tab);
    params.delete('client');
    setSearchParams(params, { replace: true });
    // Scroll to top when switching tabs
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [setSearchParams]);

const [selectedClient, setSelectedClientInternal] = useState<ClientEntry | null>(null);
const [includePolicyShare, setIncludePolicyShare] = useState(true);

// Wrap setSelectedClient to sync URL
const setSelectedClient = useCallback((clientOrUpdater: ClientEntry | null | ((prev: ClientEntry | null) => ClientEntry | null)) => {
  setSelectedClientInternal(prev => {
    const newVal = typeof clientOrUpdater === 'function' ? clientOrUpdater(prev) : clientOrUpdater;
    const params = new URLSearchParams(searchParamsRef.current);
    if (newVal) {
      params.set('tab', 'clients');
      params.set('client', newVal.dbId || newVal.name);
    } else {
      params.delete('client');
    }
    setSearchParams(params, { replace: true });
    return newVal;
  });
}, [setSearchParams]);

useEffect(() => {
  setIncludePolicyShare(true);
}, [selectedClient?.dbId, selectedClient?.name]);

const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasUnsavedLogoChangeRef = useRef(false);

  const uploadProfileLogo = useCallback(async (currentLogoUrl: string) => {
    if (!currentLogoUrl?.startsWith('data:')) return currentLogoUrl || '';
    if (!user) throw new Error('User not authenticated');

    const blob = await fetch(currentLogoUrl).then((r) => r.blob());
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const version = Date.now();
    const fileName = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${version}`;
    const path = `${user.id}/logo-${fileName}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('portfolio')
      .upload(path, blob, { upsert: false, contentType: blob.type, cacheControl: '3600' });

    if (uploadErr) {
      console.error('Profile logo upload failed', { path, message: uploadErr.message, error: uploadErr });
      throw uploadErr;
    }

    const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path);
    return `${urlData.publicUrl}?v=${version}`;
  }, [user]);

  useEffect(() => {
    hasUnsavedLogoChangeRef.current = hasUnsavedLogoChange;
  }, [hasUnsavedLogoChange]);


  // Treatment notes history — persisted in localStorage per client
  interface TreatmentNote {
    id: string;
    date: string;
    rawText: string;
    structured?: { treatmentArea: string; pigmentFormula: string; needleType: string; clinicalNotes: string };
  }
  const [treatmentNotes, setTreatmentNotes] = useState<Record<string, TreatmentNote[]>>(() => {
    try { const raw = localStorage.getItem('gp-treatment-notes'); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });

  const saveTreatmentNote = useCallback((clientName: string, rawText: string, structured?: TreatmentNote['structured']) => {
    setTreatmentNotes(prev => {
      const existing = prev[clientName] || [];
      const note: TreatmentNote = {
        id: Date.now().toString(),
        date: new Date().toLocaleString('he-IL'),
        rawText,
        structured,
      };
      const updated = { ...prev, [clientName]: [note, ...existing] };
      localStorage.setItem('gp-treatment-notes', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [hasWhatsAppAutomation, setHasWhatsAppAutomation] = useState(false);

  // Promo settings hook
  const { promo, savePromo } = usePromoSettings(userProfileId);
  const [promoTagText, setPromoTagText] = useState('');
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoButtonText, setPromoButtonText] = useState('');
  
  const [savingPromo, setSavingPromo] = useState(false);

  // Sync promo form fields when data loads
  useEffect(() => {
    setPromoTagText(promo.tag_text);
    setPromoTitle(promo.title);
    setPromoDescription(promo.description);
    setPromoButtonText(promo.button_text);
    
  }, [promo]);

  // Appointment lookup for dynamic reminders
  const [appointmentLookup, setAppointmentLookup] = useState<Record<string, { date: string; time: string }>>({});

  // ── Impersonation state (must be checked before any profile fetch) ──
  const impersonation = useMemo(() => getImpersonation(), []);
  const isImpersonating = !!impersonation;

  const fetchProfileId = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, business_phone, instagram_url, facebook_url, waze_address, logo_url, full_name, studio_name, has_whatsapp_automation, created_at, subscription_status, subscription_tier')
      .eq('user_id', user.id)
      .maybeSingle() as { data: any; error: any };

    if (error) {
      console.error('Failed to fetch profile', error);
      return;
    }

    if (data) {
      setUserProfileId(data.id);
      setHasWhatsAppAutomation(!!data.has_whatsapp_automation);

      // When impersonating, ONLY set profile ID and WA automation (needed for DB queries)
      // Block all display-facing fields from being overwritten
      if (!isImpersonating) {
        setProfileCreatedAt(data.created_at || null);
        setSubscriptionStatus(data.subscription_status || 'trial');
        setSubscriptionTier(data.subscription_tier || 'lite');
        if (data.business_phone) { setArtistPhone(data.business_phone); localStorage.setItem('gp-artist-phone', data.business_phone); }
        if (data.instagram_url) setInstagramUrl(data.instagram_url);
        if (data.facebook_url) setFacebookUrl(data.facebook_url);
        if (data.waze_address) setWazeAddress(data.waze_address);
        const fetchedLogoUrl = data.logo_url || '';
        setSavedLogoUrl(fetchedLogoUrl);
        if (!hasUnsavedLogoChangeRef.current) {
          setLogoUrl(fetchedLogoUrl);
          if (fetchedLogoUrl) localStorage.setItem('gp-artist-logo', fetchedLogoUrl);
          else localStorage.removeItem('gp-artist-logo');
        }
        if (data.full_name) { setArtistName(data.full_name); localStorage.setItem('gp-artist-name', data.full_name); }
      }
    }
  }, [user, isImpersonating]);

  useEffect(() => { fetchProfileId(); }, [fetchProfileId]);

  // ── Apply impersonation overrides (runs once, locked) ──
  useEffect(() => {
    if (impersonation) {
      setArtistName(impersonation.userName);
      localStorage.setItem('gp-artist-name', impersonation.userName);
      setSubscriptionTier(impersonation.tier);
    }
  }, [impersonation]);

  // Fetch health declarations from DB for this artist's clients
  const fetchDbDeclarations = useCallback(async () => {
    if (!userProfileId) return;
    try {
      // Get all clients for this artist
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('artist_id', userProfileId);
      if (!clientsData || clientsData.length === 0) return;

      const clientIds = clientsData.map(c => c.id);
      const clientNameMap: Record<string, string> = {};
      clientsData.forEach(c => { clientNameMap[c.id] = c.full_name; });

      // Get declarations for these clients
      const { data: decls } = await supabase
        .from('health_declarations')
        .select('id, client_id, is_signed, form_data, signature_svg, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      if (decls && decls.length > 0) {
        const declMap: Record<string, DbHealthDeclaration> = {};
        decls.forEach(d => {
          const name = clientNameMap[d.client_id];
          if (name && !declMap[name]) {
            declMap[name] = { ...d, client_name: name };
          }
        });
        setDbDeclarations(declMap);
      }
    } catch (err) {
      console.error('Failed to fetch declarations:', err);
    }
  }, [userProfileId]);

  useEffect(() => { fetchDbDeclarations(); }, [fetchDbDeclarations]);

  // Use refs for toast/lang so the realtime channel doesn't re-subscribe on every lang/toast change
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Realtime subscription: auto-refresh when a new health declaration is inserted
  useEffect(() => {
    if (!userProfileId) return;
    const channel = supabase
      .channel('health-declarations-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'health_declarations' },
        (payload) => {
          console.log('New health declaration received:', payload);
          fetchDbDeclarations().then(() => {
            toastRef.current({
              title: langRef.current === 'en'
                ? '✨ New health declaration received!'
                : '✨ התקבלה הצהרת בריאות חדשה!',
            });
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userProfileId, fetchDbDeclarations]);

  const isMasterUser = userTier === 'master';

  // Super-admin: accessible via ?superadmin=1 in URL
  const isSuperAdmin = new URLSearchParams(window.location.search).get('superadmin') === '1';

  // Feature marketplace state — persisted in localStorage
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('gp-enabled-features');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });

  const marketplaceFeatures = [
    { id: 'language-pack', name: lang === 'en' ? 'Language Pack' : 'חבילת שפות', desc: lang === 'en' ? 'Auto-translate to Russian, English and Arabic' : 'תרגום אוטומטי לרוסית, אנגלית וערבית', icon: Globe, emoji: '🌍' },
    { id: 'before-after', name: lang === 'en' ? 'Before & After Generator' : 'מחולל לפני/אחרי', desc: lang === 'en' ? 'Create branded comparison photos for Instagram' : 'כלי ליצירת תמונות השוואה ממותגות לאינסטגרם', icon: Camera, emoji: '📸' },
    { id: 'review-bot', name: lang === 'en' ? 'Review Bot' : 'בוט ביקורות', desc: lang === 'en' ? 'Auto-send review request on day 30' : 'שליחת בקשת דירוג אוטומטית ללקוחה ביום ה-30', icon: Star, emoji: '⭐' },
    { id: 'auto-messages', name: lang === 'en' ? 'Message Automation' : 'אוטומציית הודעות', desc: lang === 'en' ? 'Send client link via WhatsApp automatically' : 'שליחת הקישור ללקוחה בוואטסאפ ללא מגע יד אדם', icon: Zap, emoji: '⚡' },
    { id: 'health-declaration', name: lang === 'en' ? 'Digital Health Declaration' : 'הצהרת בריאות דיגיטלית', desc: lang === 'en' ? 'Health declaration form with digital signature' : 'טופס הצהרת בריאות עם חתימה דיגיטלית', icon: ClipboardCheck, emoji: '📋' },
  ];

  const toggleFeature = (featureId: string) => {
    setEnabledFeatures(prev => {
      const updated = { ...prev, [featureId]: !prev[featureId] };
      localStorage.setItem('gp-enabled-features', JSON.stringify(updated));
      return updated;
    });
  };

  const stats = [
    { icon: Users, label: lang === 'en' ? 'Active Clients' : 'לקוחות פעילות', value: '24' },
    { icon: Clock, label: lang === 'en' ? 'Trial Days Left' : 'ימים לניסיון', value: String(trialDaysLeft) },
    { icon: MessageSquare, label: lang === 'en' ? 'Messages Saved' : 'הודעות שנחסכו', value: '312' },
  ];

  const treatmentOptions = TREATMENT_OPTIONS;

  const confirmDeleteClient = async () => {
    if (!deletingClient) return;
    const clientToDelete = { ...deletingClient };
    const deleteId = clientToDelete.dbId;
    const alsoDeleteAppointments = deleteAlsoAppointments;
    
    setDeletingClient(null);
    setDeleteAlsoAppointments(false);

    if (!deleteId) {
      // No DB record — just remove from local state
      setClients(prev => prev.filter(c => c.name !== clientToDelete.name));
      toast({ title: lang === 'en' ? 'Client removed' : 'הלקוחה הוסרה' });
      return;
    }
    
    try {
      // Delete from DB first
      const { error } = await supabase.from('clients').delete().eq('id', deleteId);
      if (error) throw error;

      // Only update UI after successful DB deletion
      setClients(prev => prev.filter(c => c.dbId !== deleteId));
      if (selectedClient?.dbId === deleteId) {
        setSelectedClient(null);
      }
      if (alsoDeleteAppointments) {
        setRemoveClientFromCalendar(clientToDelete.name);
      }

      toast({
        title: lang === 'en' ? 'Client deleted successfully' : 'הלקוחה נמחקה בהצלחה',
        duration: 6000,
        action: (
          <ToastAction
            altText={lang === 'en' ? 'Undo' : 'ביטול'}
            onClick={async () => {
              try {
                // Extract treatment_date from link params
                const linkUrl = new URL(clientToDelete.link, window.location.origin);
                const startParam = linkUrl.searchParams.get('start') || null;
                const { error } = await supabase.from('clients').insert({
                  id: deleteId,
                  artist_id: userProfileId!,
                  full_name: clientToDelete.name,
                  phone: clientToDelete.phone || null,
                  email: clientToDelete.email || null,
                  treatment_date: startParam,
                  treatment_type: clientToDelete.treatment || null,
                  birth_date: clientToDelete.birthDate || null,
                });
                if (error) throw error;
                fetchClients();
                toast({ title: lang === 'en' ? 'Deletion undone ✅' : 'המחיקה בוטלה ✅' });
              } catch (err) {
                console.error('Failed to undo delete:', err);
                toast({ title: lang === 'en' ? 'Failed to undo' : 'שחזור הלקוחה נכשל', variant: 'destructive' });
              }
            }}
            className="px-3 py-1.5 rounded-full text-xs font-serif font-semibold transition-all active:scale-95 shrink-0 hover:bg-transparent"
            style={{
              background: 'white',
              border: '2.5px solid #D4AF37',
              color: '#4a3636',
            }}
          >
            {lang === 'en' ? 'Undo' : 'ביטול'}
          </ToastAction>
        ),
      });

      // Refresh from DB to ensure clean state
      fetchClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast({ title: lang === 'en' ? 'Failed to delete client' : 'מחיקת הלקוחה נכשלה', variant: 'destructive' });
    }
  };

  // Build dynamic appointment reminder WhatsApp URL
  const buildReminderWhatsAppUrl = (clientName: string, clientPhone: string): string => {
    const appt = appointmentLookup[clientName];
    const cleanP = clientPhone ? formatPhone(clientPhone) : '';
    const studioLabel = artistName || (lang === 'en' ? 'Your Studio' : 'הסטודיו שלך');
    let text: string;
    if (appt) {
      const dateFormatted = new Date(appt.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
      text = `היי ${clientName}, תזכורת מהקליניקה של ${studioLabel} - קבענו לתאריך ${dateFormatted} בשעה ${appt.time}. מחכה לראותך! ✨`;
    } else {
      text = lang === 'en'
        ? `Hi ${clientName}, just a reminder about your upcoming appointment! ✨`
        : `היי ${clientName}, תזכורת מהקליניקה של ${studioLabel} - מחכה לראותך! ✨`;
    }
    return cleanP
      ? `https://wa.me/${cleanP}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const origin = window.location.origin;

  const [waSentLog, setWaSentLog] = useState<Record<string, string>>(() => loadSentLog());

  // Health declarations — fetched from DB
  interface DbHealthDeclaration {
    id: string;
    client_id: string;
    client_name: string;
    is_signed: boolean;
    form_data: any;
    signature_svg: string | null;
    created_at: string;
  }
  const [dbDeclarations, setDbDeclarations] = useState<Record<string, DbHealthDeclaration>>({});
  // Keep localStorage fallback for backward compat
  const [healthDeclarations, setHealthDeclarations] = useState<Record<string, HealthDeclarationData>>(() => {
    try { const raw = localStorage.getItem('gp-health-declarations'); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  });
  const [showDeclarationFor, setShowDeclarationFor] = useState<string | null>(null);
  const [viewDeclarationFor, setViewDeclarationFor] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureId, setUpgradeFeatureId] = useState('');
   // Edit client modal
  const [editingClient, setEditingClient] = useState<ClientEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editTreatment, setEditTreatment] = useState('');
  const [showFormPreview, setShowFormPreview] = useState(false);
  const [showDigitalCardPreview, setShowDigitalCardPreview] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  // Edit treatment note modal
  const [editingNote, setEditingNote] = useState<{ clientName: string; note: TreatmentNote } | null>(null);
  const [editNoteArea, setEditNoteArea] = useState('');
  const [editNotePigment, setEditNotePigment] = useState('');
  const [editNoteNeedle, setEditNoteNeedle] = useState('');
  const [editNoteClinical, setEditNoteClinical] = useState('');
  const [editNoteRaw, setEditNoteRaw] = useState('');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showHealthEditor, setShowHealthEditor] = useState(false);
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [showVoucherEditor, setShowVoucherEditor] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWelcomeTour, setShowWelcomeTour] = useState(false);
  const [showInvoiceComingSoon, setShowInvoiceComingSoon] = useState(false);
  const [deletingClient, setDeletingClient] = useState<ClientEntry | null>(null);
  const [deleteAlsoAppointments, setDeleteAlsoAppointments] = useState(false);
  const [removeClientFromCalendar, setRemoveClientFromCalendar] = useState<string | null>(null);
  const [clientListFilter, setClientListFilter] = useState<'all' | 'birthdays' | 'renewal'>('all');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientsPage, setClientsPage] = useState(0);
  const [hasMoreClients, setHasMoreClients] = useState(true);
  const [loadingMoreClients, setLoadingMoreClients] = useState(false);
  const CLIENTS_PAGE_SIZE = 20;
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [birthdayWishClient, setBirthdayWishClient] = useState<ClientEntry | null>(null);
  const [renewalClient, setRenewalClient] = useState<ClientEntry | null>(null);
  const [customTemplates, setCustomTemplates] = useState<{ birthday?: string; renewal?: string; review?: string; referral?: string; birthday_en?: string; renewal_en?: string; review_en?: string; referral_en?: string }>({});

  // Check if first-time user (no onboarding done)
  useEffect(() => {
    if (user && userProfileId && !localStorage.getItem('gp-onboarding-done')) {
      // Small delay to let dashboard render first
      const timer = setTimeout(() => setShowOnboarding(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, userProfileId]);

  // Show welcome tour after onboarding wizard is done (for first-time users)
  useEffect(() => {
    if (user && userProfileId && localStorage.getItem('gp-onboarding-done') && !localStorage.getItem('gp-welcome-tour-done')) {
      const timer = setTimeout(() => setShowWelcomeTour(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [user, userProfileId, showOnboarding]);

  // Dynamic health questions for risk calculation
  const { questions: healthQuestionsData } = useHealthQuestions();

  // Helper: get declaration data for a client (DB first, then localStorage fallback)
  const getDeclarationData = (name: string): HealthDeclarationData | null => {
    // Check DB declarations first
    const dbDecl = dbDeclarations[name];
    if (dbDecl?.form_data) return dbDecl.form_data as unknown as HealthDeclarationData;
    // Fallback to localStorage
    return healthDeclarations[name] || null;
  };

  // Check if a declaration EXISTS for this client (not just signed)
  const hasSignedDeclaration = (name: string): boolean => {
    const dbDecl = dbDeclarations[name];
    if (dbDecl) return true; // declaration exists in DB
    return !!healthDeclarations[name];
  };

  // Dynamic risk level using admin-configured question severity
  const getClientRiskLevel = (name: string): 'red' | 'yellow' | 'green' => {
    const dbDecl = dbDeclarations[name];
    if (!dbDecl?.form_data) return 'green';
    const answers: Record<string, boolean> = (dbDecl.form_data as any).answers || {};
    return calculateDynamicRiskLevel(answers, healthQuestionsData);
  };

  const clientHasRedFlags = (name: string): boolean => {
    return getClientRiskLevel(name) === 'red';
  };

  const clientIsSafe = (name: string): boolean => {
    return getClientRiskLevel(name) === 'green';
  };

  // Build clean client zone link — just /c/{clientId}
  const buildClientZoneLink = (clientId: string): string => {
    return `${window.location.origin}/c/${clientId}`;
  };

  // Build short health declaration link via form_links table
  const buildHealthShortLink = async (clientId: string, clientName: string, clientPhone?: string, includePolicy = true): Promise<string> => {
    if (!userProfileId) {
      return `${window.location.origin}/health-declaration?client_id=${clientId}`;
    }
    try {
      const { data, error } = await supabase.from('form_links').insert({
        artist_id: userProfileId,
        client_name: clientName,
        client_phone: clientPhone || null,
        logo_url: logoUrl || null,
        artist_phone: artistPhone ? formatPhone(artistPhone) : null,
        treatment_type: '',
        include_policy: includePolicy,
        client_id: clientId,
        artist_name: artistName || '',
      } as any).select('code').single();
      if (error) throw error;
      return `${window.location.origin}/f/${data.code}`;
    } catch (err) {
      console.error('Failed to create short link:', err);
      return `${window.location.origin}/health-declaration?client_id=${clientId}`;
    }
  };

  // Legacy wrapper for preview button (no client id)
  const buildHealthFormLink = (_clientName: string, _clientPhone?: string, includePolicy = true): string => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams();
    if (userProfileId) params.set('artist_id', userProfileId);
    params.set('name', _clientName);
    if (includePolicy) params.set('include_policy', 'true');
    return `${baseUrl}/health-declaration?${params.toString()}`;
  };

  // Open WhatsApp with health form signing request
  const sendHealthFormWhatsApp = async (clientName: string, clientPhone?: string, includePolicy = true, clientDbId?: string) => {
    if (!clientPhone || clientPhone.replace(/[^0-9]/g, '').length === 0) {
      toast({ title: lang === 'en' ? 'Cannot send — phone number missing for this client. Please update her details.' : 'לא ניתן לשלוח הודעה - חסר מספר טלפון ללקוחה זו. אנא עדכני את פרטיה.', variant: 'destructive' });
      return;
    }
    const artist = artistName || 'האמנית שלך';
    let link: string;
    if (clientDbId && userProfileId) {
      link = await buildHealthShortLink(clientDbId, clientName, clientPhone, includePolicy);
    } else {
      link = buildHealthFormLink(clientName, clientPhone, includePolicy);
    }
    const msg = generateWhatsAppMessage(clientName, link, includePolicy, artist);
    const url = buildWhatsAppUrl(clientPhone, msg);
    window.open(url, '_blank');
    toast({ title: 'הודעה נשלחה בהצלחה ✉️' });
  };

  // Approve medical exception — persist to DB
  const approveException = async (clientEntry: ClientEntry) => {
    if (clientEntry.dbId) {
      const { error } = await supabase
        .from('clients')
        .update({ medical_exception_approved: true } as any)
        .eq('id', clientEntry.dbId);
      if (error) {
        console.error('Failed to approve exception:', error);
        toast({ title: lang === 'en' ? 'Failed to approve' : 'שגיאה באישור ההחרגה', variant: 'destructive' });
        return;
      }
    }
    // Update local state so it disappears immediately
    setClients(prev => prev.map(c => c.dbId === clientEntry.dbId ? { ...c, medicalExceptionApproved: true } : c));
    toast({ title: lang === 'en' ? 'Exception approved ✅' : 'החרגה אושרה ✅' });
  };

  // Edit client
  const openEditClient = (client: ClientEntry) => {
    setEditingClient(client);
    setEditName(client.name);
    setEditPhone(client.phone);
    setEditEmail(client.email || '');
    setEditBirthDate(client.birthDate || '');
    setEditTreatment(client.treatment);
  };

  const saveEditClient = async () => {
    if (!editingClient || !editName.trim()) return;
    setSavingClient(true);
    try {
      // If client has a DB id, update in database
      if (editingClient.dbId) {
        const { error } = await supabase
          .from('clients')
          .update({
            full_name: editName.trim(),
            phone: editPhone.trim(),
            email: editEmail.trim() || null,
            birth_date: editBirthDate || null,
            treatment_type: editTreatment.trim(),
          })
          .eq('id', editingClient.dbId);
        if (error) throw error;
      }
      // Update local state
      setClients(prev => prev.map(c =>
        (c.dbId && c.dbId === editingClient.dbId) || c.name === editingClient.name
          ? { ...c, name: editName.trim(), phone: editPhone.trim(), email: editEmail.trim(), treatment: editTreatment.trim(), birthDate: editBirthDate || null }
          : c
      ));
      if (selectedClient?.name === editingClient.name || (selectedClient?.dbId && selectedClient.dbId === editingClient.dbId)) {
        setSelectedClient(prev => prev ? { ...prev, name: editName.trim(), phone: editPhone.trim(), treatment: editTreatment.trim() } : null);
      }
      // Refetch from DB to ensure consistency
      await fetchClients();
      setEditingClient(null);
      toast({ title: lang === 'en' ? 'Client saved successfully ✅' : 'הפרטים עודכנו בהצלחה ✅' });
    } catch (err) {
      console.error('Failed to save client:', err);
      toast({ title: lang === 'en' ? 'Failed to save client details' : 'שמירת פרטי הלקוחה נכשלה. אנא נסי שוב.', variant: 'destructive' });
    } finally {
      setSavingClient(false);
    }
  };

  // redFlagClients is computed after clients state declaration below

  const saveDeclaration = (clientName: string, data: HealthDeclarationData) => {
    const updated = { ...healthDeclarations, [clientName]: data };
    setHealthDeclarations(updated);
    localStorage.setItem('gp-health-declarations', JSON.stringify(updated));
    setShowDeclarationFor(null);
    toast({ title: lang === 'en' ? 'Health declaration saved! ✅' : 'הצהרת הבריאות נשמרה! ✅' });
    // Refresh DB declarations
    fetchDbDeclarations();
  };

  const [clients, setClients] = useState<ClientEntry[]>(() => {
    try {
      const saved = localStorage.getItem('pmu_clients');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { name: 'דנה אברהם', phone: '0501234567', day: 1, treatment: lang === 'en' ? 'Lip Blush' : 'שפתיים', link: `${origin}/c/demo1?name=${encodeURIComponent('Dana Avraham')}&treatment=lips&start=2026-02-14`, beforeImg: '', afterImg: '' },
      { name: 'מאיה לוי', phone: '0529876543', day: 5, treatment: lang === 'en' ? 'Brows' : 'גבות', link: `${origin}/c/demo2?name=${encodeURIComponent('Maya Levi')}&treatment=eyebrows&start=2026-02-10`, beforeImg: '', afterImg: '' },
      { name: 'נועה שפירא', phone: '0541112233', day: 28, treatment: lang === 'en' ? 'Brows' : 'גבות', link: `${origin}/c/demo3?name=${encodeURIComponent('Noa Shapira')}&treatment=eyebrows&start=2026-01-18`, beforeImg: '', afterImg: '' },
      { name: 'שירה כהן', phone: '0521234567', day: 365, treatment: lang === 'en' ? 'Brows' : 'גבות', link: `${origin}/c/demo4?name=${encodeURIComponent('Shira Cohen')}&treatment=eyebrows&start=2025-02-22`, beforeImg: '', afterImg: '' },
    ];
  });

  // Clients with active (non-approved) red flags
  const redFlagClients = clients.filter(c => clientHasRedFlags(c.name) && !c.medicalExceptionApproved);


  const sendSmartReminder = (client: ClientEntry) => {
    const clientDay = Number(client.day);
    if (!Number.isFinite(clientDay)) {
      toast({ title: lang === 'en' ? 'Please define text for this day in Push Management' : 'נא להגדיר טקסט ליום זה במסך ניהול פושים', variant: 'destructive' });
      return;
    }

    if (!hasMessageForDay(clientDay, client.treatment)) {
      toast({ title: lang === 'en' ? 'Please define text for this day in Push Management' : 'נא להגדיר טקסט ליום זה במסך ניהול פושים', variant: 'destructive' });
      return;
    }

    const msg = buildWhatsAppText(clientDay, client.name, artistName || 'האמנית שלך', client.treatment);
    if (!msg) return;

    const encoded = encodeURIComponent(msg);
    const cleanPhone = client.phone ? formatPhone(client.phone) : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.location.href = url;

    // Track send
    const aftercareMsg = getMessageForDay(clientDay, client.treatment);
    const key = `${client.name}-day${aftercareMsg?.day ?? clientDay}`;
    const now = new Date().toLocaleString('he-IL');
    const updated = { ...waSentLog, [key]: now };
    setWaSentLog(updated);
    saveSentLog(updated);
    toast({ title: lang === 'en' ? 'WhatsApp opened!' : 'וואטסאפ נפתח!' });
  };

  const getTreatmentLabel = (value: string) => getTreatmentLabelFn(value, lang);

  // Live preview link updates as user types
  const buildPreviewLink = () => {
    if (!clientName || !treatmentType) return '';
    try {
      const params = new URLSearchParams({ name: clientName, treatment: treatmentType, start: treatmentDate });
      if (beforeImg) params.set('before', beforeImg);
      if (afterImg) params.set('after', afterImg);
      if (logoUrl) params.set('logo', logoUrl);
      if (artistName) params.set('artist', artistName);
      if (artistPhone) params.set('phone', formatPhone(artistPhone));
      if (shopProducts.length > 0) params.set('shop', encodeShopForUrl(shopProducts));
      return `${origin}/c/new?${params.toString()}`;
    } catch { return ''; }
  };

  // Update live preview whenever inputs change
  const currentPreview = buildPreviewLink();

  const handleGenerateLink = () => {
    setFormError('');
    try {
      if (!clientName || !treatmentType) {
        setFormError(lang === 'en' ? 'Please fill in name and treatment type' : 'אנא מלאי שם וסוג טיפול');
        return;
      }
      const link = currentPreview;
      if (!link) {
        setFormError(lang === 'en' ? 'Failed to generate link' : 'שגיאה ביצירת הקישור');
        return;
      }
      setGeneratedLink(link);
      setGeneratedClientName(clientName);
      setGeneratedClientPhone(clientPhone);
      setClients((prev) => [
        { name: clientName, phone: clientPhone, day: 0, treatment: getTreatmentLabel(treatmentType), link, beforeImg, afterImg },
        ...prev,
      ]);
      // Persist to DB
      if (userProfileId) {
        supabase.from('clients').insert({
          artist_id: userProfileId,
          full_name: clientName,
          phone: clientPhone || null,
          treatment_type: getTreatmentLabel(treatmentType),
          treatment_date: treatmentDate,
        }).then(({ error }) => {
          if (!error) fetchClients();
          else console.error('Failed to save client:', error);
        });
      }

      setModalOpen(false);
      setSuccessModalOpen(true);
      setCopied(false);
      setFormError('');
      setClientName('');
      setClientPhone('');
      setTreatmentType('');
      setTreatmentDate(new Date().toISOString().split('T')[0]);
      setBeforeImg('');
      setAfterImg('');
    } catch (e) {
      console.error('Error generating link:', e);
      setFormError(lang === 'en' ? 'Failed to generate link. Please check details.' : 'שגיאה ביצירת הקישור. אנא בדקי את הפרטים.');
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({
      title: lang === 'en' ? 'Link copied!' : 'הקישור הועתק!',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyClientLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({
      title: lang === 'en' ? 'Link copied!' : 'הקישור הועתק!',
    });
  };

  const openWhatsApp = (phone: string, name: string, link: string) => {
    if (!link) {
      alert(lang === 'en' ? 'Please generate the link first' : 'אנא צרי את הקישור תחילה');
      return;
    }
    try {
      const msgName = name || (lang === 'en' ? 'there' : 'מותק');
      const message = `היי ${msgName}! ✨ האפליקציה האישית שלך להחלמה מושלמת מוכנה. הנה הקישור שלך:\n\n${link} ✍️`;
      const encoded = encodeURIComponent(message);
      if (phone && phone.trim()) {
        const cleanPhone = formatPhone(phone);
        window.location.href = `https://wa.me/${cleanPhone}?text=${encoded}`;
      } else {
        window.location.href = `https://wa.me/?text=${encoded}`;
      }
    } catch (e) {
      console.error('Error opening WhatsApp:', e);
      alert(lang === 'en' ? 'Failed to open WhatsApp. Try copying the link.' : 'שגיאה בפתיחת וואטסאפ. נסי להעתיק את הקישור.');
    }
  };

  // Fetch real clients from DB with pagination
  const fetchClients = useCallback(async (page = 0, append = false) => {
    if (!userProfileId) return;
    try {
      const from = page * CLIENTS_PAGE_SIZE;
      const to = from + CLIENTS_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from('clients')
        .select('id, full_name, phone, email, treatment_type, treatment_date, created_at, push_opted_in, birth_date, medical_exception_approved', { count: 'exact' })
        .eq('artist_id', userProfileId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      if (data) {
        const dbClients: ClientEntry[] = data.map(c => {
          const treatmentDate = c.treatment_date ? new Date(c.treatment_date) : new Date(c.created_at);
          const daysSince = Math.max(0, Math.floor((Date.now() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            dbId: c.id,
            name: c.full_name,
            phone: c.phone || '',
            email: c.email || '',
            day: daysSince,
            treatment: c.treatment_type || '',
            link: `${origin}/c/${encodeURIComponent(c.id)}?name=${encodeURIComponent(c.full_name)}&treatment=${encodeURIComponent(c.treatment_type || '')}&start=${c.treatment_date || new Date(c.created_at).toISOString().split('T')[0]}&artist_id=${encodeURIComponent(userProfileId)}`,
            beforeImg: '',
            afterImg: '',
            pushOptedIn: c.push_opted_in || false,
            birthDate: c.birth_date || null,
            medicalExceptionApproved: (c as any).medical_exception_approved || false,
          };
        });
        const totalCount = count ?? 0;
        setHasMoreClients(from + data.length < totalCount);
        if (append) {
          setClients(prev => {
            const existingIds = new Set(prev.map(c => c.dbId));
            const newOnly = dbClients.filter(c => !existingIds.has(c.dbId));
            return [...prev, ...newOnly];
          });
        } else {
          setClients(prev => {
            const dbIds = new Set(dbClients.map(c => c.dbId));
            const dbNames = new Set(dbClients.map(c => c.name));
            const localOnly = prev.filter(c => !c.dbId && !dbNames.has(c.name));
            return [...dbClients, ...localOnly];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch clients from DB:', err);
    }
  }, [userProfileId]);

  const loadMoreClients = useCallback(async () => {
    if (loadingMoreClients || !hasMoreClients) return;
    setLoadingMoreClients(true);
    const nextPage = clientsPage + 1;
    await fetchClients(nextPage, true);
    setClientsPage(nextPage);
    setLoadingMoreClients(false);
  }, [loadingMoreClients, hasMoreClients, clientsPage, fetchClients]);

  useEffect(() => {
    setClientsPage(0);
    setHasMoreClients(true);
    fetchClients(0, false);
  }, [fetchClients]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreClients();
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMoreClients]);

  // Fetch appointments for dynamic reminder messages
  const fetchAppointments = useCallback(async () => {
    if (!userProfileId) return;
    try {
      const { data } = await supabase
        .from('appointments')
        .select('client_name, date, time')
        .eq('artist_id', userProfileId)
        .eq('status', 'scheduled')
        .order('date', { ascending: true });
      if (data && data.length > 0) {
        const lookup: Record<string, { date: string; time: string }> = {};
        data.forEach(a => {
          // Keep the nearest future appointment per client
          if (!lookup[a.client_name]) {
            lookup[a.client_name] = { date: a.date, time: a.time };
          }
        });
        setAppointmentLookup(lookup);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    }
  }, [userProfileId]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Persist clients to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem('pmu_clients', JSON.stringify(clients)); } catch {}
  }, [clients]);

  // Restore selected client from URL params after clients are loaded
  useEffect(() => {
    if (!selectedClientParam || selectedClient) return;
    const match = clients.find(c => c.dbId === selectedClientParam || c.name === selectedClientParam);
    if (match) {
      setSelectedClientInternal(match);
      setActiveTabInternal('clients');
    }
  }, [selectedClientParam, clients, selectedClient]);

  const displayName = artistName || (lang === 'en' ? 'My Studio' : 'הסטודיו שלי');
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (lang === 'en') {
      if (hour < 12) return 'Good Morning';
      if (hour < 18) return 'Good Afternoon';
      return 'Good Evening';
    }
    if (hour < 12) return 'בוקר טוב';
    if (hour < 18) return 'צהריים טובים';
    return 'ערב טוב';
  };

  const quickActions = [
    { icon: Plus, label: lang === 'en' ? 'New Client' : 'לקוחה חדשה', onClick: () => { setDispatchPrefill(null); setDispatchOpen(true); } },
    { icon: Calendar, label: lang === 'en' ? 'Calendar' : 'יומן', onClick: () => setActiveTab('calendar') },
    { icon: CreditCard, label: lang === 'en' ? 'My Digital Card' : 'הכרטיס הדיגיטלי שלי', onClick: () => setShowDigitalCardPreview(true) },
  ];

  // Scroll to top when selecting a client — use anchor + setTimeout for reliable scroll
  useEffect(() => {
    if (selectedClient) {
      // Immediate attempt
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      // Delayed anchor scroll to handle late renders
      const timer = setTimeout(() => {
        const anchor = document.getElementById('client-top-anchor');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [selectedClient]);

  // Sub-screen state for back button
  const [subScreen, setSubScreen] = useState<string | null>(null);
  const [healingJourneyClient, setHealingJourneyClient] = useState<ClientEntry | null>(null);

  const tabTitles: Record<string, string> = {
    home: lang === 'en' ? 'Dashboard' : 'דאשבורד',
    calendar: lang === 'en' ? 'Calendar' : 'יומן',
    clients: lang === 'en' ? 'Clients' : 'לקוחות',
    healing: lang === 'en' ? 'Healing Journey' : 'תהליך החלמה',
    bonuses: lang === 'en' ? 'Bonuses' : 'בונוסים',
    messages: lang === 'en' ? 'Messages' : 'הודעות',
    'digital-card': lang === 'en' ? 'Digital Card' : 'כרטיס דיגיטלי',
    profile: lang === 'en' ? 'Settings' : 'הגדרות',
  };

  const currentTitle = subScreen || tabTitles[activeTab] || '';

  return (
    <div className="min-h-screen flex flex-col relative artist-dashboard" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #FDF5F3 15%, #F8E0E4 40%, #F0C8CE 65%, #E8B8C0 85%, #E0A8B2 100%)', animation: 'bg-fade-to-pink 1.2s ease-out forwards' }}>
      {/* Subtle diagonal line texture */}
      <div className="fixed inset-0 z-0 pointer-events-none" style={{
        backgroundImage: `repeating-linear-gradient(135deg, transparent, transparent 80px, rgba(212,175,55,0.03) 80px, rgba(212,175,55,0.03) 81px)`,
      }} />
      {/* Subtle brand watermark */}
      <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
        <img src={defaultLogo} alt="" className="w-[400px] opacity-[0.03]" />
      </div>
      {/* ===== FIXED TOP HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg" style={{ background: 'linear-gradient(180deg, hsla(350, 35%, 92%, 0.95) 0%, hsla(350, 40%, 90%, 0.98) 100%)', borderBottom: '1.5px solid hsl(38 40% 82%)' }}>
        <div className="relative w-full h-16 px-5">

          {/* Left side buttons (add, preview, back) */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2.5 z-20">
          {(subScreen || selectedClient || activeTab !== 'home') ? (
              <BackButton
                onClick={() => {
                  if (selectedClient) { setSelectedClient(null); }
                  else if (subScreen === 'Referrals' || subScreen === 'הפניות') { setSubScreen(null); setActiveTab('home'); }
                  else if (subScreen) { setSubScreen(null); }
                  else { setActiveTab('home'); }
                }}
              />
            ) : (
              <>
                <button
                  onClick={() => { setDispatchPrefill(null); setDispatchOpen(true); }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,235,240,0.9), rgba(255,225,232,0.85))',
                  }}
                >
                  <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                    border: '1.5px solid transparent',
                    background: 'transparent padding-box, linear-gradient(135deg, #D4AF37 0%, #E8D5A0 50%, #D4AF37 100%) border-box',
                    borderRadius: 'inherit',
                  }} />
                  <Plus className="w-5 h-5 relative z-10" strokeWidth={2} style={{ color: '#B8860B' }} />
                </button>
                <button
                  onClick={() => setClientPreviewOpen(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,235,240,0.9), rgba(255,225,232,0.85))',
                  }}
                  title={lang === 'en' ? 'Preview Client Page' : 'צפייה בדף לקוחה'}
                >
                  <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                    border: '1.5px solid transparent',
                    background: 'transparent padding-box, linear-gradient(135deg, #D4AF37 0%, #E8D5A0 50%, #D4AF37 100%) border-box',
                    borderRadius: 'inherit',
                  }} />
                  <Eye className="w-4.5 h-4.5 relative z-10" style={{ color: '#B8860B' }} strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>

          {/* Center: Logo — absolute, perfectly centered */}
          <img
            src={defaultLogo}
            alt="Glow Push"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70px] w-[220px] max-w-[40vw] object-contain bg-transparent z-10 drop-shadow-[0_1px_4px_rgba(212,175,55,0.25)]"
            onError={(e) => { (e.target as HTMLImageElement).src = defaultLogo; }}
          />

          {/* Right side: Settings button — styled like bottom nav */}
          {!(subScreen || selectedClient) && (
            <button
              onClick={() => setActiveTab('profile')}
              className="absolute right-[60px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 z-20 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255,235,240,0.9), rgba(255,225,232,0.85))',
              }}
            >
              <div className="absolute inset-0 rounded-full pointer-events-none" style={{
                border: '1.5px solid transparent',
                background: 'transparent padding-box, linear-gradient(135deg, #D4AF37 0%, #E8D5A0 50%, #D4AF37 100%) border-box',
                borderRadius: 'inherit',
              }} />
              <Settings className="w-4.5 h-4.5 relative z-10" strokeWidth={1.5} style={{ color: '#B8860B' }} />
            </button>
          )}

          {/* Language toggle — FIXED right edge, never moves */}
          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold tracking-wide backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg z-30"
            style={{
              background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
              color: '#4a3636',
              boxShadow: '0 3px 14px rgba(212,175,55,0.45)',
            }}
          >
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
      </header>

      {/* ===== SCROLLABLE CONTENT ===== */}
      <div id="main-scroll-container" ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-14 pb-[56px]" style={{ background: 'transparent' }}>
        <div className="container mx-auto px-5 max-w-lg py-2">

        {/* ===== TRIAL COUNTDOWN BANNER ===== */}
        {trialActive && !isPaidUser && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 flex items-center gap-3 animate-fade-up"
            style={{
              background: 'linear-gradient(135deg, hsl(38 55% 95%), hsl(40 50% 90%))',
              border: '1.5px solid hsl(38 50% 75%)',
              boxShadow: '0 2px 12px hsl(38 55% 62% / 0.12)',
            }}
          >
            <Crown className="w-5 h-5 shrink-0" style={{ color: '#B8860B' }} />
            <p className="text-sm font-medium flex-1" style={{ color: '#4a3636' }}>
              {lang === 'en'
                ? `${trialDaysLeft} days left in your free trial ✨`
                : `נשארו לך עוד ${trialDaysLeft} ימים להתנסות בחינם ב-Glow Push ✨`}
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0 transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #B8860B, #D4AF37)',
                color: '#fff',
              }}
            >
              {lang === 'en' ? 'Upgrade' : 'שדרוג'}
            </button>
          </div>
        )}
        {/* ===== GALLERY SUB-SCREEN ===== */}
        {subScreen && (subScreen === 'Gallery' || subScreen === 'גלריה') && (
          <div className="space-y-4">
            <SimpleGallery />
          </div>
        )}

        {/* ===== WALLET SUB-SCREEN ===== */}
        {subScreen === 'wallet' && (
          <div className="space-y-4">
            <BonusCenter
              userProfileId={userProfileId}
              onNavigateToReferrals={() => { setSubScreen(lang === 'en' ? 'Referrals' : 'הפניות'); }}
            />
          </div>
        )}

        {/* ===== HOME TAB ===== */}
        {activeTab === 'home' && !subScreen && (
          <div className="space-y-9" style={{ margin: '-0.5rem -1.25rem', padding: '0 1.25rem 5.25rem' }}>

            {/* ═══ 1. HEADER / GREETING ═══ */}
            <div
              className="rounded-b-3xl px-5 pt-8 pb-6 -mx-5"
              style={{
                background: 'linear-gradient(180deg, rgba(234,195,191,0.6) 0%, transparent 100%)',
              }}
            >
              <h1 className="text-2xl font-bold tracking-wide mb-1" style={{ color: '#3D3D3D' }}>
                {(() => {
                  const hour = new Date().getHours();
                  const firstName = artistName ? artistName.split(' ')[0] : '';
                  if (lang === 'en') return firstName ? `Hi ${firstName} 👋` : (hour < 12 ? 'Good Morning! ✨' : hour < 17 ? 'Good Afternoon! ✨' : 'Good Evening! ✨');
                  if (firstName) return `היי ${firstName} 👋`;
                  return hour < 12 ? 'בוקר טוב! ✨' : hour < 17 ? 'צהריים טובים! ✨' : 'ערב טוב! ✨';
                })()}
              </h1>
              <p className="text-sm" style={{ color: '#555' }}>
                {lang === 'en' ? "Here's your business overview" : 'הנה הסקירה העסקית שלך'}
              </p>

              {clients.length > 0 && !dismissedTouchup && (
                <div
                  className="relative mt-4 rounded-[2rem] animate-fade-up overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,235,240,0.92) 0%, rgba(255,228,234,0.88) 50%, rgba(255,220,230,0.85) 100%)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 16px 40px rgba(160,100,80,0.2), 0 8px 20px rgba(180,120,90,0.14), 0 4px 10px rgba(212,175,55,0.1)',
                    padding: '1.25rem 1.5rem',
                  }}
                >
                  <div className="absolute inset-0 rounded-[2rem] pointer-events-none" style={{
                    border: '2px solid transparent',
                    background: 'transparent padding-box, linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%) border-box',
                    borderRadius: 'inherit',
                  }} />
                  <button
                    onClick={() => { localStorage.setItem('gp-dismiss-touchup', '1'); setDismissedTouchup(true); }}
                    className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-white/60 hover:bg-white/80 transition-colors z-10"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <p className="text-sm font-bold leading-relaxed text-center relative z-10" style={{ color: '#4a3636' }}>
                    {lang === 'en'
                      ? `🔥 Amazing week! You onboarded ${clients.length} new clients. Keep it up!`
                      : `🔥 שבוע מטורף! הכנסת ${clients.length} לקוחות חדשות השבוע. המשיכי כך!`}
                  </p>
                </div>
              )}
            </div>

            {/* ── Onboarding Checklist ── */}
            <OnboardingChecklist
              logoUrl={logoUrl}
              clients={clients}
              subscriptionTier={subscriptionTier}
              onOpenDigitalCard={() => setShowDigitalCardPreview(true)}
              onOpenAddClient={() => { setDispatchPrefill(null); setDispatchOpen(true); }}
              onOpenTemplateEditor={() => setShowTemplateEditor(true)}
              userProfileId={userProfileId}
            />

            {/* ═══ 2. STATS / INCOME ROW ═══ */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: lang === 'en' ? 'Revenue' : 'הכנסות', value: '₪0', trend: '', icon: DollarSign, comingSoon: true },
                { label: lang === 'en' ? 'New Clients' : 'לקוחות חדשות', value: String(clients.length), trend: '+3', icon: Users },
                { label: lang === 'en' ? 'Today' : 'היום', value: String(clients.filter(c => c.day === 0 || c.day === 1).length), trend: '', icon: CalendarCheck },
              ].map((metric, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-4 text-center animate-fade-up relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,235,240,0.92) 0%, rgba(255,228,234,0.88) 50%, rgba(255,220,230,0.85) 100%)',
                    boxShadow: '0 16px 40px rgba(160,100,80,0.22), 0 8px 20px rgba(180,120,90,0.15), 0 4px 10px rgba(212,175,55,0.1), 0 1px 3px rgba(0,0,0,0.06)',
                    animationDelay: `${i * 0.08}s`,
                    opacity: 0,
                  }}
                >
                  <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                    border: '2px solid transparent',
                    background: 'transparent padding-box, linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%) border-box',
                    borderRadius: 'inherit',
                  }} />
                  {'comingSoon' in metric && metric.comingSoon && (
                    <span className="absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wide" style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728)', color: '#4a2020' }}>
                      {lang === 'en' ? 'Coming Soon' : 'בקרוב'}
                    </span>
                  )}
                  <metric.icon className="w-5 h-5 mx-auto mb-2 relative z-10" style={{ color: '#B8860B' }} strokeWidth={1.5} />
                  <p className="text-xl font-extrabold mb-1 relative z-10" style={{ color: '#4a3636' }}>{metric.value}</p>
                  <p className="text-[10px] font-medium relative z-10" style={{ color: '#6b5a5a' }}>{metric.label}</p>
                  {metric.trend && (
                    <p className="text-[10px] font-bold mt-1 relative z-10" style={{ color: '#22c55e' }}>
                      ↑ {metric.trend} {lang === 'en' ? 'vs last month' : 'מחודש שעבר'}
                    </p>
                  )}
                </div>
              ))}
            </div>


            <div className="animate-fade-up flex justify-center" style={{ animationDelay: '0.1s', opacity: 0 }}>
              <button
                onClick={() => setActiveTab('bonuses')}
                className="special-promo-btn w-[90%] max-w-[420px] min-h-[80px] flex items-center justify-center relative overflow-hidden active:scale-95"
                style={{
                  background: 'linear-gradient(145deg, #E8A0B0 0%, #D4838F 100%)',
                  borderRadius: '50px',
                  border: 'none',
                  boxShadow: '0 12px 36px rgba(212, 131, 143, 0.4), 0 20px 50px rgba(180, 110, 110, 0.2), 0 0 20px rgba(232, 160, 176, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 18px 48px rgba(212, 131, 143, 0.5), 0 28px 60px rgba(180, 110, 110, 0.25), 0 0 30px rgba(232, 160, 176, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(212, 131, 143, 0.4), 0 20px 50px rgba(180, 110, 110, 0.2), 0 0 20px rgba(232, 160, 176, 0.3)'; }}
              >
                <div className="absolute inset-0 pointer-events-none z-[1]" style={{
                  background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                  transform: 'skewX(-25deg)',
                  animation: 'premiumShine 5s infinite',
                  width: '50%',
                  left: '-100%',
                }} />
                <div className="text-center z-[2] relative px-6" dir="rtl">
                  <span className="block font-extrabold text-sm leading-snug" style={{ color: '#fff' }}>
                    {lang === 'en' ? 'A Good Friend is Worth Gold (& Rose-Gold) | Get ₪50 Gift!' : 'חברה טובה שווה זהב (ורוז-גולד) | קבלי ₪50 מתנה!'}
                  </span>
                </div>
              </button>
            </div>

            {/* ═══ 4. DAILY GROWTH ENGINE ═══ */}
            <FeatureGate featureKey={FK.DAILY_GROWTH_ENGINE} mode="badge">
              <div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowTemplateEditor(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] border"
                    style={{
                      background: 'hsl(0 0% 100%)',
                      borderColor: 'hsl(38 55% 58%)',
                      color: 'hsl(36 50% 42%)',
                      boxShadow: '0 10px 28px rgba(160,100,80,0.16), 0 4px 12px rgba(180,120,90,0.1), 0 2px 6px rgba(212,175,55,0.08)',
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Edit Growth Engine' : 'עריכת מנוע צמיחה יומי'}
                  </button>
                </div>

                <DailyGrowthEngine
                  clients={clients}
                  artistName={artistName}
                  lang={lang as 'en' | 'he'}
                  onBirthdayClick={(client) => setBirthdayWishClient(client)}
                  onRenewalClick={(client) => setRenewalClient(client)}
                  reviewTemplate={customTemplates.review}
                  reviewTemplateEn={customTemplates.review_en}
                />
              </div>
            </FeatureGate>

            {/* ── Today's Appointments ── */}
            {(() => {
              const todayClients = clients.filter(c => c.day === 0 || c.day === 1);
              if (todayClients.length === 0) return null;
              return (
                <div className="animate-fade-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
                  <h3 className="text-xl font-bold mb-4 block" style={{ fontFamily: "'FB Ahava', 'Assistant', sans-serif", color: 'hsl(14 29% 30%)' }}>
                    {lang === 'en' ? 'Your Appointments Today' : 'התורים שלך היום'}
                  </h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                    {todayClients.map((client, i) => {
                      const signed = hasSignedDeclaration(client.name);
                      return (
                        <div
                          key={i}
                          className="flex-shrink-0 w-36 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:shadow-md cursor-pointer active:scale-95"
                          style={{
                            background: '#FFFFFF',
                            border: '2px solid',
                            borderImage: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B) 1',
                            boxShadow: '0 4px 16px rgba(212,175,55,0.12), 0 2px 8px rgba(0,0,0,0.05)',
                            borderRadius: '1rem',
                          }}
                          onClick={() => { setSelectedClient(client); setActiveTab('clients'); }}
                        >
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
                            style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636' }}
                          >
                            {client.name.charAt(0)}
                          </div>
                          <p className="text-xs font-semibold text-foreground truncate w-full text-center">{client.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate w-full text-center">{client.treatment}</p>
                          {signed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: 'hsl(142 76% 36%)' }}>
                              <CheckCircle className="w-3 h-3" /> {lang === 'en' ? 'Signed' : 'חתום'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ═══ 5. ACTIVE HEALING TRACKING ═══ */}
            <div className="animate-fade-up" style={{ animationDelay: '0.35s', opacity: 0 }}>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "'FB Ahava', 'Assistant', sans-serif", color: 'hsl(14 29% 30%)' }}>
                {lang === 'en' ? 'Active Healing Tracking' : 'מעקב החלמה פעיל'}
                <HelpTooltip id="active-recovery" text="כאן תראי את הלקוחות בשלבי ההחלמה. המערכת תציג כפתור וואטסאפ באופן אוטומטי בימים בהם נדרש ליצור קשר לפי הפרוטוקול." />
              </h3>
              {(() => {
                const healingClients = clients.filter(c => c.day >= 1 && c.day <= 30);
                if (healingClients.length === 0) {
                  return (
                    <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid hsl(var(--gold) / 0.15)' }}>
                      <p className="text-sm text-muted-foreground">
                        {lang === 'en' ? 'No active healing processes' : 'אין תהליכי החלמה פעילים'}
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
                    {healingClients.map((client, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-32 flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:shadow-md"
                        style={{
                          background: '#FFFFFF',
                          border: '2px solid',
                          borderImage: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B) 1',
                          boxShadow: '0 4px 16px rgba(212,175,55,0.12), 0 2px 8px rgba(0,0,0,0.05)',
                          borderRadius: '1rem',
                        }}
                      >
                        <button
                          onClick={() => { setSelectedClient(client); setActiveTab('clients'); }}
                          className="flex flex-col items-center gap-2 w-full active:scale-95"
                        >
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
                            style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636' }}
                          >
                            {client.name.charAt(0)}
                          </div>
                          <p className="text-xs font-semibold truncate w-full text-center" style={{ color: '#3D3D3D' }}>{client.name}</p>
                          <span className="text-[11px] font-bold" style={{ color: 'hsl(38 40% 45%)' }}>
                            {lang === 'en' ? `Day ${client.day}` : `יום ${client.day}`}
                          </span>
                        </button>
                        <HealingNotificationBadge
                          clientName={client.name}
                          day={client.day}
                          hasAutomation={hasWhatsAppAutomation}
                          hasTemplate={hasMessageForDay(client.day, client.treatment)}
                          previewText={buildWhatsAppText(client.day, client.name, artistName, client.treatment)}
                          onManualSend={() => sendSmartReminder(client)}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Red flag clients */}
            {redFlagClients.length > 0 && (
              <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 animate-fade-up">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  <h3 className="text-sm font-bold text-destructive">
                    {lang === 'en' ? `⚠️ ${redFlagClients.length} Client${redFlagClients.length > 1 ? 's' : ''} Require Attention` : `⚠️ ${redFlagClients.length} לקוחות דורשות תשומת לב`}
                  </h3>
                </div>
                <div className="space-y-2">
                  {redFlagClients.map((c, i) => {
                    const risk = getClientRiskLevel(c.name);
                    const flags = risk === 'red' ? [lang === 'en' ? 'Medical Warning' : 'התוויית נגד רפואית'] : risk === 'yellow' ? [lang === 'en' ? 'Requires Attention' : 'דורש תשומת לב'] : [];
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 cursor-pointer hover:bg-destructive/10 transition-colors"
                        onClick={() => { setSelectedClient(c); setActiveTab('clients'); }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
                          <span className="text-xs font-semibold text-destructive truncate">{c.name}</span>
                          <span className="text-[10px] text-destructive/70 truncate">{flags.join(', ')}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); approveException(c); }}
                          className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
                        >
                          {lang === 'en' ? 'Approve' : 'אישור החרגה'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ 6. MANAGEMENT BUTTONS GROUP ═══ */}
            <div className="space-y-5 pt-6">
              <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'FB Ahava', 'Assistant', sans-serif", color: 'hsl(14 29% 30%)' }}>
                {lang === 'en' ? 'Management' : 'ניהול'}
              </h3>

              <FeatureGate featureKey={FK.DIGITAL_CARD} mode="badge">
                <div className="relative">
                  <button onClick={() => setShowDigitalCardPreview(true)} className="pill-action-btn animate-fade-up">
                    <span className="pill-icon-circle"><CreditCard className="w-5 h-5" style={{ color: '#B8860B' }} strokeWidth={1.5} /></span>
                    <span className="flex-1 text-right pr-3">{lang === 'en' ? 'My Digital Card' : 'הכרטיס הדיגיטלי שלי'}</span>
                  </button>
                  <span className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                    <HelpTooltip id="digital-card" text={lang === 'en' ? 'Your luxury digital business card — share it with clients via WhatsApp or social media in one tap.' : 'כרטיס ביקור דיגיטלי יוקרתי — שתפי אותו עם לקוחות בוואטסאפ או ברשתות בלחיצה אחת.'} />
                  </span>
                </div>
              </FeatureGate>

              <FeatureGate featureKey={FK.HEALING_TIMELINE} mode="badge">
              <div className="relative">
                <button onClick={() => navigate('/admin/timeline-settings')} className="pill-action-btn animate-fade-up">
                  <span className="pill-icon-circle"><Pencil className="w-5 h-5" style={{ color: '#B8860B' }} strokeWidth={1.5} /></span>
                  <span className="flex-1 text-right pr-3">{lang === 'en' ? 'Edit Healing Journey' : 'עריכת מסע ההחלמה'}</span>
                </button>
                <span className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                  <HelpTooltip id="healing-journey" text={lang === 'en' ? 'Customize the 30-day healing timeline — edit daily care instructions, tips, and notifications for your clients.' : 'התאימי את ציר הזמן של 30 ימי ההחלמה — ערכי הוראות טיפול, טיפים והתראות לכל יום.'} />
                </span>
              </div>
              </FeatureGate>

              <FeatureGate featureKey={FK.HEALTH_DECLARATION} mode="badge">
                <div className="relative">
                  <button onClick={() => setShowHealthEditor(true)} className="pill-action-btn animate-fade-up">
                    <span className="pill-icon-circle"><ClipboardCheck className="w-5 h-5" style={{ color: '#B8860B' }} strokeWidth={1.5} /></span>
                    <span className="flex-1 text-right pr-3">{lang === 'en' ? 'Edit Health Declaration' : 'עריכת הצהרת בריאות'}</span>
                  </button>
                  <span className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                    <HelpTooltip id="health-declaration" text={lang === 'en' ? 'Manage the health declaration questions sent to clients — add, edit, delete with undo, or restore defaults.' : 'ניהול שאלות הצהרת הבריאות — הוסיפי, ערכי, מחקי עם ביטול, או שחזרי ברירת מחדל.'} />
                  </span>
                </div>
              </FeatureGate>


              <button
                  type="button"
                  onClick={() => { const url = new URL(buildHealthFormLink('לקוחה לדוגמה')); navigate(url.pathname + url.search + '&preview=true'); }}
                  className="pill-action-btn preview-pill-btn animate-fade-up"
                  style={{ height: '56px' }}
                >
                  <span className="pill-icon-circle preview-pill-icon" style={{ width: '40px', height: '40px' }}>
                    <Eye className="w-4 h-4" style={{ color: '#FFFFFF' }} strokeWidth={1.5} />
                  </span>
                <span className="flex-1 text-right pr-3 text-sm">{lang === 'en' ? 'Preview Template' : 'תצוגה מקדימה'}</span>
                </button>

              <FeatureGate featureKey={FK.REFERRALS} mode="badge">
              <div className="relative">
                <button onClick={() => setShowVoucherEditor(true)} className="pill-action-btn animate-fade-up">
                  <span className="pill-icon-circle"><Gift className="w-5 h-5" style={{ color: '#B8860B' }} strokeWidth={1.5} /></span>
                  <span className="flex-1 text-right pr-3">{lang === 'en' ? 'Edit Referral Voucher' : 'עריכת שובר חברות'}</span>
                </button>
                <span className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                  <HelpTooltip id="referral-voucher" text={lang === 'en' ? 'Customize the referral voucher text and WhatsApp message your clients see and share.' : 'התאימי את טקסט שובר ההפניה והודעת הוואטסאפ שהלקוחות שלך רואות ומשתפות.'} />
                </span>
              </div>
              </FeatureGate>
            </div>

          </div>
        )}

        {/* ===== CLIENTS TAB ===== */}
        {activeTab === 'clients' && (
          <div className="bg-background" style={{ margin: '-0.5rem -1.25rem', padding: '0.5rem 1.25rem', minHeight: 'calc(100vh - 7rem)', borderRadius: '0' }}>

            {/* ── Client Profile View (full screen, hides list) ── */}
            {selectedClient ? (
              <div className="animate-fade-up space-y-5">
                <div id="client-top-anchor" aria-hidden="true" style={{ height: 0, overflow: 'hidden' }} />

                {/* 1. VIP Client Header — Avatar + Name + Badge */}
                <div className="text-center pt-2 pb-1">
                  {/* Rose-gold gradient Avatar */}
                  <div
                    className="mx-auto w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4"
                    style={{
                      background: 'linear-gradient(135deg, #d8b4b4 0%, #c9a0a0 50%, #d8b4b4 100%)',
                      boxShadow: '0 6px 24px rgba(216, 180, 180, 0.45)',
                    }}
                  >
                    {selectedClient.name.charAt(0)}
                  </div>
                  <h1 className="font-serif font-bold text-2xl tracking-wide" style={{ color: '#4a3636' }}>
                    {selectedClient.name}
                  </h1>
                  {/* Treatment pill badge */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(216, 180, 180, 0.15)', color: '#4a3636', border: '1px solid rgba(216, 180, 180, 0.4)' }}
                  >
                    {selectedClient.treatment} · {lang === 'en' ? `Day ${selectedClient.day}` : `יום ${selectedClient.day}`}
                  </div>
                </div>

                {/* 2. Contact Card — glassmorphism pill */}
                <div
                  className="rounded-2xl overflow-hidden transition-all hover:shadow-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.55)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1.5px solid rgba(216, 180, 180, 0.4)',
                    boxShadow: '0 4px 20px rgba(216, 180, 180, 0.15)',
                  }}
                >
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(216, 180, 180, 0.2)' }}>
                        <Users className="w-4 h-4" style={{ color: '#d8b4b4' }} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#9a8585' }}>
                          {lang === 'en' ? 'Phone' : 'טלפון'}
                        </p>
                        <p className="text-sm font-medium" style={{ color: '#4a3636' }}>
                          {selectedClient.phone || (lang === 'en' ? 'Not set' : 'לא הוגדר')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openEditClient(selectedClient)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-muted/60"
                      style={{ backgroundColor: 'rgba(216, 180, 180, 0.2)' }}
                    >
                      <Pencil className="w-3.5 h-3.5" style={{ color: '#d8b4b4' }} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* 2.5 Health Declaration Button */}
                <FeatureGate featureKey={FK.HEALTH_DECLARATION} mode="badge">
                {(() => {
                  const signed = hasSignedDeclaration(selectedClient.name);
                  const hasFlags = clientHasRedFlags(selectedClient.name) && !selectedClient.medicalExceptionApproved;
                  const isSafe = clientIsSafe(selectedClient.name);

                  if (signed) {
                    const risk = getClientRiskLevel(selectedClient.name);
                    const riskColors = {
                      red: { bg: 'hsl(0 80% 95%)', border: '#ef4444', text: '#dc2626' },
                      yellow: { bg: 'hsl(45 80% 92%)', border: '#eab308', text: '#a16207' },
                      green: { bg: 'hsl(142 60% 93%)', border: '#22c55e', text: '#16a34a' },
                    };
                    const rc = riskColors[risk];
                    const riskLabel = risk === 'red'
                      ? (lang === 'en' ? 'Medical Warning' : 'התוויית נגד רפואית')
                      : risk === 'yellow'
                        ? (lang === 'en' ? 'Requires Attention' : 'דורש תשומת לב')
                        : (lang === 'en' ? 'All Clear' : 'תקין — ללא ממצאים');
                    return (
                      <div className="rounded-2xl overflow-hidden border p-4 space-y-3" style={{ backgroundColor: rc.bg, borderColor: rc.border }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ border: `2px solid ${rc.border}`, backgroundColor: 'white' }}>
                            {risk === 'red' ? <AlertTriangle className="w-5 h-5" style={{ color: rc.text }} /> : risk === 'yellow' ? <ShieldAlert className="w-5 h-5" style={{ color: rc.text }} /> : <ShieldCheck className="w-5 h-5" style={{ color: rc.text }} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold" style={{ color: rc.text }}>{riskLabel}</p>
                            <p className="text-xs" style={{ color: '#9a8585' }}>
                              {lang === 'en' ? 'Declaration submitted' : 'הצהרת בריאות הוגשה'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewDeclarationFor(selectedClient.name)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.97]"
                          style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636' }}
                        >
                          <Eye className="w-4 h-4" strokeWidth={2} />
                          {lang === 'en' ? 'View Full Health Declaration' : 'צפייה בהצהרת הבריאות המלאה'}
                        </button>
                      </div>
                    );
                  }

                  const cleanPhone = selectedClient.phone ? formatPhone(selectedClient.phone) : '';
                  const hasPhone = cleanPhone.length > 0;
                  const artist = artistName || 'האמנית שלך';

                  const handleSendHealthWhatsApp = async () => {
                    if (!hasPhone) {
                      toast({ title: 'לא ניתן לשלוח הודעה - חסר מספר טלפון ללקוחה זו. אנא עדכני את פרטיה.', variant: 'destructive' });
                      return;
                    }
                    const formLink = await buildHealthShortLink(selectedClient.dbId || '', selectedClient.name, selectedClient.phone, includePolicyShare);
                    const msg = generateWhatsAppMessage(selectedClient.name, formLink, includePolicyShare, artist);
                    window.open(buildWhatsAppUrl(cleanPhone, msg), '_blank');
                  };

                  return (
                    <div className="space-y-3">
                      {/* Policy Toggle — controls ONLY this Brown button */}
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/60 px-3 py-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <ScrollText className="w-4 h-4 shrink-0 text-primary" />
                          <label htmlFor="include-policy-health" className="text-xs font-bold leading-snug cursor-pointer text-foreground">
                            {lang === 'en' ? 'Include Clinic Policy & Treatment Agreement' : 'צרפי גם את מדיניות הקליניקה והסכם הטיפול'}
                          </label>
                        </div>
                        <PremiumPolicySwitch
                          id="include-policy-health"
                          checked={includePolicyShare}
                          onCheckedChange={setIncludePolicyShare}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendHealthWhatsApp}
                        className="w-[85%] mx-auto flex items-center justify-center gap-2 py-3 rounded-full text-sm font-serif font-bold tracking-wide transition-all duration-300 active:scale-[0.96]"
                        style={{
                          background: 'linear-gradient(135deg, #c98a8a 0%, #b06e6e 40%, #a05e5e 100%)',
                          color: '#ffffff',
                          boxShadow: '0 8px 32px rgba(176, 110, 110, 0.45), 0 0 20px rgba(200, 140, 140, 0.25)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                        }}
                      >
                        <MessageCircle className="w-4 h-4" strokeWidth={2} />
                        {lang === 'en' ? 'Send Health Declaration via WhatsApp' : 'שלחי הצהרת בריאות בוואטסאפ'}
                      </button>
                    </div>
                  );
                })()}
                </FeatureGate>

                {/* === Share Client Portal Link (toggle-independent) === */}
                {(() => {
                  const clientZoneLink = buildClientZoneLink(selectedClient.dbId || '');
                  const cleanPhone = selectedClient.phone ? formatPhone(selectedClient.phone) : '';
                  const hasPhone = cleanPhone.length > 0;
                  const artist = artistName || 'האמנית שלך';
                  const waMsg = lang === 'en'
                    ? `Hi ${selectedClient.name} 💛\nHere's your personal client portal link:\n👇\n${clientZoneLink}\n\n${artist}`
                    : `היי ${selectedClient.name} 💛\nמצורף קישור אישי לאזור הלקוחה שלך:\n👇\n${clientZoneLink}\n\n${artist}`;
                  const waUrl = buildWhatsAppUrl(cleanPhone, waMsg);

                  return (
                    <div
                      className="rounded-2xl overflow-hidden p-4 space-y-3 transition-all hover:shadow-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.55)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1.5px solid rgba(216, 180, 180, 0.4)',
                        boxShadow: '0 4px 20px rgba(216, 180, 180, 0.15)',
                      }}
                    >
                      <p className="text-xs font-semibold tracking-wide text-center" style={{ color: '#9a8585' }}>
                        {lang === 'en' ? '🔗 Client Portal Link' : '🔗 קישור לאזור הלקוחה'}
                      </p>
                      <div className="flex gap-2">
                        {/* WhatsApp button — always standard client zone link */}
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            if (!hasPhone) {
                              e.preventDefault();
                              toast({ title: lang === 'en' ? 'No phone number set for this client' : 'לא הוגדר מספר טלפון ללקוחה זו', variant: 'destructive' });
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all active:scale-[0.97] hover:shadow-lg"
                          style={{ background: '#25D366', color: '#ffffff', boxShadow: '0 4px 18px rgba(37, 211, 102, 0.35)' }}
                        >
                          <MessageCircle className="w-4 h-4" strokeWidth={2} />
                          {lang === 'en' ? 'WhatsApp' : 'וואטסאפ'}
                        </a>
                        {/* Copy Link button — always standard client zone link */}
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(clientZoneLink);
                              toast({ title: lang === 'en' ? 'Link copied! ✨' : 'הקישור הועתק בהצלחה! ✨' });
                            } catch {
                              window.prompt(lang === 'en' ? 'Copy this link:' : 'העתיקי את הקישור:', clientZoneLink);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-all active:scale-[0.97] hover:shadow-lg"
                          style={{
                            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
                            color: '#4a3636',
                            boxShadow: '0 4px 18px rgba(212,175,55,0.35)',
                          }}
                        >
                          <Copy className="w-4 h-4" strokeWidth={2} style={{ color: '#4a3636' }} />
                          {lang === 'en' ? 'Copy Link' : 'העתקת קישור'}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* === Send Test Push Notification === */}
                <button
                  type="button"
                  onClick={async () => {
                    setSendingTestPush(true);
                    try {
                      const clientId = selectedClient.dbId || selectedClient.name;
                      console.log('[TestPush] Querying push_subscriptions for client_id:', clientId);
                      const { data: subs, error: subErr } = await supabase
                        .from('push_subscriptions')
                        .select('endpoint, p256dh, auth_key')
                        .eq('client_id', clientId)
                        .order('created_at', { ascending: false })
                        .limit(1);
                      if (subErr || !subs?.length) {
                        toast({ title: lang === 'en' ? 'No push subscription found for this client' : 'לא נמצא מנוי התראות ללקוחה זו', variant: 'destructive' });
                        setSendingTestPush(false);
                        return;
                      }
                      const sub = subs[0];
                      const { data: pushResult, error } = await supabase.functions.invoke('send-push', {
                        body: {
                          subscription: {
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
                          },
                          title: lang === 'en' ? 'GlowPush System Test 🔔' : 'בדיקת מערכת GlowPush 🔔',
                          body: lang === 'en' ? `Hey ${selectedClient.name}, this is a test notification! ✨` : `היי ${selectedClient.name}, זו התראת ניסיון מהמערכת! ✨`,
                          day: 1,
                        },
                      });

                      if (error) {
                        const details = await extractEdgeFunctionError(error);
                        console.error('[TestPush] Edge function error details:', details);

                        if (isPushSubscriptionExpired(details)) {
                          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                          toast({
                            title: lang === 'en' ? 'Subscription expired' : 'המנוי פג תוקף',
                            description: lang === 'en'
                              ? 'The client needs to re-open their recovery link to re-subscribe.'
                              : 'הלקוחה צריכה לפתוח מחדש את הקישור כדי להירשם שוב להתראות.',
                            variant: 'destructive'
                          });
                          return;
                        }

                        toast({
                          title: lang === 'en' ? 'Failed to send notification' : 'שליחת ההתראה נכשלה',
                          description: details.message,
                          variant: 'destructive'
                        });
                        return;
                      }

                      if (pushResult && typeof pushResult === 'object' && 'success' in pushResult && !pushResult.success) {
                        const providerMessage = (pushResult as any).error || (lang === 'en' ? 'Push delivery failed' : 'שליחת ההתראה נכשלה');
                        toast({
                          title: lang === 'en' ? 'Failed to send notification' : 'שליחת ההתראה נכשלה',
                          description: providerMessage,
                          variant: 'destructive'
                        });
                        return;
                      }

                      toast({ title: lang === 'en' ? 'Test notification sent! ✅' : 'התראת בדיקה נשלחה בהצלחה! ✅' });
                    } catch (err: any) {
                      const details = await extractEdgeFunctionError(err);
                      console.error('[TestPush] Failed:', details);
                      toast({
                        title: lang === 'en' ? 'Failed to send notification' : 'שליחת ההתראה נכשלה',
                        description: details.message,
                        variant: 'destructive'
                      });
                    } finally {
                      setSendingTestPush(false);
                    }
                  }}
                  disabled={sendingTestPush}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold tracking-wide transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: 'hsl(340 30% 92%)', color: '#4a2020', border: '1.5px solid hsl(30 40% 72%)', boxShadow: '0 2px 10px rgba(180,110,110,0.12)' }}
                >
                  <Bell className="w-5 h-5" />
                  {sendingTestPush
                    ? (lang === 'en' ? 'Sending...' : 'שולחת...')
                    : (lang === 'en' ? 'Send Test Notification 🔔' : 'שלחי התראת בדיקה 🔔')}
                </button>

                {/* 3. AI Voice Treatment Record */}
                <FeatureGate featureKey={FK.VOICE_NOTES} mode="badge">
                  <VoiceTreatmentRecord
                    lang={lang as 'en' | 'he'}
                    clientName={selectedClient.name}
                    onSave={(text, structured) => {
                      saveTreatmentNote(selectedClient.name, text, structured);
                      toast({ title: lang === 'en' ? `Notes saved to ${selectedClient.name}'s file ✅` : `התיעוד נשמר בהצלחה בתיק של ${selectedClient.name}! ✅` });
                    }}
                  />
                </FeatureGate>

                {/* 3.5 Treatment History */}
                {(treatmentNotes[selectedClient.name] || []).length > 0 && (
                  <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
                        <FileOutput className="w-4 h-4" style={{ color: '#d8b4b4' }} />
                        {lang === 'en' ? 'Treatment History' : 'היסטוריית טיפולים'}
                      </h3>
                    </div>
                    <div className="divide-y divide-border">
                      {treatmentNotes[selectedClient.name].map((note) => (
                        <div key={note.id} className="px-5 py-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground">{note.date}</p>
                            <button
                              onClick={() => {
                                setEditingNote({ clientName: selectedClient.name, note });
                                if (note.structured) {
                                  setEditNoteArea(note.structured.treatmentArea || '');
                                  setEditNotePigment(note.structured.pigmentFormula || '');
                                  setEditNoteNeedle(note.structured.needleType || '');
                                  setEditNoteClinical(note.structured.clinicalNotes || '');
                                  setEditNoteRaw('');
                                } else {
                                  setEditNoteArea(''); setEditNotePigment(''); setEditNoteNeedle(''); setEditNoteClinical('');
                                  setEditNoteRaw(note.rawText);
                                }
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-accent/20"
                              style={{ color: '#d8b4b4' }}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          {note.structured ? (
                            <div className="space-y-1 text-xs text-foreground">
                              {note.structured.treatmentArea && <p><span className="font-semibold">🎯 {lang === 'en' ? 'Area' : 'אזור'}:</span> {note.structured.treatmentArea}</p>}
                              {note.structured.pigmentFormula && <p><span className="font-semibold">💧 {lang === 'en' ? 'Pigment' : 'פיגמנט'}:</span> {note.structured.pigmentFormula}</p>}
                              {note.structured.needleType && <p><span className="font-semibold">🔬 {lang === 'en' ? 'Needle' : 'מחט'}:</span> {note.structured.needleType}</p>}
                              {note.structured.clinicalNotes && <p><span className="font-semibold">📝 {lang === 'en' ? 'Notes' : 'הערות'}:</span> {note.structured.clinicalNotes}</p>}
                            </div>
                          ) : (
                            <p className="text-xs text-foreground">{note.rawText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Before & After Collage Builder — Artist only */}
                <FeatureGate featureKey={FK.BEFORE_AFTER_COLLAGE} mode="badge">
                <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
                  <div className="px-5 py-4 border-b border-border">
                    <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
                      <Image className="w-4 h-4" style={{ color: '#d8b4b4' }} />
                      {lang === 'en' ? 'Before & After Collage' : 'קולאז׳ לפני ואחרי'}
                      <HelpTooltip text="יצירת תמונות מקצועיות לשיווק באינסטגרם ושליחה ללקוחה ישירות לוואטסאפ." id="collage" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === 'en' ? 'Upload before & after photos, edit, and save to gallery' : 'העלי תמונות לפני ואחרי, ערכי ושמרי לגלריה'}
                    </p>
                  </div>
                  <div className="p-5">
                    <DualPhotoGallery
                      clientId={selectedClient.dbId}
                      artistId={userProfileId || undefined}
                      logoUrl={logoUrl}
                    />
                  </div>
                </div>
                </FeatureGate>

                {/* 5. Shared Healing Photo Gallery */}
                <FeatureGate featureKey={FK.SHARED_CLIENT_GALLERY} mode="badge">
                  <div className="rounded-3xl overflow-hidden bg-card border border-border shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="font-light text-sm flex items-center gap-2 text-foreground">
                        <Camera className="w-4 h-4" style={{ color: '#d8b4b4' }} />
                        {lang === 'en' ? 'Shared Healing Gallery' : 'גלריית החלמה משותפת'}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {lang === 'en' ? 'Upload photos visible to the client in real-time' : 'העלי תמונות שהלקוחה תראה בזמן אמת'}
                      </p>
                    </div>
                    <div className="p-5">
                      <HealingPhotoGallery
                        clientId={selectedClient.dbId || selectedClient.name}
                        clientName={selectedClient.name}
                        treatmentDate={(() => {
                          const startDate = new Date();
                          startDate.setDate(startDate.getDate() - selectedClient.day + 1);
                          return startDate.toISOString().split('T')[0];
                        })()}
                        artistId={userProfileId || undefined}
                      />
                    </div>
                  </div>
                </FeatureGate>
              </div>
            ) : (
              /* ── Client List (only when no client selected) ── */
              <>
                {/* Add Client Button */}
                <div className="mb-4 space-y-2">
                  <button
                    onClick={() => { if (navigator.vibrate) navigator.vibrate(50); setDispatchPrefill(null); setDispatchOpen(true); }}
                    className="w-full rounded-full py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: '#ffffff', border: '2.5px solid #d8b4b4', color: '#4a3636', boxShadow: '0 4px 16px rgba(216, 180, 180, 0.3), 0 2px 8px rgba(216, 180, 180, 0.15)' }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    {lang === 'en' ? 'Add New Client' : 'הוספי לקוחה חדשה'}
                  </button>
                  <button
                    onClick={() => setImportOpen(true)}
                    className="w-full rounded-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(216, 180, 180, 0.4)', color: '#4a3636' }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {lang === 'en' ? 'Import Clients (CSV)' : 'ייבוא לקוחות (CSV)'}
                  </button>
                </div>

            <div className="p-1">
              {/* Search bar */}
              <div className="relative mb-3">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#C4A265' }} />
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Search by name or phone...' : 'חיפוש לפי שם או טלפון...'}
                  className="w-full h-11 rounded-2xl bg-background pr-10 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none transition-all"
                  style={{
                    border: '1.5px solid hsl(38 55% 62% / 0.35)',
                    boxShadow: '0 2px 8px rgba(212,175,55,0.08)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1.5px solid #D4AF37';
                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(212,175,55,0.18)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1.5px solid hsl(38 55% 62% / 0.35)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(212,175,55,0.08)';
                  }}
                  dir="rtl"
                />
                {clientSearchQuery && (
                  <button
                    onClick={() => setClientSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {(() => {
                const now = new Date();
                const currentMonth = now.getMonth() + 1;

                const isBirthdayThisWeek = (bd: string | null | undefined) => {
                  if (!bd) return false;
                  const m = parseInt(bd.slice(5, 7));
                  const d = parseInt(bd.slice(8, 10));
                  for (let offset = 0; offset < 7; offset++) {
                    const check = new Date(now);
                    check.setDate(check.getDate() + offset);
                    if (check.getMonth() + 1 === m && check.getDate() === d) return true;
                  }
                  return false;
                };

                const isBirthdayThisMonth = (bd: string | null | undefined) => {
                  if (!bd) return false;
                  return parseInt(bd.slice(5, 7)) === currentMonth;
                };

                const searchQ = clientSearchQuery.trim().toLowerCase();

                const baseClients = clients;

                const displayedClients = searchQ
                  ? baseClients.filter((client) => client.name.toLowerCase().includes(searchQ))
                  : baseClients;

                if (displayedClients.length === 0) {
                  if (searchQ) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 px-6">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                          style={{
                            background: 'linear-gradient(135deg, #F0D0D5 0%, #FDF6E3 100%)',
                            border: '2px solid hsl(38 55% 62% / 0.25)',
                          }}
                        >
                          <Search className="w-7 h-7" style={{ color: '#C4A265' }} />
                        </div>
                        <p
                          className="text-base font-bold mb-1.5"
                          style={{ color: '#B8860B' }}
                        >
                          {lang === 'en' ? 'No clients found' : 'לא נמצאו לקוחות'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lang === 'en' ? 'Try a different search term' : 'נסי מילת חיפוש אחרת'}
                        </p>
                      </div>
                    );
                  }
                }

                return (
              <div className="space-y-4">
                {displayedClients.map((client, i) => {
                  const aftercare = getMessageForDay(client?.day ?? 0);
                  const sentKey = `${client.name}-day${aftercare?.day ?? client?.day ?? 0}`;
                  const lastSent = waSentLog[sentKey];
                  const hasFlags = clientHasRedFlags(client.name) && !client.medicalExceptionApproved;
                  const birthdayWeek = isBirthdayThisWeek(client.birthDate);
                  const needsRenewal = isRenewalDue(client.treatment, client.day);
                    const isSafe = clientIsSafe(client.name);
                    const risk = getClientRiskLevel(client.name);
                    const flags = hasFlags ? [risk === 'red' ? (lang === 'en' ? 'Medical Warning' : 'התוויית נגד') : (lang === 'en' ? 'Attention' : 'תשומת לב')] : [];
                    return (
                      <div key={i} className={`rounded-2xl overflow-hidden transition-all cursor-pointer ${hasFlags ? 'border-2 border-destructive/30' : ''}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.55)',
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: hasFlags ? undefined : '1px solid rgba(216, 180, 180, 0.45)',
                          boxShadow: '0 4px 20px -4px rgba(180, 110, 110, 0.08)',
                        }}
                      >
                        <div className="flex px-3 py-2.5" dir="rtl">
                          {/* Client Info */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedClient(client)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${hasFlags ? 'bg-destructive/10 text-destructive' : ''}`}
                                  style={hasFlags ? {} : { background: 'linear-gradient(145deg, #f0c8c8, #d8a0a0)', color: '#fff', border: '1px solid rgba(216, 180, 180, 0.5)' }}
                                >
                                  {hasFlags ? <AlertTriangle className="w-3.5 h-3.5" /> : client.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className={`font-bold text-xs leading-tight ${hasFlags ? 'text-destructive' : ''}`} style={hasFlags ? {} : { color: '#4a3636', fontFamily: "'Playfair Display', 'FB Ahava', serif" }}>
                                    {birthdayWeek && <span className="ml-1">🎂</span>}
                                    {needsRenewal && <span className="ml-1">🔄</span>}
                                    {client.name}
                                  </p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {hasSignedDeclaration(client.name) ? (() => {
                                      const risk = getClientRiskLevel(client.name);
                                      const color = risk === 'red' ? '#ef4444' : risk === 'yellow' ? '#eab308' : '#22c55e';
                                      const label = risk === 'red'
                                        ? (lang === 'en' ? 'Warning' : 'התוויית נגד')
                                        : risk === 'yellow'
                                          ? (lang === 'en' ? 'Attention' : 'דורש תשומת לב')
                                          : (lang === 'en' ? 'Clear' : 'תקין');
                                      return (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
                                          {risk === 'green' ? <ShieldCheck className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                                          {label}
                                        </span>
                                      );
                                    })() : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-medium" style={{ background: 'rgba(156,163,175,0.1)', color: '#9ca3af', border: '1px solid rgba(156,163,175,0.25)' }}>
                                        <Clock className="w-2.5 h-2.5" />
                                        {lang === 'en' ? 'Pending' : 'ממתין'}
                                      </span>
                                    )}
                                  </div>
                                  </p>
                                  <p className="text-[10px] leading-tight" style={{ color: '#8c6a6a' }}>{client.treatment} · {lang === 'en' ? `Day ${client.day}` : `יום ${client.day}`}</p>
                                </div>
                                {isSafe && <ShieldCheck className="w-3 h-3 shrink-0" style={{ color: '#d8b4b4' }} />}
                                {client.pushOptedIn && <Bell className="w-3 h-3 shrink-0" style={{ color: '#d8b4b4' }} />}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={(e) => { e.stopPropagation(); openEditClient(client); }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(216, 180, 180, 0.15)', color: '#4a3636' }}>
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); openWhatsApp(client.phone, client.name, client.link); }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(216, 180, 180, 0.15)', color: '#4a3636' }}>
                                  <MessageCircle className="w-3 h-3" />
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setDeletingClient(client); }}
                                  className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.06)', color: '#e88a8a' }}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {hasFlags && (
                              <div className="mt-1.5 mr-10 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-destructive">{flags.join(' · ')}</span>
                                <button onClick={(e) => { e.stopPropagation(); approveException(client); }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-destructive/10 text-destructive transition-all">
                                  <ShieldCheck className="w-2.5 h-2.5" /> {lang === 'en' ? 'Approve' : 'אישור חריגה'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Compact Action Buttons */}
                        <div className="px-3 pb-2.5 flex items-center gap-1.5 flex-wrap">
                          {lastSent && (
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <CheckCircle className="w-2.5 h-2.5" style={{ color: '#d8b4b4' }} />
                              {lang === 'en' ? `Sent: ${lastSent}` : `נשלח: ${lastSent}`}
                            </span>
                          )}
                          <FeatureGate featureKey={FK.HEALTH_DECLARATION} mode="badge">
                          {hasSignedDeclaration(client.name) ? (
                            <button type="button" onClick={() => setViewDeclarationFor(client.name)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold text-white transition-all active:scale-95"
                              style={{ background: 'linear-gradient(145deg, #4ade80, #22c55e)', boxShadow: '0 3px 10px rgba(34, 197, 94, 0.25), 0 0 8px rgba(34, 197, 94, 0.1)' }}>
                              <ClipboardCheck className="w-3 h-3" /> {lang === 'en' ? '✅ Signed' : '✅ חתומה'}
                            </button>
                          ) : (() => {
                              const cleanPhone = client.phone ? formatPhone(client.phone) : '';
                              const hasPhone = cleanPhone.length > 0;
                              return (
                                <button type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!hasPhone) { toast({ title: 'חסר מספר טלפון ללקוחה זו', variant: 'destructive' }); return; }
                                    await sendHealthFormWhatsApp(client.name, client.phone, true, client.dbId);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
                                  style={{ background: 'linear-gradient(145deg, #E8A0B0, #D4838F)', color: '#fff', boxShadow: '0 4px 14px rgba(212, 131, 143, 0.3), 0 0 10px rgba(232, 160, 176, 0.15)' }}>
                                  <MessageCircle className="w-3 h-3" /> {lang === 'en' ? 'Health Declaration' : 'הצהרת בריאות'}
                                </button>
                              );
                            })()}
                          </FeatureGate>
                          {birthdayWeek && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setBirthdayWishClient(client); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
                              style={{ background: 'rgba(216, 180, 180, 0.12)', color: '#4a3636', border: '1px solid #d8b4b4', boxShadow: '0 3px 10px rgba(216, 180, 180, 0.15)' }}>
                              🎂 {lang === 'en' ? 'Birthday Wish' : 'ברכת יום הולדת'}
                            </button>
                          )}
                          {needsRenewal && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setRenewalClient(client); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
                              style={{ background: 'rgba(216, 180, 180, 0.12)', color: '#4a3636', border: '1px solid #d8b4b4', boxShadow: '0 3px 10px rgba(216, 180, 180, 0.15)' }}>
                              🔄 {lang === 'en' ? 'Renewal' : 'חידוש טיפול'}
                            </button>
                          )}
                          <button type="button" onClick={(e) => { e.stopPropagation(); setShowInvoiceComingSoon(true); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all active:scale-95"
                            style={{ color: '#a09a9a', background: 'rgba(216, 180, 180, 0.08)', border: '1px solid rgba(216, 180, 180, 0.3)' }}>
                            <FileOutput className="w-3 h-3" /> {lang === 'en' ? 'Invoice' : 'חשבונית/קבלה'}
                          </button>
                        </div>
                      </div>
                    );
                })}
                {/* Infinite scroll sentinel */}
                {!clientSearchQuery && hasMoreClients && (
                  <div ref={loadMoreSentinelRef} className="flex justify-center py-4">
                    {loadingMoreClients && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                  </div>
                )}
              </div>
                );
              })()}
            </div>
              </>
            )}
          </div>
        )}

        {/* ===== BONUSES TAB (hidden from nav, still accessible) ===== */}
        {activeTab === 'messages' && (
          <div>
            <ReferralTab artistName={artistName} />
          </div>
        )}

        {/* ===== DIGITAL CARD TAB ===== */}
        {activeTab === 'digital-card' && (
          <FeatureGate featureKey={FK.DIGITAL_CARD} mode="block">
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-foreground">{lang === 'en' ? 'Your Digital Card' : 'הכרטיס הדיגיטלי שלך'}</h2>
                <p className="text-sm text-muted-foreground mt-1">{lang === 'en' ? 'Share with clients for booking & info' : 'שתפי עם לקוחות להזמנות ומידע'}</p>
              </div>
              <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-background">
                <DigitalCard
                  embedded
                  previewName={artistName || 'שם העסק'}
                  previewPhone={artistPhone ? formatPhone(artistPhone) : '972508855329'}
                  previewLogo={logoUrl}
                  previewIg={instagramUrl}
                  previewFacebook={facebookUrl}
                  previewWaze={wazeAddress}
                />
              </div>
              <button
                onClick={async () => {
                  const BASE = 'https://glow-push-concierge.lovable.app/digital-card';
                  const params = new URLSearchParams();
                  if (artistName) params.set('name', artistName);
                  const ph = artistPhone ? formatPhone(artistPhone) : '972508855329';
                  params.set('phone', ph);
                  if (logoUrl) params.set('logo', logoUrl);
                  if (instagramUrl) params.set('ig', instagramUrl);
                  if (facebookUrl) params.set('facebook', facebookUrl);
                  if (wazeAddress) params.set('waze', wazeAddress);
                  const qs = params.toString();
                  const shareUrl = `${BASE}${qs ? `?${qs}` : ''}`;
                  const shareTitle = lang === 'en' ? 'Digital Business Card' : 'כרטיס ביקור דיגיטלי';
                  const shareText = lang === 'en' ? 'Hey! ✨ Check out my new digital studio card. All the ways to reach me and see my work — just one click away:' : 'היי אהובה! ✨ מזמינה אותך להציץ בכרטיס הדיגיטלי החדש של הסטודיו. כל הדרכים ליצור איתי קשר ולראות עבודות נמצאות כאן בקליק אחד:';
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                      toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                    } else {
                      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                      toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                    }
                  } catch (e: any) {
                    if (e?.name !== 'AbortError') {
                      try {
                        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                        toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                      } catch {
                        window.prompt(lang === 'en' ? 'Copy this link:' : 'העתיקי את הקישור:', shareUrl);
                      }
                    }
                  }
                }}
                className="preview-card-btn w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636', boxShadow: '0 4px 18px rgba(212,175,55,0.35)', border: 'none' }}
              >
                <Share2 className="w-5 h-5" />
                {lang === 'en' ? 'Copy Card Link' : 'העתק קישור לכרטיס'}
              </button>
            </div>
          </FeatureGate>
        )}
        {/* ===== HEALING TAB ===== */}
        {activeTab === 'healing' && !subScreen && healingJourneyClient && healingJourneyClient.day > 0 && (
          <FeatureGate featureKey={FK.HEALING_TIMELINE} mode="block">
          <HealingJourneyTimeline
            clientName={healingJourneyClient.name}
            clientPhone={healingJourneyClient.phone}
            treatmentType={healingJourneyClient.treatment}
            treatmentDay={healingJourneyClient.day}
            artistName={artistName || 'האמנית שלך'}
            onBack={() => setHealingJourneyClient(null)}
            waSentLog={waSentLog}
            onSendWhatsApp={(day, msg) => {
              const cleanPhone = healingJourneyClient.phone ? formatPhone(healingJourneyClient.phone) : '';
              const encoded = encodeURIComponent(msg);
              const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
              window.location.href = url;
              const key = `${healingJourneyClient.name}-day${day}`;
              const now = new Date().toLocaleString('he-IL');
              const updated = { ...waSentLog, [key]: now };
              setWaSentLog(updated);
              saveSentLog(updated);
              toast({ title: lang === 'en' ? 'WhatsApp opened!' : 'וואטסאפ נפתח!' });
            }}
          />
          </FeatureGate>
        )}
        {/* ── Healing: Treatment Type Selection ── */}
        {activeTab === 'healing' && !subScreen && healingJourneyClient && healingJourneyClient.day === 0 && (() => {
          try {
            const isHe = lang === 'he';
            const sel = healingJourneyClient?.treatment ?? '';
            const isBrows = sel.includes('גבות') || sel.toLowerCase().includes('brow');
            const isLips = sel.includes('שפתיים') || sel.toLowerCase().includes('lip');
            return (
              <div className="space-y-6 animate-fade-up" dir={isHe ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setHealingJourneyClient(null); setActiveTab('home'); }} className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-accent/10 transition-all shrink-0">
                    <ChevronRight className={`w-5 h-5 text-foreground ${isHe ? '' : 'rotate-180'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-foreground">{isHe ? 'בחירת מסלול החלמה' : 'Choose Healing Path'}</h1>
                    <p className="text-xs text-foreground/60 mt-0.5">{isHe ? 'בחרי את סוג הטיפול כדי להתאים את הודעות ה-push ללקוחה' : 'Select treatment type to customize push notifications'}</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4 border border-border bg-card text-center">
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-lg text-foreground bg-pink">{healingJourneyClient?.name?.charAt(0) ?? '?'}</div>
                  <p className="font-bold text-foreground">{healingJourneyClient?.name ?? ''}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{healingJourneyClient?.phone ?? ''}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setHealingJourneyClient(prev => prev ? { ...prev, treatment: isHe ? 'גבות' : 'Brows' } : null)}
                    className={`rounded-2xl p-5 border-2 text-center transition-all active:scale-[0.97] ${isBrows ? 'shadow-lg' : 'border-border bg-card hover:border-accent/40'}`}
                    style={isBrows ? { borderColor: 'hsl(38 55% 62%)', background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--gold-muted)) 100%)', boxShadow: '0 4px 20px -4px hsla(38, 55%, 62%, 0.3)' } : undefined}
                  >
                    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-10 h-10 mx-auto mb-3" style={{ color: isBrows ? 'hsl(38 55% 62%)' : 'hsl(var(--muted-foreground))' }}>
                      <path d="M5 22c4-8 12-14 20-14s14 6 16 14" /><path d="M5 22c4-4 10-6 16-6" />
                    </svg>
                    <p className="font-bold text-foreground text-base mb-1">{isHe ? 'גבות' : 'Brows'}</p>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">{isHe ? 'ליווי החלמה מותאם לפיגמנט גבות' : 'Healing journey for brow pigment'}</p>
                  </button>
                  <button
                    onClick={() => setHealingJourneyClient(prev => prev ? { ...prev, treatment: isHe ? 'שפתיים' : 'Lips' } : null)}
                    className={`rounded-2xl p-5 border-2 text-center transition-all active:scale-[0.97] ${isLips ? 'shadow-lg' : 'border-border bg-card hover:border-accent/40'}`}
                    style={isLips ? { borderColor: 'hsl(38 55% 62%)', background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--gold-muted)) 100%)', boxShadow: '0 4px 20px -4px hsla(38, 55%, 62%, 0.3)' } : undefined}
                  >
                    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto mb-3" style={{ color: isLips ? 'hsl(38 55% 62%)' : 'hsl(var(--muted-foreground))' }}>
                      <path d="M20 30c-7 0-12-3.5-12-8.5 0-2.5 2.5-5 5-6.5L20 9l7 6c2.5 1.5 5 4 5 6.5 0 5-5 8.5-12 8.5z" /><path d="M8 21.5h24" />
                    </svg>
                    <p className="font-bold text-foreground text-base mb-1">{isHe ? 'שפתיים' : 'Lips'}</p>
                    <p className="text-[11px] text-foreground/60 leading-relaxed">{isHe ? 'ליווי החלמה מותאם לפיגמנט שפתיים' : 'Healing journey for lip pigment'}</p>
                  </button>
                </div>
                {(isBrows || isLips) && (
                  <button
                    onClick={() => {
                      try {
                        const link = `${origin}/c/${encodeURIComponent((healingJourneyClient as any)?.dbId ?? '')}?name=${encodeURIComponent(healingJourneyClient?.name ?? '')}&treatment=${encodeURIComponent(healingJourneyClient?.treatment ?? '')}&start=${new Date().toISOString().split('T')[0]}&artist_id=${encodeURIComponent(userProfileId || '')}`;
                        openWhatsApp(healingJourneyClient?.phone ?? '', healingJourneyClient?.name ?? '', link);
                        toast({ title: isHe ? '✨ מסע ההחלמה הופעל בהצלחה! ההודעות מתוזמנות.' : '✨ Healing journey activated! Messages are scheduled.' });
                      } catch (err) {
                        console.error('Error activating healing journey:', err);
                        toast({ title: isHe ? 'שגיאה בהפעלת מסע ההחלמה' : 'Error activating healing journey', variant: 'destructive' });
                      } finally {
                        setHealingJourneyClient(null);
                        setActiveTab('clients');
                      }
                    }}
                    className="w-full py-4 rounded-2xl text-base font-bold border border-black transition-all active:scale-[0.97] hover:shadow-lg animate-fade-up"
                    style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))', color: '#fff' }}
                  >
                    {isHe ? '✨ הפעילי מסע החלמה אוטומטי' : '✨ Activate Automatic Healing Journey'}
                  </button>
                )}
              </div>
            );
          } catch (err) {
            console.error('Error rendering treatment selection:', err);
            return (
              <div className="p-6 text-center text-muted-foreground">
                <p>{lang === 'en' ? 'Error loading treatment selection. Please refresh.' : 'שגיאה בטעינת בחירת הטיפול. נסי לרענן.'}</p>
                <button onClick={() => setHealingJourneyClient(null)} className="mt-3 px-4 py-2 rounded-full text-sm btn-metallic-gold">{lang === 'en' ? 'Go Back' : 'חזרה'}</button>
              </div>
            );
          }
        })()}
        {activeTab === 'healing' && !subScreen && !healingJourneyClient && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground">
              {lang === 'en' ? 'Active Healing Journeys' : 'תהליכי החלמה פעילים'}
            </h2>
            {(() => {
              const healingClients = clients.filter(c => c.day >= 1 && c.day <= 30);
              if (healingClients.length === 0) {
                return (
                  <div className="rounded-2xl bg-card border border-border p-8 text-center">
                    <Sparkles className="w-10 h-10 mx-auto mb-3 text-accent" />
                    <p className="text-sm text-muted-foreground">
                      {lang === 'en' ? 'No active healing processes. Start a healing journey from the Dashboard.' : 'אין תהליכי החלמה פעילים. התחילי מסע החלמה מהדאשבורד.'}
                    </p>
                  </div>
                );
              }
              return (
                <div className="space-y-3">
                  {healingClients.map((client, i) => (
                    <button
                      key={i}
                      onClick={() => setHealingJourneyClient(client)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:shadow-gold transition-all text-right"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0 text-xl">
                        {client.treatment.includes('שפתיים') || client.treatment.toLowerCase().includes('lip') ? '👄' : '✨'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{lang === 'en' ? `Day ${client.day}` : `יום ${client.day}`} · {client.treatment}</p>
                      </div>
                      <div className="text-xs font-semibold text-accent">{lang === 'en' ? `Day ${client.day}/30` : `${client.day}/30`}</div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        {/* ===== BONUSES TAB ===== */}
        {activeTab === 'bonuses' && !subScreen && (
          <FeatureGate featureKey={FK.BONUS_CENTER} mode="block">
            <div className="space-y-4">
              <BonusCenter
                userProfileId={userProfileId}
                onNavigateToReferrals={() => { setActiveTab('profile'); setSubScreen(lang === 'en' ? 'Referrals' : 'הפניות'); }}
              />
            </div>
          </FeatureGate>
        )}
        {/* ===== PUSH! TAB ===== */}
        {activeTab === 'push' && !subScreen && (
          <FeatureGate featureKey={FK.MESSAGES} mode="block">
            <div className="space-y-4">
              {/* Coming Soon — WhatsApp Automation */}
              <div
                className="w-full rounded-2xl px-5 py-4 relative overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.45)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(216, 180, 180, 0.4)',
                  boxShadow: '0 4px 20px rgba(216, 180, 180, 0.12)',
                }}
              >
                {/* Coming Soon tag */}
                <span
                  className="absolute top-3 end-3 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #d8b4b4, #c9a0a0)', color: '#fff' }}
                >
                  {lang === 'en' ? 'Coming Soon' : 'בקרוב'}
                </span>
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 shrink-0" style={{ color: '#d8b4b4' }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: '#4a3636' }}>
                      {lang === 'en' ? 'Full WhatsApp Automation — Coming Soon!' : 'אוטומציה מלאה בוואטסאפ — בקרוב!'}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#8c6a6a' }}>
                      {lang === 'en' ? 'Messages will send automatically — zero clicks' : 'ההודעות יישלחו לבד — בלי ללחוץ על כלום'}
                    </p>
                  </div>
                </div>
              </div>
              <MessageEditor />
            </div>
          </FeatureGate>
        )}
        {/* ===== CALENDAR TAB ===== */}
        {activeTab === 'calendar' && (
          <SmartCalendar
            lang={lang as 'en' | 'he'}
            redFlagClients={redFlagClients.map(c => c.name)}
            artistProfileId={userProfileId}
            logoUrl={logoUrl}
            onBack={() => setActiveTab('home')}
            onNewAppointment={(prefill) => {
              setDispatchPrefill({ name: prefill.name, phone: prefill.phone, treatment: prefill.treatment });
              setDispatchOpen(true);
            }}
            onTreatmentCompleted={(apt) => {
              // Auto-trigger healing journey for completed treatments
              const newClient = {
                name: apt.clientName,
                phone: apt.clientPhone,
                day: 1,
                treatment: apt.treatmentType === 'eyebrows' ? (lang === 'en' ? 'Brows' : 'גבות') : apt.treatmentType === 'eyeliner' ? (lang === 'en' ? 'Eyeliner' : 'אייליינר') : (lang === 'en' ? 'Lips' : 'שפתיים'),
                link: `${origin}/c/new?name=${encodeURIComponent(apt.clientName)}&treatment=${apt.treatmentType}&start=${apt.date}`,
                beforeImg: '',
                afterImg: '',
              };
              setClients(prev => {
                if (prev.some(c => c.name === apt.clientName)) return prev;
                return [newClient, ...prev];
              });
            }}
            removeClientName={removeClientFromCalendar}
            onClientRemoved={() => setRemoveClientFromCalendar(null)}
            existingClientNames={clients.map(c => c.name)}
            onClientAdded={() => fetchClients()}
          />
        )}

        {/* ===== PROFILE TAB ===== */}
        {activeTab === 'profile' && !subScreen && (
          <div className="space-y-8" style={{ backgroundColor: '#ffffff', margin: '-0.5rem -1.25rem', padding: '1rem 1.25rem', minHeight: 'calc(100vh - 7rem)' }}>

            {/* Card 1 — Business Details */}
            <div className="rounded-3xl p-5 bg-card" style={{ border: '3px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 8px 32px -4px rgba(212, 175, 55, 0.35), 0 4px 16px -2px rgba(0, 0, 0, 0.1)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Settings className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="font-bold text-xl tracking-wide text-foreground">{lang === 'en' ? 'Business Details' : 'פרטי העסק'}</h2>
              </div>
              <div className="h-[2px] w-full mb-5" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 55% 62%), transparent)' }} />

              {/* Logo */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{lang === 'en' ? 'Studio Logo' : 'לוגו הסטודיו'}</Label>
                <label
                  className="w-full rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer bg-white transition-all hover:shadow-md"
                  style={{ border: '2px solid hsl(38 55% 62%)' }}
                >
                  {logoUrl ? (
                    <div className="w-20 h-20 overflow-hidden flex items-center justify-center">
                      <img src={logoUrl} alt="Studio logo" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                    </div>
                  ) : (
                    <Upload className="w-6 h-6 text-accent" />
                  )}
                  <span className="text-sm font-medium text-accent">{logoUrl ? (lang === 'en' ? 'Change Logo' : 'החליפי לוגו') : (lang === 'en' ? 'Upload Logo' : 'העלי לוגו')}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) { toast({ title: lang === 'en' ? 'File too large (max 10MB)' : 'הקובץ גדול מדי (מקס 10MB)', variant: 'destructive' }); e.target.value = ''; return; }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const nextLogoUrl = reader.result as string;
                      setLogoUrl(nextLogoUrl);
                      setHasUnsavedLogoChange(true);
                      toast({ title: lang === 'en' ? 'Logo updated locally' : 'הלוגו עודכן בתצוגה המקומית' });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasUnsavedLogoChange) {
                        setLogoUrl(savedLogoUrl);
                        setHasUnsavedLogoChange(false);
                      } else {
                        setLogoUrl('');
                        setHasUnsavedLogoChange(true);
                      }
                    }}
                    className="text-xs text-destructive hover:underline block mx-auto"
                  >
                    {hasUnsavedLogoChange ? (lang === 'en' ? 'Cancel logo change' : 'ביטול שינוי לוגו') : (lang === 'en' ? 'Remove' : 'הסרה')}
                  </button>
                )}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  💡 {lang === 'en' ? 'Tip: For perfect collage results, upload a logo with a transparent background (PNG file).' : 'המלצה: לקבלת תוצאה מושלמת בקולאז׳, מומלץ להעלות לוגו עם רקע שקוף (קובץ PNG).'}
                </p>
              </div>

              <div className="h-px w-full bg-gradient-to-l from-transparent via-accent/20 to-transparent my-4" />
              {/* Name */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{lang === 'en' ? 'Business Name' : 'שם העסק'}</Label>
                <Input
                  value={artistName}
                  onChange={(e) => { setArtistName(e.target.value); localStorage.setItem('gp-artist-name', e.target.value); }}
                  placeholder={lang === 'en' ? 'e.g. Dana' : 'לדוגמה: דנה'}
                  className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                  style={{ border: '2px solid hsl(38 55% 62%)' }}
                />
              </div>

              <div className="h-px w-full bg-gradient-to-l from-transparent via-accent/20 to-transparent my-4" />
              {/* Phone */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">{lang === 'en' ? 'WhatsApp Number' : 'מספר וואטסאפ'}</Label>
                <Input
                  value={artistPhone}
                  onChange={(e) => { setArtistPhone(e.target.value); localStorage.setItem('gp-artist-phone', e.target.value); }}
                  placeholder="050-0000000"
                  dir="ltr"
                  className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                  style={{ border: '2px solid hsl(38 55% 62%)' }}
                />
              </div>

              <div className="h-px w-full bg-gradient-to-l from-transparent via-accent/20 to-transparent my-4" />

              <Button
                onClick={async () => {
                  if (!userProfileId) { toast({ title: lang === 'en' ? 'Profile not found' : 'פרופיל לא נמצא', variant: 'destructive' }); return; }
                    setSavingBusiness(true);
                    try {
                      const finalLogoUrl = await uploadProfileLogo(logoUrl);

                      const { error } = await supabase.from('profiles').update({
                        full_name: artistName || null,
                        business_phone: artistPhone || null,
                        logo_url: finalLogoUrl || null,
                      } as any).eq('id', userProfileId);

                      if (error) {
                        console.error('Business profile update failed', { userProfileId, finalLogoUrl, error });
                        throw error;
                      }
                      setSavedLogoUrl(finalLogoUrl || '');
                      setLogoUrl(finalLogoUrl || '');
                      setHasUnsavedLogoChange(false);
                      if (finalLogoUrl) localStorage.setItem('gp-artist-logo', finalLogoUrl);
                      else localStorage.removeItem('gp-artist-logo');
                      toast({ title: lang === 'en' ? 'Changes saved successfully! ✨' : 'השינויים נשמרו בהצלחה! ✨' });
                    } catch (err: any) {
                      console.error('Save business details error:', err);
                      toast({ title: lang === 'en' ? 'Save failed' : 'השמירה נכשלה', variant: 'destructive' });
                    }
                    setSavingBusiness(false);
                }}
                disabled={savingBusiness}
                className="w-full mt-2 h-12 rounded-full font-bold text-sm tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
                  color: '#4a3636',
                  border: '1px solid #B8860B',
                  boxShadow: '0 3px 14px rgba(212,175,55,0.45)',
                }}
              >
                {savingBusiness ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {savingBusiness ? (lang === 'en' ? 'Saving...' : 'שומר...') : (lang === 'en' ? 'Save Changes' : 'שמירת שינויים')}
              </Button>
            </div>

            {/* Card — Digital Card Settings */}
            <div className="rounded-3xl p-5 bg-card" style={{ border: '3px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 8px 32px -4px rgba(212, 175, 55, 0.35), 0 4px 16px -2px rgba(0, 0, 0, 0.1)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="font-bold text-xl tracking-wide text-foreground">{lang === 'en' ? 'Digital Card Settings' : 'הגדרות כרטיס דיגיטלי'}</h2>
              </div>
              <div className="h-[2px] w-full mb-5" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 55% 62%), transparent)' }} />

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Instagram Link' : 'לינק לאינסטגרם'}</Label>
                  <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/your_page" dir="ltr" className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0" style={{ border: '1px solid hsl(38 55% 62%)' }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Facebook Link' : 'לינק לפייסבוק'}</Label>
                  <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/your_page" dir="ltr" className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0" style={{ border: '1px solid hsl(38 55% 62%)' }} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Business Address (Waze)' : 'כתובת העסק (עבור Waze)'}</Label>
                  <Input value={wazeAddress} onChange={(e) => setWazeAddress(e.target.value)} placeholder={lang === 'en' ? 'e.g. Dizengoff 50, Tel Aviv' : 'לדוגמה: דיזנגוף 50, תל אביב'} className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0" style={{ border: '1px solid hsl(38 55% 62%)' }} />
                </div>

              <Button
                  onClick={async () => {
                    if (!userProfileId) { toast({ title: lang === 'en' ? 'Profile not found' : 'פרופיל לא נמצא', variant: 'destructive' }); return; }
                     setSavingCard(true);
                    try {
                      const finalLogoUrl = await uploadProfileLogo(logoUrl);
                      const { error } = await supabase.from('profiles').update({
                        business_phone: artistPhone,
                        instagram_url: instagramUrl,
                        facebook_url: facebookUrl,
                        waze_address: wazeAddress,
                        logo_url: finalLogoUrl || null,
                      } as any).eq('id', userProfileId);
                      if (error) {
                        console.error('Digital card profile update failed', { userProfileId, finalLogoUrl, error });
                        throw error;
                      }
                      setSavedLogoUrl(finalLogoUrl || '');
                      setLogoUrl(finalLogoUrl || '');
                      setHasUnsavedLogoChange(false);
                      if (finalLogoUrl) localStorage.setItem('gp-artist-logo', finalLogoUrl);
                      else localStorage.removeItem('gp-artist-logo');
                      toast({ title: lang === 'en' ? 'Changes saved successfully! ✨' : 'השינויים נשמרו בהצלחה! ✨' });
                    } catch (err: any) {
                      console.error('Save card settings error:', err);
                      toast({ title: lang === 'en' ? 'Save failed' : 'השמירה נכשלה', variant: 'destructive' });
                    }
                    setSavingCard(false);
                  }}
                  disabled={savingCard}
                  className="w-full mt-2 h-12 rounded-full text-white font-bold text-sm tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
                    color: '#4a3636',
                    border: '1px solid #B8860B',
                    boxShadow: '0 3px 14px rgba(212,175,55,0.45)',
                  }}
                >
                  {savingCard ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  {savingCard ? (lang === 'en' ? 'Saving...' : 'שומר...') : (lang === 'en' ? 'Save Changes' : 'שמירת שינויים')}
                </Button>
              </div>
            </div>

            <FeatureGate featureKey={FK.DIGITAL_CARD} mode="badge">
              <button
                onClick={() => setShowDigitalCardPreview(true)}
                className="preview-card-btn w-full flex items-center justify-center rounded-3xl p-5 transition-all hover:scale-[1.01] active:scale-[0.98]"
              >
                <span className="block w-full text-center font-bold text-base tracking-wide relative z-10" style={{ color: '#FFFFFF' }}>
                  {lang === 'en' ? 'View Digital Card' : 'תצוגת כרטיס דיגיטלי'}
                </span>
              </button>
            </FeatureGate>

            {/* Preview Client Page */}
            <button
              onClick={() => {
                const baseUrl = window.location.origin;
                const previewUrl = `${baseUrl}/c/demo?name=${encodeURIComponent('דנה לדוגמה')}&treatment=eyebrows&start=${new Date().toISOString().split('T')[0]}&artist_id=${encodeURIComponent(userProfileId || '')}`;
                window.open(previewUrl, '_blank');
              }}
              className="preview-card-btn w-full rounded-3xl p-5 flex items-center justify-center transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <span className="block w-full text-center font-bold text-base tracking-wide relative z-10" style={{ color: '#FFFFFF' }}>
                {lang === 'en' ? 'Preview Client Screen' : 'תצוגת מסך לקוחה'}
              </span>
            </button>


            {/* Card — Promo & Benefits Manager */}
            <div className="rounded-3xl p-5 bg-card" style={{ border: '3px solid transparent', backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box', boxShadow: '0 8px 32px -4px rgba(212, 175, 55, 0.35), 0 4px 16px -2px rgba(0, 0, 0, 0.1)' }}>
              <div className="flex items-center gap-3 mb-3">
                <Gift className="w-5 h-5 text-accent" strokeWidth={1.5} />
                <h2 className="font-bold text-xl tracking-wide text-foreground">{lang === 'en' ? 'Manage Promotions & Benefits' : 'ניהול מבצעים והטבות'}</h2>
              </div>
              <div className="h-[2px] w-full mb-5" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 55% 62%), transparent)' }} />

              <div className="space-y-5" dir="rtl">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Tag Text' : 'טקסט תגית'}</Label>
                  <Input
                    value={promoTagText}
                    onChange={(e) => setPromoTagText(e.target.value)}
                    dir={lang === 'en' ? 'ltr' : 'rtl'}
                    placeholder={lang === 'en' ? 'Exclusive for Returning Clients ✨' : 'פינוק ללקוחות חוזרות ✨'}
                    className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                    style={{ border: '1px solid hsl(38 55% 62%)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Main Title' : 'כותרת ראשית'}</Label>
                  <Input
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    dir={lang === 'en' ? 'ltr' : 'rtl'}
                    placeholder={lang === 'en' ? 'Complete Your Look' : 'להשלמת המראה'}
                    className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                    style={{ border: '1px solid hsl(38 55% 62%)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Description' : 'תיאור'}</Label>
                  <Textarea
                    value={promoDescription}
                    onChange={(e) => setPromoDescription(e.target.value)}
                    dir={lang === 'en' ? 'ltr' : 'rtl'}
                    rows={4}
                    placeholder={lang === 'en' ? 'Love your new brows? Complete your look with a delicate watercolor lip blush! Enjoy 15% off your next treatment as an existing client.' : 'אהבת את הגבות החדשות? השלימי את המראה עם פיגמנט שפתיים בטכניקת אקוורל עדינה! קבלי 15% הנחה לטיפול נוסף כלקוחה קיימת.'}
                    className="rounded-2xl bg-white text-sm px-4 py-3 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                    style={{ border: '1px solid hsl(38 55% 62%)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Button Text' : 'טקסט כפתור'}</Label>
                  <Input
                    value={promoButtonText}
                    onChange={(e) => setPromoButtonText(e.target.value)}
                    dir="rtl"
                    className="h-12 rounded-full bg-white text-sm px-5 focus-visible:ring-accent/40 focus-visible:ring-offset-0"
                    style={{ border: '1px solid hsl(38 55% 62%)' }}
                  />
                </div>

                <Button
                  onClick={async () => {
                    setSavingPromo(true);
                    const success = await savePromo({
                      tag_text: promoTagText,
                      title: promoTitle,
                      description: promoDescription,
                      button_text: promoButtonText,
                      button_url: '',
                      is_enabled: true,
                    });
                    setSavingPromo(false);
                    if (success) {
                      toast({ title: lang === 'en' ? 'Changes saved successfully! ✨' : 'השינויים נשמרו בהצלחה! ✨' });
                    } else {
                      toast({ title: lang === 'en' ? 'Save failed' : 'השמירה נכשלה', variant: 'destructive' });
                    }
                  }}
                  disabled={savingPromo}
                  className="w-full mt-2 h-12 rounded-full font-bold text-sm tracking-wide"
                  style={{
                    background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
                    color: '#4a3636',
                    border: '1px solid #B8860B',
                    boxShadow: '0 3px 14px rgba(212,175,55,0.45)',
                  }}
                >
                  {savingPromo ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  {savingPromo ? (lang === 'en' ? 'Saving...' : 'שומר...') : (lang === 'en' ? 'Save Changes' : 'שמירת שינויים')}
                </Button>
              </div>

              {/* Live Phone Preview */}
              <div className="mt-8">
                <Label className="text-sm font-semibold text-foreground mb-4 block">
                  {lang === 'en' ? 'Live Client Preview' : 'תצוגה מקדימה אצל הלקוחה'}
                </Label>
                {/* Phone mockup frame */}
                <div
                  className="relative mx-auto"
                  style={{
                    width: '280px',
                    borderRadius: '36px',
                    padding: '12px',
                    background: 'linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 50%, #3a3a3c 100%)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Notch */}
                  <div
                    className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[80px] h-[24px] rounded-full z-20"
                    style={{ background: '#1c1c1e' }}
                  />
                  {/* Inner screen */}
                  <div
                    className="relative overflow-hidden"
                    style={{
                      borderRadius: '28px',
                      background: 'linear-gradient(135deg, #F8E8EC 0%, #F0D0D5 30%, #E8C0C8 60%, #F0D0D5 80%, #F8E8EC 100%)',
                      minHeight: '380px',
                    }}
                  >
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-8 pb-2 text-[10px] font-semibold" style={{ color: '#5C400A' }}>
                      <span>9:41</span>
                      <div className="flex items-center gap-1">
                        <span>📶</span>
                        <span>🔋</span>
                      </div>
                    </div>

                    {/* Promo card preview */}
                    <div className="px-4 pt-2 pb-6">
                      <div
                        className="relative rounded-2xl p-5 overflow-hidden"
                        style={{
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.6) 100%)',
                          backdropFilter: 'blur(20px)',
                          border: '1.5px solid rgba(212,175,55,0.3)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                        }}
                      >
                        {/* Tag badge */}
                        <div className="absolute top-3 left-3">
                          <span
                            className="px-3 py-1 rounded-full text-[10px] font-bold"
                            style={{
                              background: 'linear-gradient(135deg, #d69da9 0%, #cf8f9b 40%, #c4869a 70%, #cf8f9b 90%, #d69da9 100%)',
                              color: '#fff',
                              boxShadow: '0 4px 12px rgba(214,157,169,0.4)',
                            }}
                          >
                            {(() => {
                              const v = promoTagText || 'פינוק ללקוחות חוזרות ✨';
                              if (lang === 'en' && (v === 'פינוק ללקוחות חוזרות ✨' || v === 'פינוק ללקוחות ✨')) return 'Exclusive for Returning Clients ✨';
                              return v;
                            })()}
                          </span>
                        </div>
                        {/* Sparkle deco */}
                        <div className="absolute top-3 right-3 text-sm opacity-60">⭐</div>
                        
                        <div className="pt-6 text-center">
                          {/* Gift icon */}
                          <div
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
                              boxShadow: '0 4px 16px rgba(212,175,55,0.4)',
                            }}
                          >
                            <Gift className="w-6 h-6 text-white" strokeWidth={1.5} />
                          </div>
                          {/* Title */}
                          <h3
                            className="text-base font-bold mb-1.5"
                            style={{
                              background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            {(() => {
                              const v = promoTitle || 'להשלמת המראה';
                              if (lang === 'en' && v === 'להשלמת המראה') return 'Complete Your Look';
                              return v;
                            })()}
                          </h3>
                          {/* Description */}
                          <p
                            className="text-[11px] leading-relaxed mb-4 px-2"
                            style={{ color: '#4a3636' }}
                          >
                            {(() => {
                              const v = promoDescription || 'אהבת את הגבות החדשות? השלימי את המראה עם פיגמנט שפתיים בטכניקת אקוורל עדינה! קבלי 15% הנחה לטיפול נוסף כלקוחה קיימת.';
                              if (lang === 'en' && (v.startsWith('אהבת את הגבות') || v === 'אהבת את הגבות? הוסיפי הצללת אייליינר ב-15% הנחה')) return 'Love your new brows? Complete your look with a delicate watercolor lip blush! Enjoy 15% off your next treatment as an existing client.';
                              return v;
                            })()}
                          </p>
                          {/* CTA Button */}
                          <div
                            className="px-6 py-2.5 rounded-xl text-xs font-bold mx-auto inline-flex items-center gap-1.5"
                            style={{
                              background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
                              color: '#4a3636',
                              boxShadow: '0 4px 16px rgba(212,175,55,0.35)',
                            }}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            {(() => {
                              const v = promoButtonText || 'לפרטים ותיאום 💋';
                              if (lang === 'en' && (v === 'לפרטים ותיאום 💋' || v === 'הזמיני עכשיו')) return 'Details & Booking';
                              return v;
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground mt-3">
                  {lang === 'en' ? 'This is how clients see your promotion' : 'כך הלקוחות שלך יראו את ההטבה'}
                </p>
              </div>
            </div>


            {/* Notification & Automation Upgrade */}
            <NotificationUpgradeSection
              hasWhatsAppAutomation={hasWhatsAppAutomation}
              userTier={userTier}
            />

            {/* Card 2 — Account Settings */}
            <div className="bg-card rounded-3xl border border-border p-5 shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-5 h-5 text-accent" />
                <h2 className="font-light text-lg">{lang === 'en' ? 'Account Settings' : 'הגדרות חשבון'}</h2>
              </div>
              <div className="space-y-1">
                {/* Medical Form Toggle */}
                <div className="flex items-center justify-between py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="w-4 h-4 text-accent" />
                    <div>
                      <p className="text-sm font-medium">{t('artist.medical')}</p>
                      <p className="text-xs text-muted-foreground">{t('artist.medical.desc')}</p>
                    </div>
                  </div>
                  <button onClick={() => setMedicalForm(!medicalForm)}>
                    {medicalForm ? <ToggleRight className="w-8 h-8 text-accent" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                  </button>
                </div>

                {/* Notifications */}
                <button
                  onClick={() => { setActiveTab('push'); setSubScreen(null); }}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <Bell className="w-4 h-4 text-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{lang === 'en' ? 'Notifications' : 'התראות'}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasWhatsAppAutomation
                        ? (lang === 'en' ? '⚡ Full WhatsApp automation active' : '⚡ אוטומציית וואטסאפ מלאה פעילה')
                        : (lang === 'en' ? '🔔 Push notifications + manual WhatsApp' : '🔔 התראות Push + וואטסאפ ידני')}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>

                {/* WhatsApp Usage Tracker */}
                {hasWhatsAppAutomation && (
                  <div className="py-3 border-b border-border px-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MessageCircle className="w-4 h-4 text-accent" />
                      <p className="text-sm font-medium flex-1">{lang === 'en' ? 'Monthly Usage' : 'שימוש חודשי'}</p>
                      <span className="text-xs font-semibold text-foreground">42 / 200</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(42 / 200) * 100}%`,
                          background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {lang === 'en'
                        ? 'WhatsApp messages used this month. Extra packages available beyond quota.'
                        : 'הודעות וואטסאפ שנוצלו החודש. מעבר למכסה, ניתן לרכוש חבילות נוספות.'}
                    </p>
                  </div>
                )}
                {/* My Subscription & Upgrades */}
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <Crown className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium flex-1">{lang === 'en' ? 'My Subscription & Upgrades' : 'המנוי שלי ושדרוגים'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>
                {/* Bonuses */}
                <button
                  onClick={() => setActiveTab('bonuses')}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <Gift className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium flex-1">{lang === 'en' ? 'Bonuses & Rewards' : 'בונוסים ותגמולים'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>
                {/* Help Center */}
                <button
                  onClick={() => setShowHelpCenter(true)}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium flex-1">{lang === 'en' ? 'Help Center' : 'מרכז עזרה'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>
                {/* Refund Policy */}
                <button
                  onClick={() => navigate('/refund-policy')}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <ScrollText className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium flex-1">{lang === 'en' ? 'Cancellation & Refund Policy' : 'מדיניות ביטולים והחזרים'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>

                {/* Clinic Policy */}
                <button
                  onClick={() => setShowPolicyEditor(true)}
                  className="flex items-center gap-3 w-full py-3 border-b border-border text-start hover:bg-muted/50 rounded-lg px-1 transition-colors"
                >
                  <ScrollText className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium flex-1">{lang === 'en' ? 'Clinic Policy' : 'מדיניות הקליניקה'}</p>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>

                {/* Delete Account */}
                <button
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="flex items-center gap-3 w-full py-3 text-start hover:bg-destructive/5 rounded-lg px-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                  <p className="text-sm font-medium flex-1 text-destructive">{lang === 'en' ? 'Delete My Account' : 'מחיקת החשבון שלי'}</p>
                  <ChevronRight className="w-4 h-4 text-destructive/50" style={{ transform: lang === 'he' ? 'rotate(180deg)' : undefined }} />
                </button>

              </div>
            </div>

          </div>
        )}

        {/* ===== HELP CENTER ===== */}
        {showHelpCenter && (
          <div className="animate-fade-up" ref={(el) => { if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>
            <HelpCenter onClose={() => setShowHelpCenter(false)} />
          </div>
        )}

        {/* Footer – Terms & Privacy */}
        <footer className="border-t py-6 mt-8 text-center" style={{ borderColor: 'hsl(38 40% 88%)' }}>
          <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'hsl(0 0% 55%)' }}>
            <Link to="/terms" className="hover:underline transition-colors" style={{ color: '#FFFFFF' }}>
              {lang === 'en' ? 'Terms of Service' : 'תנאי שימוש'}
            </Link>
            <span>·</span>
            <Link to="/refund-policy" className="hover:underline transition-colors" style={{ color: '#FFFFFF' }}>
              {lang === 'en' ? 'Refund Policy' : 'מדיניות ביטולים'}
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:underline transition-colors" style={{ color: '#FFFFFF' }}>
              {lang === 'en' ? 'Privacy Policy' : 'מדיניות פרטיות'}
            </Link>
          </div>
        </footer>

        </div>{/* end scrollable content inner */}
      </div>{/* end scrollable content */}


      {/* ===== FIXED BOTTOM NAVIGATION BAR — Neumorphic Circles ===== */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-[450px] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          {[
            { id: 'upgrade' as const, icon: Crown, label: lang === 'en' ? 'Upgrade' : 'שדרוג', route: '/pricing' },
            { id: 'clients' as const, icon: Users, label: lang === 'en' ? 'Clients' : 'לקוחות', route: null },
            { id: 'calendar' as const, icon: Calendar, label: lang === 'en' ? 'Calendar' : 'יומן', route: null },
            { id: 'push' as const, icon: Clock, label: '!push', route: null },
            { id: 'home' as const, icon: Home, label: lang === 'en' ? 'Dashboard' : 'ראשי', route: null },
          ].map((tab) => {
            const isActive = tab.route ? false : activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.route) {
                    navigate(tab.route);
                  } else {
                    setActiveTab(tab.id as any);
                    setSubScreen(null);
                    setHealingJourneyClient(null);
                  }
                }}
                className="flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95"
                style={{
                  width: '60px',
                  height: '60px',
                  background: isActive
                    ? 'linear-gradient(145deg, #fff5f0, #f0dcd5)'
                    : 'linear-gradient(145deg, #ffffff, #f0e4e4)',
                  border: isActive ? '2px solid #D4AF37' : '1px solid #ecc6c6',
                  borderRadius: '50%',
                  boxShadow: isActive
                    ? '0 8px 30px rgba(212, 175, 55, 0.35), 0 4px 15px rgba(180, 110, 110, 0.2), inset 0 1px 3px rgba(255,255,255,0.7)'
                    : '8px 8px 20px rgba(180, 140, 140, 0.45), -8px -8px 20px rgba(255, 255, 255, 0.95), 0 6px 24px rgba(160, 120, 120, 0.2)',
                }}
              >
                <tab.icon
                  size={20}
                  strokeWidth={1.5}
                  style={{ color: isActive ? '#B8860B' : '#a88383' }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? '#4a3636' : '#8c6a6a',
                    fontFamily: "'Assistant', sans-serif",
                    lineHeight: 1,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Old Add Client modal removed – unified into NewClientDispatch */}

      {showDeclarationFor && (
        <HealthDeclaration clientName={showDeclarationFor} clientPhone={clients.find(c => c.name === showDeclarationFor)?.phone || ''} onComplete={(data) => saveDeclaration(showDeclarationFor, data)} onClose={() => setShowDeclarationFor(null)} logoUrl={logoUrl} />
      )}
      {viewDeclarationFor && (
        <DeclarationViewer
          clientName={viewDeclarationFor}
          clientPhone={clients.find(c => c.name === viewDeclarationFor)?.phone}
          declarationData={getDeclarationData(viewDeclarationFor)}
          dbDeclaration={dbDeclarations[viewDeclarationFor] || null}
          onClose={() => setViewDeclarationFor(null)}
          onSendReminder={(name, phone) => {
            sendHealthFormWhatsApp(name, phone);
            setViewDeclarationFor(null);
          }}
          logoUrl={logoUrl}
        />
      )}
      <UpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} featureId={upgradeFeatureId} />

      {/* Invoice Coming Soon Modal */}
      <Dialog open={showInvoiceComingSoon} onOpenChange={setShowInvoiceComingSoon}>
        <DialogContent className="max-w-sm text-center" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {lang === 'en' ? 'Coming Soon to Glow Push! 🚀' : 'בקרוב ב-Glow Push! 🚀'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed py-2">
            {lang === 'en'
              ? 'We are working on a direct integration with leading accounting systems, so you can issue receipts for your clients with a single click, right from the app. Stay tuned!'
              : 'אנחנו עובדות על חיבור ישיר למערכות הנהלת החשבונות המובילות, כדי שתוכלי להפיק קבלות ללקוחות שלך בלחיצת כפתור אחת, ישירות מהאפליקציה. יש למה לחכות!'}
          </p>
          <Button onClick={() => setShowInvoiceComingSoon(false)} className="w-full rounded-full mt-1">
            {lang === 'en' ? 'Got it' : 'הבנתי'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Client Confirmation Modal */}
      <Dialog open={!!deletingClient} onOpenChange={(open) => { if (!open) { setDeletingClient(null); setDeleteAlsoAppointments(false); } }}>
        <DialogContent className="max-w-sm" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">
              {lang === 'en' ? 'Delete Client' : 'מחיקת לקוחה'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed py-2">
            {lang === 'en'
              ? `Are you sure you want to delete ${deletingClient?.name || 'this client'}? This will also delete her treatment history and cannot be undone.`
              : `האם את בטוחה שברצונך למחוק את הלקוחה ${deletingClient?.name || ''}? פעולה זו תמחק גם את היסטוריית הטיפולים שלה ולא ניתנת לביטול.`}
          </p>
          <label className="flex items-center gap-2 py-1 cursor-pointer">
            <Checkbox
              checked={deleteAlsoAppointments}
              onCheckedChange={(v) => setDeleteAlsoAppointments(!!v)}
            />
            <span className="text-sm text-muted-foreground">
              {lang === 'en'
                ? 'Also delete future appointments from calendar?'
                : 'האם למחוק גם את התורים העתידיים שלה מהיומן?'}
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setDeletingClient(null); setDeleteAlsoAppointments(false); }} className="flex-1 rounded-full">
              {lang === 'en' ? 'Cancel' : 'ביטול'}
            </Button>
            <Button variant="destructive" onClick={confirmDeleteClient} className="flex-1 rounded-full">
              {lang === 'en' ? 'Delete' : 'מחיקה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Modal */}
      <Dialog open={!!editingClient} onOpenChange={(open) => { if (!open) setEditingClient(null); }}>
        <DialogContent className="max-w-sm rounded-3xl" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Pencil className="w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
              {lang === 'en' ? 'Edit Client' : 'עריכת פרטי לקוחה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{lang === 'en' ? 'Full Name' : 'שם מלא'}</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{lang === 'en' ? 'Phone' : 'טלפון'}</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} dir="ltr" inputMode="tel" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{lang === 'en' ? 'Email' : 'אימייל'}</Label>
              <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} dir="ltr" inputMode="email" type="email" maxLength={255} placeholder="example@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{lang === 'en' ? 'Birth Date' : 'תאריך לידה'}</Label>
              <Input value={editBirthDate} onChange={e => setEditBirthDate(e.target.value)} type="date" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{lang === 'en' ? 'Treatment / Notes' : 'סוג טיפול / הערות'}</Label>
              <Input value={editTreatment} onChange={e => setEditTreatment(e.target.value)} maxLength={100} />
            </div>
            <Button
              onClick={saveEditClient}
              disabled={!editName.trim() || savingClient}
              className="w-full btn-gold-cta"
            >
              {savingClient
                ? (lang === 'en' ? 'Saving...' : 'שומר...')
                : (lang === 'en' ? 'Save Changes' : 'שמור שינויים')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Treatment Note Modal */}
      <Dialog open={!!editingNote} onOpenChange={(open) => { if (!open) setEditingNote(null); }}>
        <DialogContent className="max-w-sm rounded-3xl" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Pencil className="w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
              {lang === 'en' ? 'Edit Treatment Record' : 'עריכת תיעוד טיפול'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingNote?.note.structured ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">🎯 {lang === 'en' ? 'Treatment Area' : 'אזור טיפול'}</Label>
                  <Input value={editNoteArea} onChange={e => setEditNoteArea(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">💧 {lang === 'en' ? 'Pigment Formula' : 'פיגמנט'}</Label>
                  <Input value={editNotePigment} onChange={e => setEditNotePigment(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">🔬 {lang === 'en' ? 'Needle Type' : 'סוג מחט'}</Label>
                  <Input value={editNoteNeedle} onChange={e => setEditNoteNeedle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">📝 {lang === 'en' ? 'Clinical Notes' : 'הערות קליניות'}</Label>
                  <textarea
                    value={editNoteClinical}
                    onChange={e => setEditNoteClinical(e.target.value)}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{lang === 'en' ? 'Treatment Notes' : 'הערות טיפול'}</Label>
                <textarea
                  value={editNoteRaw}
                  onChange={e => setEditNoteRaw(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  rows={4}
                />
              </div>
            )}
            <Button
              onClick={async () => {
                if (!editingNote) return;
                setSavingNote(true);
                await new Promise(r => setTimeout(r, 400));
                setTreatmentNotes(prev => {
                  const notes = prev[editingNote.clientName] || [];
                  const updated = notes.map(n => {
                    if (n.id !== editingNote.note.id) return n;
                    if (n.structured) {
                      return { ...n, structured: { treatmentArea: editNoteArea, pigmentFormula: editNotePigment, needleType: editNoteNeedle, clinicalNotes: editNoteClinical } };
                    }
                    return { ...n, rawText: editNoteRaw };
                  });
                  const result = { ...prev, [editingNote.clientName]: updated };
                  localStorage.setItem('gp-treatment-notes', JSON.stringify(result));
                  return result;
                });
                setSavingNote(false);
                setEditingNote(null);
                toast({ title: lang === 'en' ? 'Changes saved successfully! ✅' : 'השינויים נשמרו בהצלחה! ✅' });
              }}
              disabled={savingNote}
              className="w-full btn-gold-cta"
            >
              {savingNote ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {savingNote ? (lang === 'en' ? 'Saving...' : 'שומר...') : (lang === 'en' ? 'Save Changes' : 'שמור שינויים')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* HealthDeclarationPreview removed — preview now opens the live form URL */}

      {/* Referral Voucher Editor */}
      <ReferralVoucherEditor
        open={showVoucherEditor}
        onOpenChange={setShowVoucherEditor}
        artistProfileId={userProfileId || ''}
        lang={lang}
      />

      {/* Health Declaration Editor - Artist Override Dialog */}
      <HealthDeclarationEditor
        open={showHealthEditor}
        onClose={() => setShowHealthEditor(false)}
        artistProfileId={userProfileId}
      />

      {/* Clinic Policy Editor */}
      <ClinicPolicyEditor
        open={showPolicyEditor}
        onClose={() => setShowPolicyEditor(false)}
        artistProfileId={userProfileId}
      />

      {/* Digital Card Preview Modal */}
      {showDigitalCardPreview && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-[390px] h-[80vh] rounded-[2rem] overflow-hidden border-[3px] border-accent/40 shadow-2xl bg-background">
            <button
              onClick={() => setShowDigitalCardPreview(false)}
              className="absolute top-3 right-3 z-[110] w-9 h-9 rounded-full bg-foreground/70 backdrop-blur-sm flex items-center justify-center text-background hover:bg-foreground/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-full h-full overflow-y-auto">
              <DigitalCard
                embedded
                previewName={artistName || (lang === 'en' ? 'Business Name' : 'שם העסק')}
                previewPhone={artistPhone ? formatPhone(artistPhone) : '972508855329'}
                previewLogo={logoUrl}
                previewIg={instagramUrl}
                previewFacebook={facebookUrl}
                previewWaze={wazeAddress}
              />
            </div>
          </div>
          {/* Share button below the phone frame */}
          <button
            onClick={async () => {
              const BASE = 'https://glow-push-concierge.lovable.app/digital-card';
              const params = new URLSearchParams();
              if (artistName) params.set('name', artistName);
              const ph = artistPhone ? formatPhone(artistPhone) : '972508855329';
              params.set('phone', ph);
              if (logoUrl) params.set('logo', logoUrl);
              if (instagramUrl) params.set('ig', instagramUrl);
              if (facebookUrl) params.set('facebook', facebookUrl);
              if (wazeAddress) params.set('waze', wazeAddress);
              const qs = params.toString();
              const shareUrl = `${BASE}${qs ? `?${qs}` : ''}`;
              const shareTitle = lang === 'en' ? 'Digital Business Card' : 'כרטיס ביקור דיגיטלי';
              const shareText = lang === 'en' ? 'Hey! ✨ Check out my new digital studio card. All the ways to reach me and see my work — just one click away:' : 'היי אהובה! ✨ מזמינה אותך להציץ בכרטיס הדיגיטלי החדש של הסטודיו. כל הדרכים ליצור איתי קשר ולראות עבודות נמצאות כאן בקליק אחד:';
              try {
                if (navigator.share) {
                  await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                  toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                } else {
                  await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                  toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                }
              } catch (e: any) {
                if (e?.name !== 'AbortError') {
                  try {
                    await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
                    toast({ title: lang === 'en' ? 'Message and link copied successfully ✨' : 'ההודעה והקישור הועתקו בהצלחה ✨' });
                  } catch {
                    window.prompt(lang === 'en' ? 'Copy this link:' : 'העתיקי את הקישור:', shareUrl);
                  }
                }
              }
            }}
            className="preview-card-btn mt-4 flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636', boxShadow: '0 4px 18px rgba(212,175,55,0.35)', border: 'none' }}
          >
            <Share2 className="w-5 h-5" />
            {lang === 'en' ? 'Copy Card Link' : 'העתק קישור לכרטיס'}
          </button>
        </div>
        )}

      {/* Client Import Dialog */}
      <ClientImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        artistProfileId={userProfileId || ''}
        lang={lang}
        onImportComplete={() => fetchClients()}
      />

      {/* Birthday Wish Dialog */}
      <BirthdayWishDialog
        open={!!birthdayWishClient}
        onOpenChange={(open) => { if (!open) setBirthdayWishClient(null); }}
        clientName={birthdayWishClient?.name || ''}
        clientPhone={birthdayWishClient?.phone || ''}
        clientDbId={birthdayWishClient?.dbId}
        artistName={artistName || (lang === 'en' ? 'Your Artist' : 'האמנית שלך')}
        customTemplate={customTemplates.birthday}
        customTemplateEn={customTemplates.birthday_en}
      />

      {/* Renewal Message Dialog */}
      <RenewalMessageDialog
        open={!!renewalClient}
        onOpenChange={(open) => { if (!open) setRenewalClient(null); }}
        clientName={renewalClient?.name || ''}
        clientPhone={renewalClient?.phone || ''}
        clientDbId={renewalClient?.dbId}
        treatmentType={renewalClient?.treatment || ''}
        artistName={artistName || (lang === 'en' ? 'Your Artist' : 'האמנית שלך')}
        customTemplate={customTemplates.renewal}
        customTemplateEn={customTemplates.renewal_en}
      />

      {/* Message Template Editor Dialog */}
      <Dialog open={showTemplateEditor} onOpenChange={setShowTemplateEditor}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right font-serif">
              {lang === 'en' ? 'Edit Message Templates' : 'עריכת תבניות הודעה'}
            </DialogTitle>
          </DialogHeader>
          {userProfileId && (
            <MessageTemplateSettings
              artistProfileId={userProfileId}
              lang={lang}
              onTemplatesLoaded={setCustomTemplates}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New Client Dispatch Center */}
      <NewClientDispatch
        open={dispatchOpen}
        onClose={() => { setDispatchOpen(false); setDispatchPrefill(null); }}
        artistName={artistName}
        artistPhone={artistPhone}
        logoUrl={logoUrl}
        origin={origin}
        artistProfileId={userProfileId}
        formatPhone={formatPhone}
        sentPhones={clients.map(c => c.phone).filter(Boolean)}
        prefill={dispatchPrefill}
        onClientCreated={async ({ name, phone, treatment, link }) => {
          // Client is already saved to DB by NewClientDispatch, just refresh the list
          await fetchClients();
        }}
        onFillHere={(cName, cTreatment) => {
          setClientName(cName);
          setTreatmentType(cTreatment);
          setShowDeclarationFor(cName);
        }}
      />

      {/* ===== CLIENT PAGE PREVIEW MODAL ===== */}
      <Dialog open={clientPreviewOpen} onOpenChange={setClientPreviewOpen}>
        <DialogContent className="max-w-md p-0 bg-transparent border-none shadow-none [&>button]:hidden">
          <div className="flex flex-col items-center gap-4">
            {/* Phone frame */}
            <div
              className="relative w-[340px] h-[620px] rounded-[2.5rem] overflow-hidden"
              style={{
                border: '6px solid hsl(38 55% 62%)',
                boxShadow: '0 20px 60px -10px hsla(0,0%,0%,0.35), inset 0 0 0 2px hsl(40 50% 72% / 0.4)',
                background: 'hsl(350 50% 93%)',
              }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 rounded-b-2xl z-10" style={{ background: 'hsl(38 55% 62%)' }} />
              {/* Iframe */}
              <iframe
                src={`${window.location.origin}/client?name=${encodeURIComponent(lang === 'en' ? 'Dana Example' : 'דנה לדוגמה')}&treatment=eyebrows&start=${new Date().toISOString().split('T')[0]}&artist_id=${encodeURIComponent(userProfileId || '')}`}
                className="w-full h-full border-none"
                title="Client page preview"
              />
            </div>
            {/* Close button */}
            <button
              onClick={() => setClientPreviewOpen(false)}
              className="px-6 py-2.5 rounded-full text-sm font-medium transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))',
                color: '#fff',
                border: '1px solid hsl(38 40% 50%)',
                boxShadow: '0 4px 16px hsl(38 55% 62% / 0.3)',
              }}
            >
              {lang === 'en' ? '✕ Close Preview' : '✕ סגירת תצוגה מקדימה'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userProfileId={userProfileId}
        currentLogoUrl={logoUrl}
        currentName={artistName}
        currentPhone={artistPhone}
        onProfileUpdated={fetchProfileId}
      />

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteAccountConfirm} onOpenChange={setShowDeleteAccountConfirm}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {lang === 'en' ? 'Delete Account' : 'מחיקת חשבון'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {lang === 'en'
              ? 'This will permanently delete your account and ALL associated data including clients, health declarations, images, and settings. This action cannot be undone.'
              : 'פעולה זו תמחק לצמיתות את החשבון שלך ואת כל הנתונים הקשורים – לקוחות, הצהרות בריאות, תמונות והגדרות. לא ניתן לבטל פעולה זו.'}
          </p>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setShowDeleteAccountConfirm(false)}
              disabled={deletingAccount}
            >
              {lang === 'en' ? 'Cancel' : 'ביטול'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-full"
              disabled={deletingAccount}
              onClick={async () => {
                setDeletingAccount(true);
                try {
                  const { error } = await supabase.functions.invoke('delete-account');
                  if (error) throw error;
                  await supabase.auth.signOut();
                  localStorage.clear();
                  window.location.href = '/marketing';
                } catch (err: any) {
                  toast({ title: lang === 'en' ? 'Failed to delete account' : 'מחיקת החשבון נכשלה', description: err?.message, variant: 'destructive' });
                  setDeletingAccount(false);
                }
              }}
            >
              {deletingAccount ? '...' : (lang === 'en' ? 'Delete Forever' : 'מחיקה לצמיתות')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Tour */}
      <WelcomeTour
        open={showWelcomeTour}
        onClose={() => setShowWelcomeTour(false)}
        lang={lang}
      />

    </div>
  );
};

export default ArtistDashboard;
