import { supabase } from '@/integrations/supabase/client';

/**
 * Convert a Base64-URL string to a Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const sanitized = base64String
    .replace(/[\s\r\n\t"'\\]/g, '')
    .trim();

  if (!/^[A-Za-z0-9\-_]+$/.test(sanitized)) {
    throw new Error('מפתח VAPID מכיל תווים לא חוקיים');
  }

  const padding = '='.repeat((4 - (sanitized.length % 4)) % 4);
  const base64 = (sanitized + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  let rawData: string;
  try {
    rawData = window.atob(base64);
  } catch {
    throw new Error('מפתח VAPID לא תקין (Base64 decode failed)');
  }

  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isLikelyVapidPublicKey(key: string): boolean {
  return /^[A-Za-z0-9\-_]+$/.test(key) && key.length >= 80 && key.length <= 120;
}

/**
 * Get the active service worker registration (VitePWA registers /sw.js which imports /custom-sw.js)
 */
async function getActiveSWRegistration(): Promise<ServiceWorkerRegistration> {
  console.log('[Push] Getting active service worker registration...');
  const reg = await navigator.serviceWorker.ready;
  console.log('[Push] SW ready, scope:', reg.scope);
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
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'הדפדפן לא תומך ב-Service Worker' };
    }
    if (!('PushManager' in window)) {
      return { success: false, error: 'הדפדפן לא תומך ב-PushManager' };
    }
    if (!('Notification' in window)) {
      return { success: false, error: 'הדפדפן לא תומך בהתראות (Notification API missing)' };
    }

    // 1. Request permission
    console.log('[Push] Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission result:', permission);
    if (permission !== 'granted') {
      return { success: false, error: `ההרשאה להתראות לא אושרה (status: ${permission})` };
    }

    // 2. Register custom SW
    let registration: ServiceWorkerRegistration;
    try {
      registration = await getActiveSWRegistration();
      console.log('[Push] SW active, ready for subscription');
    } catch (swErr: any) {
      console.error('[Push] SW registration failed:', swErr);
      return { success: false, error: `שגיאת Service Worker: ${swErr.message}` };
    }

    // 3. Fetch VAPID public key from edge function
    console.log('[Push] Fetching VAPID public key...');
    let vapidPublicKey: string;
    try {
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError) {
        console.error('[Push] VAPID fetch error:', vapidError);
        return { success: false, error: `שגיאת VAPID: ${vapidError.message || JSON.stringify(vapidError)}` };
      }
      if (!vapidData?.publicKey) {
        return { success: false, error: 'מפתח VAPID לא הוחזר מהשרת' };
      }
      vapidPublicKey = vapidData.publicKey;
      console.log('[Push] VAPID public key received, length:', vapidPublicKey.length);
    } catch (vapidErr: any) {
      console.error('[Push] VAPID exception:', vapidErr);
      return { success: false, error: `שגיאת VAPID: ${vapidErr.message}` };
    }

    // 4. Unsubscribe existing push subscription (forces new one with current VAPID key)
    console.log('[Push] Checking for existing subscription to unsubscribe...');
    try {
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        console.log('[Push] Found existing subscription, unsubscribing...');
        await existingSub.unsubscribe();
        console.log('[Push] Old subscription removed');
      }
    } catch (unsubErr: any) {
      console.warn('[Push] Failed to unsubscribe old:', unsubErr.message);
    }

    // 5. Subscribe to push with current VAPID key
    console.log('[Push] Subscribing to push manager...');
    let subscription: PushSubscription;
    try {
      const normalizedVapidKey = vapidPublicKey.trim();
      if (!isLikelyVapidPublicKey(normalizedVapidKey)) {
        return {
          success: false,
          error: `מפתח VAPID לא תקין בשרת (אורך: ${normalizedVapidKey.length}). יש לעדכן את מפתחות ההתראות ב-Lovable Cloud.`,
        };
      }

      const applicationServerKey = urlBase64ToUint8Array(normalizedVapidKey);
      subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      console.log('[Push] NEW push subscription created:', subscription.endpoint);
    } catch (subErr: any) {
      console.error('[Push] pushManager.subscribe failed:', subErr);
      return { success: false, error: `שגיאת הרשמה: ${subErr.message}` };
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'מידע ההרשמה חסר (endpoint/keys)' };
    }

    // 5. Sanitize clientId — extract UUID only (guard against concatenation bugs)
    const uuidMatch = opts.clientId.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const cleanClientId = uuidMatch ? uuidMatch[1] : opts.clientId;
    console.log('[Push] Clean clientId:', cleanClientId, '(original length:', opts.clientId.length, ')');

    // 6. Delete any existing subscription for this client (to avoid duplicates)
    console.log('[Push] Removing old subscriptions for client...');
    await supabase.from('push_subscriptions').delete().eq('client_id', cleanClientId);

    // 6. Save to Supabase
    console.log('[Push] Saving subscription to database...');
    const insertPayload = {
      client_name: opts.clientName || 'Unknown',
      endpoint: subJson.endpoint!,
      p256dh: subJson.keys!.p256dh!,
      auth_key: subJson.keys!.auth!,
      artist_profile_id: opts.artistProfileId || null,
      client_id: cleanClientId,
    };
    console.log('[Push] Insert payload:', JSON.stringify({ ...insertPayload, p256dh: '***', auth_key: '***' }));

    const { data: insertData, error: dbError } = await supabase.from('push_subscriptions').insert(insertPayload).select();

    if (dbError) {
      console.error('[Push] Supabase insert error:', dbError);
      return { success: false, error: `שגיאת שמירה בDB: ${dbError.message} (code: ${dbError.code})` };
    }

    console.log('[Push] Insert result:', insertData);

    // 8. Mark client as push opted in via security definer function
    console.log('[Push] Marking client as push opted in...');
    const { error: updateErr } = await supabase.rpc('mark_client_push_opted_in', { p_client_id: cleanClientId });
    if (updateErr) {
      console.warn('[Push] Failed to update push_opted_in:', updateErr.message);
      // Non-fatal — subscription was saved
    }

    console.log('[Push] ✅ Push subscription saved successfully!');
    return { success: true };
  } catch (err: any) {
    console.error('[Push] Subscription flow error:', err);
    return { success: false, error: `שגיאה כללית: ${err.message || 'שגיאה לא ידועה'}` };
  }
}
