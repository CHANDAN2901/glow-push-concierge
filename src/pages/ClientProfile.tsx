import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Phone, MessageCircle, Instagram, Heart, Camera, FileText,
  PenLine, Calendar, ChevronRight, User, Sparkles, ArrowUp,
  LifeBuoy, HelpCircle, Eye, Send, Play, Mic, Bell,
  ShieldCheck, AlertTriangle, AlertCircle, ScrollText,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import PremiumPolicySwitch from '@/components/PremiumPolicySwitch';
import DeclarationViewer from '@/components/DeclarationViewer';
import { useHealthQuestions } from '@/hooks/useHealthQuestions';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

import ClientSharedGallery from '@/components/ClientSharedGallery';
import { useClientGallery } from '@/hooks/useClientGallery';
import { DualPhotoGallery } from '@/components/DualPhotoGallery';
import ClientPhotoTimeline from '@/components/ClientPhotoTimeline';
import HealingPhotoGallery from '@/components/HealingPhotoGallery';
import { useI18n } from '@/lib/i18n';
import { STUDIO_NAME } from '@/lib/branding';
import { supabase } from '@/integrations/supabase/client';
import { useAftercareTemplates } from '@/hooks/useAftercareTemplates';
import InstallBanner from '@/components/InstallBanner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { subscribeToPush } from '@/lib/push-utils';
import { extractEdgeFunctionError, isPushSubscriptionExpired } from '@/lib/edge-function-errors';

/* ── theme tokens ── */
const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';
const GOLD_BG_LIGHT = 'rgba(212, 175, 55, 0.08)';
const HEADING_COLOR = 'hsl(0 0% 0%)';
const BODY_COLOR = 'hsl(0 0% 25%)';

/* ── types ── */
interface ClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  treatment_date: string | null;
  treatment_type: string | null;
  artist_id: string;
}

interface HealthDeclRow {
  id: string;
  is_signed: boolean;
  created_at: string;
  form_data: any;
  signature_svg: string | null;
}

