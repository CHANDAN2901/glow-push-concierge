import { supabase } from '@/integrations/supabase/client';

/**
 * Send a push notification via the server-side send-push edge function.
 * This uses Web Push Protocol (VAPID) to deliver notifications to mobile PWAs
 * even when the app is closed or installed as a standalone app.
 * 
 * This complements sendLocalPushNotification() - together they ensure
 * notifications work in all scenarios (foreground tab AND installed PWA).
 */
export async function sendServerPushNotification(opts: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if browser supports required APIs
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[ServerPush] Browser does not support push notifications');
      return { success: false, error: 'Push not supported' };
    }

    // Get current service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Get existing push subscription
    const subscription = await (registration as any).pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[ServerPush] No push subscription found - user not subscribed to push');
      return { success: false, error: 'No subscription' };
    }

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('[ServerPush] No authenticated session');
      return { success: false, error: 'Not authenticated' };
    }

    // Call the send-push edge function
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        subscription: subscription.toJSON(),
        title: opts.title,
        body: opts.body,
        icon: opts.icon || '/pwa-192.png',
        url: opts.url || '/artist',
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      console.error('[ServerPush] Edge function error:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.warn('[ServerPush] Push delivery failed:', data.error);
      return { success: false, error: data.error };
    }

    console.log('[ServerPush] ✅ Push notification sent successfully');
    return { success: true };
  } catch (err: any) {
    console.warn('[ServerPush] Failed to send push notification:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send auth-related notification (login/signup success or error).
 * Tries both local notification (immediate) and server push (PWA).
 * Failures are silent - this should never break the auth flow.
 */
export async function sendAuthNotification(opts: {
  type: 'login_success' | 'signup_success' | 'login_error' | 'signup_error';
  title: string;
  body: string;
}): Promise<void> {
  // Always try local notification (works for open browser tabs)
  const { sendLocalPushNotification } = await import('./sendLocalPushNotification');
  
  // Fire and forget - don't await, don't fail
  sendLocalPushNotification({
    title: opts.title,
    body: opts.body,
    url: '/artist',
  }).catch(err => console.warn('[AuthPush] Local notification failed:', err));

  // Also try server push (works for PWAs installed on mobile)
  sendServerPushNotification({
    title: opts.title,
    body: opts.body,
    url: '/artist',
  }).catch(err => console.warn('[AuthPush] Server push failed:', err));
}
