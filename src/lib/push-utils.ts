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
 * Detect the runtime environment so we can fail fast with an actionable message
 * instead of a cryptic "AbortError: push service error" deep inside subscribe().
 */
function detectPushEnvironment(): { isIOS: boolean; isStandalone: boolean; inAppBrowser: boolean } {
  const ua = navigator.userAgent || '';
  // iPadOS reports as MacIntel but has touch points; a real Mac has maxTouchPoints === 0.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (navigator as any).standalone === true;
  // Strong signals only — Facebook/Instagram WebViews and generic Android WebViews ("; wv)")
  // genuinely cannot register for web push. Avoid false positives on real browsers.
  const inAppBrowser = /FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(ua);
  return { isIOS, isStandalone, inAppBrowser };
}

/**
 * Unregister any leftover service workers that are NOT our push SW.
 * A stale SW from an earlier visit (old Workbox/custom-sw kill-switch) is a common
 * cause of mobile-only "Registration failed - push service error" on re-subscribe.
 */
async function cleanupStaleServiceWorkers(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const scriptURL =
        reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (scriptURL && !scriptURL.endsWith('/push-sw.js')) {
        console.log('[Push] Unregistering stale service worker:', scriptURL);
        await reg.unregister();
      }
    }
  } catch (e) {
    console.warn('[Push] Stale SW cleanup failed (non-fatal):', e);
  }
}

/**
 * Subscribe with retry — "AbortError: push service error" is frequently transient
 * (the browser's registration call to FCM/APNs times out or rate-limits). One shot
 * gives up too easily; a few backoff retries turns many failures into successes.
 */