/* ── Test Push Button Component ── */
function TestPushButton({ clientId, clientName, lang }: { clientId: string; clientName: string; lang: string }) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const handleTestPush = async () => {
    setSending(true);
    try {
      // Check if there's an active push subscription for this client
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!subs || subs.length === 0) {
        toast({
          title: lang === 'en' ? 'No push subscription found for this client' : 'לא נמצא מנוי Push ללקוחה זו',
          description: lang === 'en'
            ? 'The client needs to open the recovery link and enable notifications first.'
            : 'הלקוחה צריכה לפתוח את קישור ההחלמה ולהפעיל התראות.',
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      const sub = subs[0];
      const { data: pushResult, error } = await supabase.functions.invoke('send-push', {
        body: {
          subscription: {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          title: 'בדיקת מערכת GlowPush 🔔',
          body: `היי ${clientName}, זו התראת ניסיון מהמערכת! ✨`,
          day: 1,
        },
      });

      if (error) {
        const details = await extractEdgeFunctionError(error);

        if (isPushSubscriptionExpired(details)) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          toast({
            title: lang === 'en' ? 'Subscription expired' : 'המנוי פג תוקף',
            description: lang === 'en'
              ? 'Client needs to re-open recovery link and enable notifications again.'
              : 'הלקוחה צריכה לפתוח מחדש את קישור ההחלמה ולהפעיל התראות מחדש.',
            variant: 'destructive',
          });
          setSending(false);
          return;
        }

        toast({
          title: lang === 'en' ? 'Push failed' : 'שליחה נכשלה',
          description: details.message,
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      if (pushResult && typeof pushResult === 'object' && 'success' in pushResult && !pushResult.success) {
        const message = (pushResult as any).error || (lang === 'en' ? 'Push delivery failed' : 'שליחת פוש נכשלה');
        toast({
          title: lang === 'en' ? 'Push failed' : 'שליחה נכשלה',
          description: message,
          variant: 'destructive',
        });
        setSending(false);
        return;
      }

      toast({
        title: lang === 'en' ? 'Test push sent! ✅' : 'התראת בדיקה נשלחה! ✅',
      });
    } catch (err: any) {
      const details = await extractEdgeFunctionError(err);
      console.error('[TestPush] Failed:', details);
      toast({
        title: lang === 'en' ? 'Push failed' : 'שליחה נכשלה',
        description: details.message || (lang === 'en' ? 'Unknown error' : 'שגיאה לא ידועה'),
        variant: 'destructive',
      });
    }
    setSending(false);
  };

  return (
    <button
      onClick={handleTestPush}
      disabled={sending}
      className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl text-white transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: GOLD_GRADIENT, color: '#4a3636' }}
    >
      {sending ? (
        <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {sending
        ? (lang === 'en' ? 'Sending...' : 'שולחת...')
        : (lang === 'en' ? 'Send Test Notification 🔔' : 'שלחי התראת בדיקה 🔔')}
    </button>
  );
}

/* ── Subscribe Push Button Component ── */
function SubscribePushButton({ clientId, clientName, artistProfileId, lang }: { clientId: string; clientName: string; artistProfileId: string; lang: string }) {
  const { toast } = useToast();
  const [subscribing, setSubscribing] = useState(false);
  const [hasExistingSub, setHasExistingSub] = useState(false);

  // Check if already subscribed in DB
  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('push_subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setHasExistingSub(true);
      });
  }, [clientId]);

  const handleSubscribe = async () => {
    setSubscribing(true);

    // If updating, delete old subscription first so we insert a fresh one
    if (hasExistingSub) {
      await supabase.from('push_subscriptions').delete().eq('client_id', clientId);
    }

    const result = await subscribeToPush({
      clientId,
      clientName,
      artistProfileId: artistProfileId || undefined,
    });

    if (result.success) {
      setHasExistingSub(true);
      toast({
        title: lang === 'en' ? 'Push subscription saved! ✅' : 'נרשמה לפושים בהצלחה ✅',
      });
    } else {
      toast({
        title: result.error || (lang === 'en' ? 'Subscription failed' : 'ההרשמה נכשלה'),
        variant: 'destructive',
      });
    }
    setSubscribing(false);
  };

  const buttonLabel = subscribing
    ? (lang === 'en' ? 'Subscribing...' : 'נרשמת...')
    : hasExistingSub
      ? (lang === 'en' ? 'Update Push Connection 🔄' : 'עדכני חיבור להתראות 🔄')
      : (lang === 'en' ? 'Subscribe to Notifications 🔔' : 'הירשמי לקבלת התראות 🔔');

  return (
    <button
      onClick={handleSubscribe}
      disabled={subscribing}
      className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 disabled:opacity-50"
      style={{
        border: `2px solid ${GOLD}`,
        color: GOLD_DARK,
        backgroundColor: hasExistingSub ? 'hsl(142 76% 36% / 0.08)' : GOLD_BG_LIGHT,
      }}
    >
      {subscribing ? (
        <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {buttonLabel}
    </button>
  );
}
// Wrapper to isolate gallery hook
function ClientProfileGallerySection({ resolvedClientId, resolvedArtistId }: { resolvedClientId: string; resolvedArtistId: string }) {
  const gallery = useClientGallery(resolvedClientId, resolvedArtistId);
  return (
    <SectionCard
      icon={<Camera className="w-5 h-5" style={{ color: GOLD }} />}
      title="הגלריה שלי 🖼️"
      delay="400"
    >
      <ClientSharedGallery clientId={resolvedClientId} artistId={resolvedArtistId} gallery={gallery} />
    </SectionCard>
  );
}

const ClientProfile = () => {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState('');
  const [isListening, setIsListening] = useState(false);
  const micRecognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListeningRef = useRef(false);

  // Params
  const clientName = searchParams.get('name') || '';
  const clientPhone = searchParams.get('phone') || '';
  const artistId = searchParams.get('artist_id') || '';
  const clientDbId = searchParams.get('client_id') || '';

  // DB state
  const [client, setClient] = useState<ClientRow | null>(null);
  const [healthDecl, setHealthDecl] = useState<HealthDeclRow | null>(null);
  const [loadingDecl, setLoadingDecl] = useState(true);

  // Journey state
  const { messages: aftercareMessages } = useAftercareTemplates();
  const [journeyActivated, setJourneyActivated] = useState(false);
  const [journeyStartDate, setJourneyStartDate] = useState<Date | null>(null);

  // Resolve phone for links
  const phone = client?.phone || clientPhone;
  const name = client?.full_name || clientName || (lang === 'en' ? 'Client' : 'לקוחה');
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const intlPhone = cleanPhone.startsWith('0') ? `972${cleanPhone.slice(1)}` : cleanPhone;

  const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const rawResolvedClientId = client?.id || clientDbId || clientName;
  // Sanitize: extract only the UUID portion (first 36 chars) if it starts with a UUID pattern
  const resolvedClientId = (() => {
    if (!rawResolvedClientId) return '';
    if (isUUID(rawResolvedClientId)) return rawResolvedClientId;
    // Try extracting UUID from beginning of string (handles concatenation bug)
    const match = rawResolvedClientId.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    return match ? match[1] : rawResolvedClientId;
  })();
  const resolvedArtistId = artistId || client?.artist_id || '';

  // Fetch client from DB
  useEffect(() => {
    if (!clientDbId && !clientName) return;

    const query = clientDbId
      ? supabase.from('clients').select('*').eq('id', clientDbId).single()
      : supabase.from('clients').select('*').eq('full_name', clientName).limit(1).maybeSingle();

    query.then(({ data }) => {
      if (data) setClient(data as ClientRow);
    });
  }, [clientDbId, clientName]);

  // Fetch health declaration
  useEffect(() => {
    const resolvedId = client?.id || clientDbId;
    if (!resolvedId) { setLoadingDecl(false); return; }

    supabase
      .from('health_declarations')
      .select('id, is_signed, created_at, form_data, signature_svg')
      .eq('client_id', resolvedId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setHealthDecl(data as HealthDeclRow | null);
        setLoadingDecl(false);
      });
  }, [client?.id, clientDbId]);

  const [includePolicyCP, setIncludePolicyCP] = useState(true);
  const [sendingHealthForm, setSendingHealthForm] = useState(false);

  const sendHealthDeclarationWhatsApp = async () => {
    if (!intlPhone || !resolvedArtistId) {
      toast({ title: lang === 'en' ? 'Cannot send secure link yet' : 'לא ניתן לשלוח קישור מאובטח כרגע', variant: 'destructive' });
      return;
    }

    const resolvedClientDbId = client?.id || clientDbId;
    if (!resolvedClientDbId) {
      toast({ title: lang === 'en' ? 'Client must be saved first' : 'יש לשמור את הלקוחה לפני השליחה', variant: 'destructive' });
      return;
    }

    setSendingHealthForm(true);
    try {
      const { data, error } = await supabase
        .from('form_links')
        .insert({
          artist_id: resolvedArtistId,
          client_name: name,
          client_phone: phone || null,
          include_policy: includePolicyCP,
          client_id: resolvedClientDbId,
          is_token_used: false,
        } as any)
        .select('code, form_token')
        .single();

      const token = (data as any)?.form_token as string | undefined;
      if (error || !data?.code || !token) {
        throw error || new Error('Failed to generate secure token');
      }

      const baseUrl = window.location.origin;
      const secureParams = new URLSearchParams({ client_id: resolvedClientDbId, token });
      const declLink = `${baseUrl}/f/${data.code}?${secureParams.toString()}`;

      const message = lang === 'en'
        ? (includePolicyCP
          ? `Hi ${name} 💛\nPlease review our clinic policy and fill out the health declaration before your appointment 🩺✨\n${declLink}`
          : `Hi ${name} 💛\nPlease fill out the health declaration before your appointment 🩺✨\n${declLink}`)
        : (includePolicyCP
          ? `היי ${name} 💛\nמצורף קישור לצפייה במדיניות הקליניקה ומילוי הצהרת בריאות לפני התור 🩺✨\n${declLink}`
          : `היי ${name} 💛\nבבקשה מלאי את הצהרת הבריאות לפני התור 🩺✨\n${declLink}`);

      window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`, '_blank');
      toast({ title: lang === 'en' ? 'Message sent successfully ✉️' : 'הודעה נשלחה בהצלחה ✉️' });
    } catch (err) {
      console.error('Failed to send secure health declaration link:', err);
      toast({ title: lang === 'en' ? 'Failed to create secure link' : 'שגיאה ביצירת קישור מאובטח', variant: 'destructive' });
    } finally {
      setSendingHealthForm(false);
    }
  };

  // Journey timeline calculation
  const journeyTimeline = useMemo(() => {
    if (!journeyActivated || !journeyStartDate) return [];
    return aftercareMessages.map((msg) => {
      const date = new Date(journeyStartDate);
      date.setDate(date.getDate() + msg.day);
      return {
        day: msg.day,
        label: lang === 'en' ? msg.labelEn : msg.label,
        date: date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
          weekday: 'short', day: 'numeric', month: 'short',
        }),
        isoDate: date.toISOString().split('T')[0],
        template: msg.template,
      };
    }).sort((a, b) => a.day - b.day);
  }, [journeyActivated, journeyStartDate, aftercareMessages, lang]);

  const activateJourney = () => {
    setJourneyStartDate(new Date());
    setJourneyActivated(true);
  };

  // ── Speech Recognition – native webkit only ──
  const toggleMic = () => {
    if (isListeningRef.current) {
      stopMic();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('הדפדפן שלך לא תומך בהקלטה');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      stream.getTracks().forEach(t => t.stop());

    const recognition = new SpeechRecognition();
      recognition.lang = 'he-IL';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setNotes(transcript);

        silenceTimerRef.current = setTimeout(() => {
          stopMic();
        }, 3000);
      };

      recognition.onerror = (event: any) => {
        console.error('ClientProfile mic error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          alert('כדי להקליט, יש לאשר גישה למיקרופון בהגדרות הדפדפן');
        }
        if (event.error !== 'no-speech') {
          stopMic();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current && micRecognitionRef.current) {
          try { micRecognitionRef.current.start(); } catch {}
        }
      };

      micRecognitionRef.current = recognition;
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        stopMic();
      }
    }).catch(() => {
      alert('כדי להקליט, יש לאשר גישה למיקרופון בהגדרות הדפדפן');
    });
  };

  const stopMic = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    micRecognitionRef.current?.stop();
    micRecognitionRef.current = null;
  };

  // Send specific aftercare message via WhatsApp
  const sendAftercareWhatsApp = (template: string) => {
    if (!intlPhone) return;
    const text = template
      .replace(/\[ClientName\]/g, name)
      .replace(/\[ArtistName\]/g, STUDIO_NAME);
    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Health status display
  const [showDeclViewer, setShowDeclViewer] = useState(false);
  const { questions: healthQuestions } = useHealthQuestions();
  const healthSigned = healthDecl?.is_signed ?? false;
  const healthDate = healthDecl?.created_at
    ? new Date(healthDecl.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')
    : null;

  // Compute traffic-light risk from form_data answers + questions
  const computedRiskLevel = useMemo(() => {
    if (!healthDecl?.form_data || !healthQuestions.length) return 'green';
    const answers: Record<string, boolean> = (healthDecl.form_data as any).answers || {};
    let worst: 'green' | 'yellow' | 'red' = 'green';
    for (const q of healthQuestions) {
      if (answers[q.id]) {
        if (q.risk_level === 'red') return 'red';
        if (q.risk_level === 'yellow') worst = 'yellow';
      }
    }
    return worst;
  }, [healthDecl, healthQuestions]);

  return (
    <div className="min-h-screen bg-background pb-28" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <span className="text-accent font-extralight text-lg tracking-widest">{STUDIO_NAME}</span>
          <span className="text-sm font-light text-muted-foreground">
            {lang === 'en' ? 'Client Profile' : 'פרופיל לקוחה'}
          </span>
        </div>
      </header>

      <div className="pt-20 max-w-md mx-auto px-4">
        {/* ── Profile Header Card ── */}
        <div
          className="rounded-3xl p-8 mb-6 text-center animate-fade-up opacity-0 bg-white"
          style={{ boxShadow: '0 4px 24px rgba(212, 175, 55, 0.15)' }}
        >
          <div className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4"
            style={{ border: `2px solid ${GOLD}`, backgroundColor: GOLD_BG_LIGHT }}
          >
            <User className="w-10 h-10" style={{ color: GOLD_DARK }} />
          </div>

          <h1 className="text-2xl font-bold tracking-wide mb-1" style={{ color: HEADING_COLOR }}>{name}</h1>
          <p className="text-sm font-light mb-1" style={{ color: BODY_COLOR }}>
            {phone && <span className="font-mono text-xs">{phone}</span>}
          </p>
          <p className="text-sm font-light mb-5" style={{ color: BODY_COLOR }}>
            {lang === 'en' ? 'Permanent Makeup Client' : 'לקוחת איפור קבוע'}
          </p>

          {/* Contact row */}
          <div className="flex items-center justify-center gap-4">
            <a href={`https://wa.me/${intlPhone}`} target="_blank" rel="noopener noreferrer"
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ border: `1.5px solid ${GOLD}`, backgroundColor: 'hsl(0 0% 100%)' }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: GOLD }} />
            </a>
            <a href={`tel:${phone}`}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ border: `1.5px solid ${GOLD}`, backgroundColor: 'hsl(0 0% 100%)' }}
            >
              <Phone className="w-5 h-5" style={{ color: GOLD }} />
            </a>
          </div>

          {/* Preview Client Page */}
          <button
            onClick={() => {
              const baseUrl = window.location.origin;
              const treatmentType = client?.treatment_type || 'eyebrows';
              const startDate = client?.treatment_date || new Date().toISOString().split('T')[0];
              const previewUrl = `${baseUrl}/c/${encodeURIComponent(resolvedClientId)}?name=${encodeURIComponent(name)}&treatment=${encodeURIComponent(treatmentType)}&start=${startDate}&artist_id=${encodeURIComponent(resolvedArtistId)}`;
              window.open(previewUrl, '_blank');
            }}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ border: `1.5px solid ${GOLD}`, color: GOLD_DARK, backgroundColor: GOLD_BG_LIGHT }}
          >
            <Eye className="w-4 h-4" />
            {lang === 'en' ? 'Preview Client Page' : 'תצוגה מקדימה 👁️'}
          </button>
        </div>

        {/* ── Finish Treatment CTA ── */}
        <FinishTreatmentCTA
          client={client}
          clientDbId={clientDbId}
          lang={lang}
          onTreatmentStarted={(updatedClient) => setClient(updatedClient)}
        />

        {/* ── Health Declaration ── */}
        <SectionCard
          icon={<FileText className="w-5 h-5" style={{ color: GOLD }} />}
          title={lang === 'en' ? 'Health Declaration' : 'הצהרת בריאות'}
          delay="100"
        >
          {loadingDecl ? (
            <span className="text-xs text-muted-foreground">{lang === 'en' ? 'Loading...' : 'טוען...'}</span>
          ) : !healthDecl ? (
            /* State A: Not submitted */
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{ background: GOLD_BG_LIGHT, color: GOLD_DARK }}>
                  ⏳ {lang === 'en' ? 'Pending' : 'ממתין'}
                </span>
              </div>
              {/* Policy toggle */}
              <div
                className="flex items-center justify-between gap-3 p-3 rounded-xl mb-3"
                style={{ background: 'rgba(212, 175, 55, 0.06)', border: '1px solid rgba(212, 175, 55, 0.2)' }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ScrollText className="w-4 h-4 flex-shrink-0" style={{ color: GOLD_DARK }} />
                  <label htmlFor="include-policy-cp" className="text-xs font-bold leading-snug cursor-pointer" style={{ color: GOLD_DARK }}>
                    {lang === 'en' ? 'Include Clinic Policy & Treatment Agreement' : 'צרפי גם את מדיניות הקליניקה והסכם הטיפול'}
                  </label>
                </div>
                <PremiumPolicySwitch
                  id="include-policy-cp"
                  checked={includePolicyCP}
                  onCheckedChange={setIncludePolicyCP}
                />
              </div>
              <button
                onClick={sendHealthDeclarationWhatsApp}
                disabled={sendingHealthForm}
                className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: GOLD_GRADIENT, color: '#4a3636' }}
              >
                <Send className="w-4 h-4" />
                {sendingHealthForm
                  ? (lang === 'en' ? 'Sending...' : 'שולחת...')
                  : (lang === 'en' ? 'Send Health Declaration via WhatsApp' : 'שלחי הצהרת בריאות בוואטסאפ')}
              </button>
            </>
          ) : (
            /* State B: Submitted */
            <>
              {/* Traffic light + status */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: computedRiskLevel === 'red' ? 'hsl(0 80% 95%)' : computedRiskLevel === 'yellow' ? 'hsl(45 80% 92%)' : 'hsl(142 60% 93%)',
                    border: `2px solid ${computedRiskLevel === 'red' ? '#ef4444' : computedRiskLevel === 'yellow' ? '#eab308' : '#22c55e'}`,
                  }}
                >
                  {computedRiskLevel === 'red' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : computedRiskLevel === 'yellow' ? (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: HEADING_COLOR }}>
                    {computedRiskLevel === 'red'
                      ? (lang === 'en' ? 'Medical Contraindication' : 'התוויית נגד רפואית')
                      : computedRiskLevel === 'yellow'
                        ? (lang === 'en' ? 'Requires Attention' : 'דורש תשומת לב')
                        : (lang === 'en' ? 'All Clear' : 'תקין — ללא ממצאים')}
                  </p>
                  <p className="text-xs" style={{ color: BODY_COLOR }}>
                    {healthSigned ? '✅ ' : ''}
                    {lang === 'en' ? 'Submitted' : 'הוגשה'} {healthDate}
                  </p>
                </div>
              </div>

              {/* View button */}
              <button
                onClick={() => setShowDeclViewer(true)}
                className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: GOLD_GRADIENT, color: '#4a3636' }}
              >
                <Eye className="w-4 h-4" />
                {lang === 'en' ? 'View Full Health Declaration' : 'צפייה בהצהרת הבריאות המלאה'}
              </button>
            </>
          )}
        </SectionCard>

        {/* Declaration Viewer Modal */}
        {showDeclViewer && healthDecl && (
          <DeclarationViewer
            clientName={name}
            clientPhone={phone}
            declarationData={healthDecl.form_data as any}
            dbDeclaration={{
              signature_svg: healthDecl.signature_svg,
              created_at: healthDecl.created_at,
              form_data: healthDecl.form_data,
            }}
            onClose={() => setShowDeclViewer(false)}
          />
        )}

        {/* ── Push Notifications ── */}
        <SectionCard
          icon={<Bell className="w-5 h-5" style={{ color: GOLD }} />}
          title={lang === 'en' ? '🔔 Push Notifications' : '🔔 התראות Push'}
          delay="150"
        >
          <SubscribePushButton clientId={resolvedClientId} clientName={name} artistProfileId={resolvedArtistId} lang={lang} />
          <div className="mt-3">
            <TestPushButton clientId={resolvedClientId} clientName={name} lang={lang} />
          </div>
        </SectionCard>

        {/* ── Healing Journey ── */}
        <SectionCard
          icon={<Calendar className="w-5 h-5" style={{ color: GOLD }} />}
          title={lang === 'en' ? 'Healing Journey' : 'מסע החלמה'}
          delay="200"
        >
          {!journeyActivated ? (
            <button
              onClick={activateJourney}
              className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl text-white transition-all hover:opacity-90"
              style={{ background: GOLD_GRADIENT, color: '#4a3636' }}
            >
              <Play className="w-4 h-4" />
              {lang === 'en' ? 'Activate Healing Journey' : 'הפעילי מסע החלמה'}
            </button>
          ) : (
            <div className="space-y-3">
              {journeyTimeline.map((step, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-background border border-border/30">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: GOLD_BG_LIGHT }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: HEADING_COLOR }}>
                      {step.label}
                    </p>
                    <p className="text-xs font-light" style={{ color: BODY_COLOR }}>
                      {lang === 'en' ? 'Day' : 'יום'} {step.day} — {step.date}
                    </p>
                  </div>
                  <button
                    onClick={() => sendAftercareWhatsApp(step.template)}
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
                    style={{ backgroundColor: GOLD_BG_LIGHT }}
                    title={lang === 'en' ? 'Send via WhatsApp' : 'שלחי בוואטסאפ'}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: GOLD_DARK }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Before & After Collage ── */}
        {resolvedClientId && (
          <SectionCard
            icon={<Sparkles className="w-5 h-5" style={{ color: GOLD }} />}
            title="קולאז׳ לפני / אחרי ✨"
            delay="280"
          >
            <DualPhotoGallery clientId={resolvedClientId} artistId={resolvedArtistId} />
          </SectionCard>
        )}

        {/* ── Photo Gallery ── */}
        {resolvedClientId && (
          <SectionCard
            icon={<Camera className="w-5 h-5" style={{ color: GOLD }} />}
            title={lang === 'en' ? 'Client Gallery' : '📸 גלריית הלקוחה'}
            delay="300"
          >
            <ClientPhotoTimeline clientId={resolvedClientId} artistId={resolvedArtistId} />
          </SectionCard>
        )}

        {/* ── Healing Photo Gallery ── */}
        {resolvedClientId && (
          <SectionCard
            icon={<Camera className="w-5 h-5" style={{ color: GOLD }} />}
            title="גלריית תמונות החלמה 🩹"
            delay="350"
          >
            <HealingPhotoGallery
              clientId={resolvedClientId}
              clientName={name}
              treatmentDate={client?.treatment_date}
              artistId={resolvedArtistId}
            />
          </SectionCard>
        )}

        {/* ── Shared Gallery (from DB) ── */}
        {resolvedClientId && (
          <ClientProfileGallerySection resolvedClientId={resolvedClientId} resolvedArtistId={resolvedArtistId} />
        )}

        {/* ── Personal Notes ── */}
        <SectionCard
          icon={<PenLine className="w-5 h-5" style={{ color: GOLD }} />}
          title={lang === 'en' ? 'Personal Notes' : 'הערות אישיות'}
          delay="400"
        >
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[100px] p-4 pr-14 rounded-2xl border border-border/30 bg-background text-sm font-light resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              style={{ color: BODY_COLOR }}
              placeholder={lang === 'en' ? 'Add notes about this client...' : 'הוסיפי הערות על הלקוחה...'}
            />
            <button
              onClick={toggleMic}
              className={`absolute top-3 ${lang === 'he' ? 'left-3' : 'right-3'} w-10 h-10 rounded-full flex items-center justify-center transition-all ${isListening ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: isListening ? 'rgba(239, 68, 68, 0.15)' : GOLD_BG_LIGHT,
              }}
              title={lang === 'en' ? (isListening ? 'Stop recording' : 'Dictate notes') : (isListening ? 'עצרי הקלטה' : 'הכתיבי הערות')}
            >
              <Mic className="w-5 h-5" style={{ color: isListening ? '#EF4444' : GOLD_DARK }} />
            </button>
          </div>
        </SectionCard>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] backdrop-blur-lg" style={{ background: 'hsla(0, 0%, 100%, 0.97)', boxShadow: '0 -1px 0 hsl(38 30% 88%), 0 -4px 24px -6px hsla(38, 30%, 60%, 0.1)' }}>
        <div className="max-w-md mx-auto px-2 pt-3 pb-4 grid grid-cols-3 gap-2">
          <a href="/artist"
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all hover:opacity-80 active:scale-[0.93]"
            style={{ color: 'hsl(38 40% 35%)' }}
          >
            <Heart className="w-5 h-5" strokeWidth={1.5} style={{ color: 'hsl(38 55% 62%)' }} />
            <span>{lang === 'en' ? 'Dashboard' : 'דשבורד'}</span>
          </a>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all hover:opacity-80 active:scale-[0.93]"
            style={{ color: 'hsl(38 40% 35%)' }}
          >
            <User className="w-5 h-5" strokeWidth={1.5} style={{ color: 'hsl(38 55% 62%)' }} />
            <span>{lang === 'en' ? 'Profile' : 'פרופיל'}</span>
          </button>
          <a href="#"
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-serif tracking-wide transition-all hover:opacity-80 active:scale-[0.93]"
            style={{ color: 'hsl(38 40% 35%)' }}
          >
            <HelpCircle className="w-5 h-5" strokeWidth={1.5} style={{ color: 'hsl(38 55% 62%)' }} />
            <span>{lang === 'en' ? 'Help' : 'עזרה'}</span>
          </a>
        </div>
        <InstallBanner />
      </div>
    </div>
  );
};

/* ── Reusable Section Card ── */
function SectionCard({ icon, title, delay, children }: {
  icon: React.ReactNode; title: string; delay: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl p-6 mb-6 animate-fade-up opacity-0 border border-border/20 bg-white"
      style={{ boxShadow: '0 2px 16px hsl(0 0% 0% / 0.04)', animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: GOLD_BG_LIGHT }}
        >{icon}</div>
        <h2 className="font-bold text-xl tracking-wide" style={{ color: 'hsl(0 0% 5%)' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default ClientProfile;
