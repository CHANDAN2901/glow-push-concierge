import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HealthDeclaration from '@/components/HealthDeclaration';
import type { HealthDeclarationData } from '@/components/HealthDeclaration';
import { subscribeToPush } from '@/lib/push-utils';
import ClinicPolicyAcknowledgment from '@/components/ClinicPolicyAcknowledgment';
import { useI18n } from '@/lib/i18n';

const HealthDeclarationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientName = searchParams.get('name') || '';
  const clientPhone = searchParams.get('client_phone') || '';
  const logo = searchParams.get('logo') || '';
  const artistId = searchParams.get('artist_id') || '';
  const treatmentType = searchParams.get('treatment') || '';
  const appointmentDate = searchParams.get('start') || '';
  const appointmentTime = searchParams.get('time') || '';
  const isPreview = searchParams.get('preview') === 'true';
  const includePolicy = searchParams.get('include_policy') === 'true';
  const token = searchParams.get('token') || searchParams.get('form_token') || '';
  const urlClientId = searchParams.get('client_id') || '';
  const { lang } = useI18n();

  const [isArtist, setIsArtist] = useState(false);
  const [policyAcknowledged, setPolicyAcknowledged] = useState(!includePolicy);

  // Token validation state
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setIsArtist(true);
    });
  }, []);

  // Validate form_token if present
  useEffect(() => {
    if (!formToken || isPreview) {
      setTokenChecked(true);
      setTokenValid(true);
      return;
    }

    const validate = async () => {
      const { data, error } = await supabase
        .from('form_links')
        .select('is_completed')
        .eq('code', formToken)
        .maybeSingle();

      if (error || !data) {
        setTokenValid(false);
      } else if ((data as any).is_completed) {
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
      setTokenChecked(true);
    };

    validate();
  }, [formToken, isPreview]);

  const requestPushSubscription = async (clientId: string) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const sub = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      const subJson = sub.toJSON();
      await supabase.from('push_subscriptions').insert({
        client_name: clientName || 'Unknown',
        endpoint: subJson.endpoint!,
        p256dh: subJson.keys?.p256dh || '',
        auth_key: subJson.keys?.auth || '',
        artist_profile_id: artistId || null,
        client_id: clientId,
      });
      await supabase.from('clients').update({ push_opted_in: true }).eq('id', clientId);
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  };

  const handleComplete = async (data: HealthDeclarationData) => {
    if (!artistId) {
      throw new Error('קישור לא תקין – חסר מזהה מטפלת. פני למטפלת לקבלת קישור חדש.');
    }
    const { data: result, error } = await supabase.functions.invoke('submit-health-declaration', {
      body: {
        artistProfileId: artistId,
        fullName: data.fullName,
        phone: data.phone,
        birthDate: data.birthDate || null,
        formData: {
          idNumber: data.idNumber,
          answers: data.answers,
          answerDetails: data.answerDetails,
          legalConsentAt: data.legalConsentAt,
          medicalConsentAt: data.medicalConsentAt,
        },
        signatureDataUrl: data.signatureDataUrl,
        formToken: formToken || null,
      },
    });
    if (error) {
      let msg = error.message || String(error);
      try {
        if (error.context?.body) {
          const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
          if (body?.error) msg = body.error;
        }
      } catch {}
      throw new Error(msg);
    }

    if (data.pushOptIn && result?.clientId) {
      const pushResult = await subscribeToPush({
        clientId: result.clientId,
        clientName: data.fullName || clientName,
        artistProfileId: artistId || undefined,
      });
    }

    if (!isPreview && result?.clientId) {
      const redirectParams = new URLSearchParams();
      redirectParams.set('client_id', result.clientId);
      redirectParams.set('name', data.fullName || clientName || 'לקוחה');
      redirectParams.set('start', appointmentDate || new Date().toISOString().split('T')[0]);
      if (treatmentType) redirectParams.set('treatment', treatmentType);
      if (artistId) redirectParams.set('artist_id', artistId);
      navigate(`/c/${result.clientId}?${redirectParams.toString()}`, { replace: true });
    }

    return result;
  };

  const handlePreviewExit = () => {
    if (isPreview) {
      navigate('/artist', { replace: true });
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/artist', { replace: true });
  };

  // Show loading while token is being validated
  if (!tokenChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">טוען...</div>
      </div>
    );
  }

  // Token already used — show "already completed" message
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center" dir="rtl">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)' }}>
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">הצהרת הבריאות מולאה בהצלחה</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            הצהרת הבריאות מולאה ונשמרה בהצלחה. לכל שינוי או עדכון, אנא פני למאפרת שלך.
          </p>
          <p className="text-xs text-muted-foreground">
            Health declaration was already submitted. For any changes, please contact your artist.
          </p>
        </div>
      </div>
    );
  }

  // Show policy acknowledgment first if included
  if (!policyAcknowledged && includePolicy && artistId) {
    return (
      <div className="relative">
        <ClinicPolicyAcknowledgment
          artistProfileId={artistId}
          lang={lang}
          onAcknowledge={() => setPolicyAcknowledged(true)}
        />
        {(isArtist || isPreview) && (
          <div className="fixed top-0 left-0 right-0 z-[120] flex items-center justify-between px-4 py-3 pointer-events-auto" style={{ background: 'linear-gradient(135deg, rgba(216,180,180,0.95), rgba(201,160,160,0.95))', boxShadow: '0 2px 12px rgba(216,180,180,0.4)', backdropFilter: 'blur(12px)' }}>
            <button
              onClick={handlePreviewExit}
              className="relative z-[121] flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-widest uppercase transition-all active:scale-95 cursor-pointer pointer-events-auto"
              style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#fff' }}
            >
              <span aria-hidden="true">✕</span>
              <span>{isPreview ? 'סגור תצוגה מקדימה' : 'חזרה לדשבורד'}</span>
            </button>
            {isPreview && (
              <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: '#B8860B' }}>
                👁️ תצוגה מקדימה
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <HealthDeclaration
        clientName={clientName}
        clientPhone={clientPhone}
        logoUrl={logo}
        onComplete={handleComplete}
        onClose={handlePreviewExit}
        isPreview={isPreview}
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
        artistId={artistId}
      />

      {(isArtist || isPreview) && (
        <div className="fixed top-0 left-0 right-0 z-[120] flex items-center justify-between px-4 py-3 pointer-events-auto" style={{ background: 'linear-gradient(135deg, rgba(216,180,180,0.95), rgba(201,160,160,0.95))', boxShadow: '0 2px 12px rgba(216,180,180,0.4)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={handlePreviewExit}
            className="relative z-[121] flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-widest uppercase transition-all active:scale-95 cursor-pointer pointer-events-auto"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#fff' }}
          >
            <span aria-hidden="true">✕</span>
            <span>{isPreview ? 'סגור תצוגה מקדימה' : 'חזרה לדשבורד'}</span>
          </button>
          {isPreview && (
            <span className="text-[11px] font-medium tracking-widest uppercase" style={{ color: '#B8860B' }}>
              👁️ תצוגה מקדימה
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthDeclarationPage;