async function subscribeWithRetry(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array,
  attempts = 3,
): Promise<PushSubscription> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (e: any) {
      lastErr = e;
      // Only retry the transient push-service error; rethrow real config errors immediately.
      if (e?.name !== 'AbortError') throw e;
      console.warn(`[Push] subscribe attempt ${i + 1}/${attempts} failed (AbortError) — retrying...`);
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Ensure the push-capable service worker is registered and active.
 * All other SW files in /public are kill-switches, so we register push-sw.js explicitly.
 */
async function getActiveSWRegistration(): Promise<ServiceWorkerRegistration> {
  // Remove any leftover/conflicting service workers before registering ours.
  await cleanupStaleServiceWorkers();

  console.log('[Push] Registering push service worker...');
  const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  console.log('[Push] SW registered, scope:', reg.scope);

  // Wait for the SW to become active (handles install → activate lifecycle)
  if (reg.installing || reg.waiting) {
    await new Promise<void>((resolve) => {
      const sw = reg.installing || reg.waiting;
      if (!sw) { resolve(); return; }
      sw.addEventListener('statechange', function onStateChange() {
        if (sw.state === 'activated') {
          sw.removeEventListener('statechange', onStateChange);
          resolve();
        }
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
    if (!('serviceWorker' in navigator)) {
      return { success: false, error: 'הדפדפן לא תומך ב-Service Worker' };
    }
    if (!('PushManager' in window)) {
      return { success: false, error: 'הדפדפן לא תומך ב-PushManager' };
    }
    if (!('Notification' in window)) {
      return { success: false, error: 'הדפדפן לא תומך בהתראות (Notification API missing)' };
    }

    // 0. Environment guard — fail fast with an actionable message instead of a cryptic
    //    "push service error" that the browser throws deep inside subscribe().
    const env = detectPushEnvironment();
    console.log('[Push] Environment:', env);
    if (env.inAppBrowser) {
      return {
        success: false,
        error:
          'לא ניתן להפעיל התראות מתוך דפדפן מובנה (וואטסאפ/אינסטגרם). יש לפתוח את הקישור ב-Chrome או Safari ולנסות שוב.',
      };
    }
    if (env.isIOS && !env.isStandalone) {
      return {
        success: false,
        error:
          'באייפון יש להוסיף את האפליקציה למסך הבית (שיתוף → הוסף למסך הבית) ולפתוח אותה משם כדי להפעיל התראות.',
      };
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

    const normalizedVapidKey = vapidPublicKey.trim();
    if (!isLikelyVapidPublicKey(normalizedVapidKey)) {
      return {
        success: false,
        error: `מפתח VAPID לא תקין בשרת (אורך: ${normalizedVapidKey.length}). יש לעדכן את מפתחות ההתראות ב-Lovable Cloud.`,
      };
    }

    // Verify the decoded key is exactly 65 bytes (uncompressed P-256 point).
    // If the VAPID key was stored with standard base64 chars (+/=) instead of base64url (-_),
    // the edge function strips them and corrupts the key to a wrong byte length.
    try {
      const decodedKey = urlBase64ToUint8Array(normalizedVapidKey);
      console.log('[Push] Decoded VAPID key length (bytes):', decodedKey.length, '(should be 65)');
      if (decodedKey.length !== 65) {
        return {
          success: false,
          error: `מפתח VAPID לא תקין — נדרשים 65 בייט, התקבלו ${decodedKey.length}. יש לאפס את מפתחות VAPID בסופאבייס.`,
        };
      }
    } catch (decodeErr: any) {
      return { success: false, error: `שגיאת פענוח מפתח VAPID: ${decodeErr.message}` };
    }

    // 4. Reuse existing browser subscription if the VAPID key matches — avoid unnecessary churn.
    //    Only force a new subscription if no existing one is found or the key has changed.
    console.log('[Push] Checking for existing browser subscription...');
    let subscription: PushSubscription;
    try {
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        // Compare the applicationServerKey stored in the existing subscription to the current VAPID key.
        // If they match, reuse it — no need to unsubscribe.
        const existingKeyBytes = existingSub.options?.applicationServerKey
          ? new Uint8Array(existingSub.options.applicationServerKey as ArrayBuffer)
          : null;
        const currentKeyBytes = urlBase64ToUint8Array(normalizedVapidKey);
        const keysMatch = existingKeyBytes &&
          existingKeyBytes.length === currentKeyBytes.length &&
          existingKeyBytes.every((b, i) => b === currentKeyBytes[i]);

        if (keysMatch) {
          console.log('[Push] Reusing existing subscription (VAPID key unchanged):', existingSub.endpoint);
          subscription = existingSub;
        } else {
          console.log('[Push] VAPID key changed — unsubscribing old subscription...');
          await existingSub.unsubscribe();
          subscription = await subscribeWithRetry(registration, currentKeyBytes);
          console.log('[Push] New subscription created after key change:', subscription.endpoint);
        }
      } else {
        console.log('[Push] No existing subscription — creating new one...');
        const applicationServerKey = urlBase64ToUint8Array(normalizedVapidKey);
        subscription = await subscribeWithRetry(registration, applicationServerKey);
        console.log('[Push] New push subscription created:', subscription.endpoint);
      }
    } catch (subErr: any) {
      console.error('[Push] pushManager.subscribe failed:', subErr);
      // AbortError after retries means the browser couldn't register with its push
      // service (FCM/APNs) — not a code/key problem. Give the user a next step.
      if (subErr?.name === 'AbortError') {
        return {
          success: false,
          error:
            'הדפדפן נכשל ברישום לשירות ההתראות. נסו לרענן את הדף ולנסות שוב, או לפתוח ב-Chrome/Safari. (push service error)',
        };
      }
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

    // 6. Delete any existing DB record for this endpoint only — after we have a valid subscription.
    //    This prevents a gap where the old record is deleted but the new insert hasn't happened yet.
    console.log('[Push] Removing old DB record for this endpoint...');
    await supabase.from('push_subscriptions').delete().eq('endpoint', subJson.endpoint!);

    // 7. Save to Supabase
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

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .insert(insertPayload);

    if (dbError) {
      console.error('[Push] Supabase insert error:', dbError);
      return { success: false, error: `שגיאת שמירה בDB: ${dbError.message} (code: ${dbError.code})` };
    }

    console.log('[Push] Insert completed successfully');

    // 8. Mark client as push opted in via security definer function
    console.log('[Push] Marking client as push opted in...');
    const { error: updateErr } = await supabase.rpc('mark_client_push_opted_in', { p_client_id: cleanClientId });
    if (updateErr) {
      console.error('[Push] Failed to update push_opted_in:', updateErr.message);
      // Roll back the subscription record so the toggle doesn't show as ON with a broken state
      await supabase.from('push_subscriptions').delete().eq('endpoint', subJson.endpoint!);
      return { success: false, error: `שגיאה בהפעלת התראות: ${updateErr.message}` };
    }

    console.log('[Push] ✅ Push subscription saved successfully!');
    return { success: true };
  } catch (err: any) {
    console.error('[Push] Subscription flow error:', err);
    return { success: false, error: `שגיאה כללית: ${err.message || 'שגיאה לא ידועה'}` };
  }
}
