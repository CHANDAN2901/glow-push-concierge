import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HealthDeclaration from '@/components/HealthDeclaration';
import type { HealthDeclarationData } from '@/components/HealthDeclaration';
import { subscribeToPush } from '@/lib/push-utils';


const HealthDeclarationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientName = searchParams.get('name') || '';
  const clientPhone = searchParams.get('client_phone') || '';
  const logo = searchParams.get('logo') || '';
  const artistId = searchParams.get('artist_id') || '';
  const appointmentDate = searchParams.get('start') || '';
  const appointmentTime = searchParams.get('time') || '';
  const isPreview = searchParams.get('preview') === 'true';

  const [isArtist, setIsArtist] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setIsArtist(true);
    });
  }, []);

  const requestPushSubscription = async (clientId: string) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push not supported on this device');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Push permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn('VAPID public key not configured');
        return;
      }

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

      // Mark client as push opted in
      await supabase.from('clients').update({ push_opted_in: true }).eq('id', clientId);

      console.log('Push subscription stored for client:', clientId);
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

    // If client opted in for push notifications, use the new utility
    if (data.pushOptIn && result?.clientId) {
      console.log('[HealthDecl] Client opted in for push, subscribing...');
      const pushResult = await subscribeToPush({
        clientId: result.clientId,
        clientName: data.fullName || clientName,
        artistProfileId: artistId || undefined,
      });
      console.log('[HealthDecl] Push subscription result:', pushResult);
    }

    return result;
  };

  return (
    <div className="relative">
      {(isArtist || isPreview) && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-3 pointer-events-auto" style={{ background: 'linear-gradient(135deg, rgba(216,180,180,0.95), rgba(201,160,160,0.95))', boxShadow: '0 2px 12px rgba(216,180,180,0.4)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 cursor-pointer pointer-events-auto"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#fff' }}
          >
            ✕ {isPreview ? 'סגור תצוגה מקדימה' : 'חזרה לדשבורד'}
          </button>
          {isPreview && (
            <span className="text-xs font-bold tracking-wide" style={{ color: '#4a3636' }}>
              👁️ תצוגה מקדימה
            </span>
          )}
        </div>
      )}
      <HealthDeclaration
        clientName={clientName}
        clientPhone={clientPhone}
        logoUrl={logo}
        onComplete={handleComplete}
        onClose={() => {}}
        isPreview={isPreview}
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
      />
    </div>
  );
};

export default HealthDeclarationPage;
