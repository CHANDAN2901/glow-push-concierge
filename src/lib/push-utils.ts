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
  // Strong signals only — in-app WebViews (WhatsApp/Instagram/Facebook/etc.) and generic
  // Android WebViews ("; wv)") genuinely cannot register for web push. Avoid false positives
  // on real browsers. Kept in sync with InstallBanner's isInAppBrowser().
  const inAppBrowser = /FBAN|FBAV|Instagram|WhatsApp|Line\/|Snapchat|Twitter|TikTok|MicroMessenger|; wv\)/i.test(ua);
  return { isIOS, isStandalone, inAppBrowser };
}

/**
 * On-device push diagnostics — surfaced in the UI when subscription fails so we (and the
 * client) can see the real environment state. iOS standalone PWAs can't easily be inspected
 * with devtools, so this turns "debugging blind" into a screenshot the user can send.
 */
export function getPushDiagnostics(): {
  isIOS: boolean;
  isStandalone: boolean;
  inAppBrowser: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: string;
} {
  const env = detectPushEnvironment();
  return {
    ...env,
    hasPushManager: typeof window !== 'undefined' && 'PushManager' in window,
    hasNotification: typeof window !== 'undefined' && 'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };
}

/**
 * Localized push messages (EN/HE). subscribeToPush historically returned Hebrew-only strings,
 * so English-page users saw Hebrew errors. Keyed strings keep both languages in one place.
 */
const PUSH_MSG = {
  noSW: { he: 'הדפדפן לא תומך ב-Service Worker', en: 'Your browser does not support Service Workers.' },
  noPush: { he: 'הדפדפן לא תומך בהתראות פוש.', en: 'Your browser does not support push notifications.' },
  noNotif: { he: 'הדפדפן לא תומך בהתראות (Notification API חסר).', en: 'Your browser does not support notifications (Notification API missing).' },
  inApp: { he: 'לא ניתן להפעיל התראות מתוך דפדפן מובנה (וואטסאפ/אינסטגרם). יש לפתוח את הקישור ב-Safari או Chrome ולנסות שוב.', en: 'Notifications can’t be enabled from an in-app browser (WhatsApp/Instagram). Open the link in Safari or Chrome and try again.' },
  iosInstall: { he: 'באייפון יש להוסיף את האפליקציה למסך הבית (שיתוף → הוסף למסך הבית) ולפתוח אותה משם כדי להפעיל התראות.', en: 'On iPhone, add the app to your Home Screen (Share → Add to Home Screen) and open it from there to enable notifications.' },
  iosReinstallSafari: { he: 'נראה שהאפליקציה נוספה למסך הבית מתוך דפדפן מובנה. פתחו את הקישור ישירות ב-Safari, ואז שיתוף → הוסף למסך הבית, והפעילו מהאייקון.', en: 'It looks like the app was added to the Home Screen from an in-app browser. Open the link directly in Safari, then Share → Add to Home Screen, and launch it from the icon.' },
  permDenied: { he: 'ההרשאה להתראות לא אושרה', en: 'Notification permission was not granted' },
  swError: { he: 'שגיאת Service Worker', en: 'Service Worker error' },
  vapidError: { he: 'שגיאת VAPID', en: 'VAPID error' },
  vapidMissing: { he: 'מפתח VAPID לא הוחזר מהשרת.', en: 'The server did not return a VAPID key.' },
  vapidInvalid: { he: 'מפתח VAPID לא תקין בשרת', en: 'Invalid VAPID key on the server' },
  vapidBytes: { he: 'מפתח VAPID לא תקין — נדרשים 65 בייט', en: 'Invalid VAPID key — 65 bytes required' },
  vapidDecode: { he: 'שגיאת פענוח מפתח VAPID', en: 'VAPID key decode error' },
  braveFcm: { he: 'דפדפן Brave חוסם התראות כברירת מחדל. פתחו brave://settings/privacy, הפעילו "Use Google services for push messaging", הפעילו מחדש את Brave ונסו שוב — או השתמשו ב-Chrome/Safari.', en: 'Brave blocks push by default. Open brave://settings/privacy, enable "Use Google services for push messaging", restart Brave, and try again — or use Chrome/Safari.' },
  pushServiceError: { he: 'הדפדפן נכשל ברישום לשירות ההתראות. רעננו את הדף ונסו שוב, או פתחו ב-Chrome/Safari.', en: 'Your browser couldn’t register with its push service. Refresh and try again, or open in Chrome/Safari.' },
  subscribeError: { he: 'שגיאת הרשמה', en: 'Subscription error' },
  subInfoMissing: { he: 'מידע ההרשמה חסר (endpoint/keys).', en: 'Subscription info is missing (endpoint/keys).' },
  clientCheckError: { he: 'שגיאה באימות רשומת הלקוחה', en: 'Error verifying the client record' },
  clientNotFound: { he: 'רשומת הלקוחה לא נמצאה — ייתכן שהקישור אינו תקין או שהלקוחה נמחקה. פתחו את הקישור האישי שנשלח אליכם ונסו שוב.', en: 'Client record not found — the link may be invalid or the client was deleted. Open the personal link sent to you and try again.' },
  dbError: { he: 'שגיאת שמירה ב-DB', en: 'Database save error' },
  optInError: { he: 'שגיאה בהפעלת התראות', en: 'Error enabling notifications' },
  general: { he: 'שגיאה כללית', en: 'General error' },
} as const;

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
  lang?: 'en' | 'he';
}): Promise<{ success: boolean; error?: string; code?: string }> {
  const lang: 'en' | 'he' = opts.lang === 'en' ? 'en' : 'he';
  const t = (k: keyof typeof PUSH_MSG) => PUSH_MSG[k][lang] ?? PUSH_MSG[k].he;
  try {
    // 0. Environment guard FIRST — must run before the generic "not supported" checks.
    //    On iOS Safari, PushManager is legitimately absent unless the app is installed to the
    //    Home Screen, so the generic check would otherwise return a dead-end "not supported"
    //    message instead of actionable "Add to Home Screen" guidance.
    const env = detectPushEnvironment();
    console.log('[Push] Environment:', env);
    if (env.inAppBrowser) {
      return { success: false, code: 'in-app-browser', error: t('inApp') };
    }
    if (env.isIOS && !env.isStandalone) {
      return { success: false, code: 'ios-needs-install', error: t('iosInstall') };
    }

    // 1. Generic browser-support checks (truly unsupported / desktop browsers).
    if (!('serviceWorker' in navigator)) {
      return { success: false, code: 'unsupported', error: t('noSW') };
    }
    if (!('PushManager' in window)) {
      // iOS paradox: standalone-looking but the Push API is missing → almost always means the
      // app was added to the Home Screen from a non-Safari browser (e.g. WhatsApp). Guide a
      // reinstall from Safari rather than the generic "unsupported" dead end.
      if (env.isIOS) {
        return { success: false, code: 'ios-push-unavailable', error: t('iosReinstallSafari') };
      }
      return { success: false, code: 'unsupported', error: t('noPush') };
    }
    if (!('Notification' in window)) {
      return { success: false, code: 'unsupported', error: t('noNotif') };
    }

    // 1. Request permission
    console.log('[Push] Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission result:', permission);
    if (permission !== 'granted') {
      return { success: false, code: 'permission-denied', error: `${t('permDenied')} (status: ${permission})` };
    }

    // 2. Register custom SW
    let registration: ServiceWorkerRegistration;
    try {
      registration = await getActiveSWRegistration();
      console.log('[Push] SW active, ready for subscription');
    } catch (swErr: any) {
      console.error('[Push] SW registration failed:', swErr);
      return { success: false, code: 'sw-error', error: `${t('swError')}: ${swErr.message}` };
    }

    // 3. Fetch VAPID public key from edge function
    console.log('[Push] Fetching VAPID public key...');
    let vapidPublicKey: string;
    try {
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('get-vapid-key');
      if (vapidError) {
        console.error('[Push] VAPID fetch error:', vapidError);
        return { success: false, code: 'vapid-error', error: `${t('vapidError')}: ${vapidError.message || JSON.stringify(vapidError)}` };
      }
      if (!vapidData?.publicKey) {
        return { success: false, code: 'vapid-error', error: t('vapidMissing') };
      }
      vapidPublicKey = vapidData.publicKey;
      console.log('[Push] VAPID public key received, length:', vapidPublicKey.length);
    } catch (vapidErr: any) {
      console.error('[Push] VAPID exception:', vapidErr);
      return { success: false, code: 'vapid-error', error: `${t('vapidError')}: ${vapidErr.message}` };
    }

    const normalizedVapidKey = vapidPublicKey.trim();
    if (!isLikelyVapidPublicKey(normalizedVapidKey)) {
      return {
        success: false,
        code: 'vapid-error',
        error: `${t('vapidInvalid')} (length: ${normalizedVapidKey.length}).`,
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
          code: 'vapid-error',
          error: `${t('vapidBytes')} (got ${decodedKey.length}).`,
        };
      }
    } catch (decodeErr: any) {
      return { success: false, code: 'vapid-error', error: `${t('vapidDecode')}: ${decodeErr.message}` };
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
      // AbortError after retries means the browser couldn't register with its push service
      // (FCM/APNs) — not a code/key problem. Brave disables Google's push service by default,
      // which produces this exact error; detect it and point the user to the setting.
      if (subErr?.name === 'AbortError') {
        let isBrave = false;
        try { isBrave = !!(navigator as any).brave && (await (navigator as any).brave.isBrave?.()); } catch {}
        return {
          success: false,
          code: isBrave ? 'brave-fcm-disabled' : 'push-service-error',
          error: isBrave ? t('braveFcm') : t('pushServiceError'),
        };
      }
      return { success: false, code: 'subscribe-error', error: `${t('subscribeError')}: ${subErr.message}` };
    }

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, code: 'sub-info-missing', error: t('subInfoMissing') };
    }

    // 5. Sanitize clientId — extract UUID only (guard against concatenation bugs)
    const uuidMatch = opts.clientId.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    const cleanClientId = uuidMatch ? uuidMatch[1] : opts.clientId;
    console.log('[Push] Clean clientId:', cleanClientId, '(original length:', opts.clientId.length, ')');

    // 5b. Verify the client row actually exists before inserting. push_subscriptions.client_id
    //     has a FK to clients(id); a well-formed-but-nonexistent id (stale link / deleted client)
    //     would otherwise fail the insert with a cryptic "23503 foreign key violation".
    const { data: clientRow, error: clientCheckErr } = await supabase
      .from('clients')
      .select('id')
      .eq('id', cleanClientId)
      .maybeSingle();
    if (clientCheckErr) {
      console.error('[Push] Client existence check failed:', clientCheckErr.message);
      return { success: false, code: 'client-check-error', error: `${t('clientCheckError')}: ${clientCheckErr.message}` };
    }
    if (!clientRow) {
      console.error('[Push] Client not found for id:', cleanClientId);
      return { success: false, code: 'client-not-found', error: t('clientNotFound') };
    }

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
      return { success: false, code: 'db-error', error: `${t('dbError')}: ${dbError.message} (code: ${dbError.code})` };
    }

    console.log('[Push] Insert completed successfully');

    // 8. Mark client as push opted in via security definer function
    console.log('[Push] Marking client as push opted in...');
    const { error: updateErr } = await supabase.rpc('mark_client_push_opted_in', { p_client_id: cleanClientId });
    if (updateErr) {
      console.error('[Push] Failed to update push_opted_in:', updateErr.message);
      // Roll back the subscription record so the toggle doesn't show as ON with a broken state
      await supabase.from('push_subscriptions').delete().eq('endpoint', subJson.endpoint!);
      return { success: false, code: 'optin-error', error: `${t('optInError')}: ${updateErr.message}` };
    }

    console.log('[Push] ✅ Push subscription saved successfully!');
    return { success: true };
  } catch (err: any) {
    console.error('[Push] Subscription flow error:', err);
    return { success: false, code: 'general-error', error: `${t('general')}: ${err.message || 'unknown'}` };
  }
}
