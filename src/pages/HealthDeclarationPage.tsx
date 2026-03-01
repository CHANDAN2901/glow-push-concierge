import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import HealthDeclaration from '@/components/HealthDeclaration';
import type { HealthDeclarationData } from '@/components/HealthDeclaration';


const HealthDeclarationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientName = searchParams.get('name') || '';
  const clientPhone = searchParams.get('client_phone') || '';
  const logo = searchParams.get('logo') || '';
  const artistId = searchParams.get('artist_id') || '';
  const appointmentDate = searchParams.get('start') || '';
  const appointmentTime = searchParams.get('time') || '';

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

    // If client opted in for push notifications, request permission and store subscription
    if (data.pushOptIn && result?.clientId) {
      await requestPushSubscription(result.clientId);
    }

    return result;
  };

  return (
    <div className="relative">
      {isArtist && (
        <button
          onClick={() => navigate('/artist')}
          className="fixed top-4 right-4 z-50 bg-accent text-accent-foreground px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-accent/90 transition-colors"
        >
          חזרה לדשבורד ←
        </button>
      )}
      <HealthDeclaration
        clientName={clientName}
        clientPhone={clientPhone}
        logoUrl={logo}
        onComplete={handleComplete}
        onClose={() => {}}
        
        appointmentDate={appointmentDate}
        appointmentTime={appointmentTime}
      />
    </div>
  );
};

export default HealthDeclarationPage;
