/**
 * Send a push notification using the Service Worker's showNotification API.
 * This is the ONLY method that works on mobile browsers (Android Chrome, iOS Safari).
 * 
 * `new Notification()` does NOT work on mobile — it only works in desktop foreground tabs.
 * `serviceWorkerRegistration.showNotification()` works everywhere including:
 *   - Mobile foreground
 *   - Mobile background
 *   - Desktop foreground & background
 *
 * This is fire-and-forget — errors are logged but never thrown.
 */
export async function sendLocalPushNotification(opts: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}) {
  try {
    // 1. Check notification permission
    if (!('Notification' in window)) {
      console.warn('[Push] Notification API not supported');
      return;
    }

    if (Notification.permission === 'default') {
      // Permission not yet asked — request it
      console.log('[Push] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permission denied:', permission);
        return;
      }
    } else if (Notification.permission !== 'granted') {
      console.warn('[Push] Permission not granted:', Notification.permission);
      return;
    }

    // 2. Get service worker registration
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service Worker not supported');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service Worker ready, showing notification...');

    // 3. Use showNotification on the SW registration (works on mobile!)
    await registration.showNotification(opts.title, {
      body: opts.body,
      icon: opts.icon || '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'glow-push-' + Date.now(), // unique tag prevents duplicates
      data: {
        url: opts.url || '/',
      },
    });

    console.log('[Push] ✅ Notification shown via ServiceWorker.showNotification()');
  } catch (err) {
    console.warn('[Push] sendLocalPushNotification failed:', err);
  }
}
