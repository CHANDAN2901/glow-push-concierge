import { supabase } from '@/integrations/supabase/client';

/**
 * Convert a Base64-URL string to a Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register the custom service worker for push notifications
 */
async function registerCustomSW(): Promise<ServiceWorkerRegistration> {
  console.log('[Push] Registering custom service worker...');
  const reg = await navigator.serviceWorker.register('/custom-sw.js');
  console.log('[Push] Custom SW registered, scope:', reg.scope);
  // Wait for it to be active
  if (!reg.active) {
    await new Promise<void>((resolve) => {
      const sw = reg.installing || reg.waiting;
      if (!sw) { resolve(); return; }
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve();
      });
    });
  }
  return reg;
}

/**
 * Full push subscription flow:
 * 1. Register custom SW
 * 2. Fetch VAPID public key from edge function
 * 3. Subscribe to push
 * 4. Save subscription to Supabase
 */
export async function subscribeToPush(opts: {
  clientId: string;
  clientName: string;
  artistProfileId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.error('[Push] Browser does not support push notifications');
      return { success: false, error: 'הדפדפן לא תומך בהתראות Push' };
    }

    // 1. Request permission
    console.log('[Push] Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission result:', permission);
    if (permission !== 'granted') {
      return { success: false, error: 'ההרשאה להתראות לא אושרה' };
    }

    // 2. Register custom SW
    const registration = await registerCustomSW();
    console.log('[Push] SW active, ready for subscription');

    // 3. Fetch VAPID public key from edge function
    console.log('[Push] Fetching VAPID public key...');
    const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
    if (vapidError || !vapidData?.publicKey) {
      console.error('[Push] Failed to fetch VAPID key:', vapidError);
      return { success: false, error: 'שגיאה בקבלת מפתח VAPID' };
    }
    console.log('[Push] VAPID public key received');

    // 4. Subscribe to push
    console.log('[Push] Subscribing to push manager...');
    const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);
    const subscription = await (registration as any).pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    console.log('[Push] Push subscription created:', subscription.endpoint);

    const subJson = subscription.toJSON();

    // 5. Save to Supabase
    console.log('[Push] Saving subscription to database...');
    const { error: dbError } = await supabase.from('push_subscriptions').insert({
      client_name: opts.clientName || 'Unknown',
      endpoint: subJson.endpoint!,
      p256dh: subJson.keys?.p256dh || '',
      auth_key: subJson.keys?.auth || '',
      artist_profile_id: opts.artistProfileId || null,
      client_id: opts.clientId,
    });

    if (dbError) {
      console.error('[Push] Supabase insert error:', dbError);
      return { success: false, error: `שגיאת שמירה: ${dbError.message}` };
    }

    // 6. Mark client as push opted in
    console.log('[Push] Marking client as push opted in...');
    await supabase.from('clients').update({ push_opted_in: true }).eq('id', opts.clientId);

    console.log('[Push] ✅ Push subscription saved successfully!');
    return { success: true };
  } catch (err: any) {
    console.error('[Push] Subscription flow error:', err);
    return { success: false, error: err.message || 'שגיאה לא ידועה' };
  }
}
