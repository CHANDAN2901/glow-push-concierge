import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildPushPayload,
  type PushSubscription,
  type PushMessage,
  type VapidKeys,
} from "https://esm.sh/@block65/webcrypto-web-push@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, title, body, icon, url, day } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build URL with day parameter for deep-linking
    const targetUrl = day
      ? `${url || '/client'}${(url || '/client').includes('?') ? '&' : '?'}day=${day}`
      : (url || '/client');

    const notificationPayload = JSON.stringify({
      title: title || 'Glow Push ✨',
      body: body || 'יש לך עדכון חדש!',
      icon: icon || '/pwa-192.png',
      data: { url: targetUrl, day: day || null },
    });

    // Build the push subscription object for the library
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    };

    // VAPID keys
    const vapid: VapidKeys = {
      subject: 'mailto:push@glowpush.app',
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    };

    // Build the message
    const message: PushMessage = {
      data: notificationPayload,
      options: {
        ttl: 86400,
        urgency: 'high',
      },
    };

    // Build encrypted payload with VAPID signing
    console.log('[send-push] Building encrypted push payload...');
    const pushRequest = await buildPushPayload(message, pushSubscription, vapid);

    // Send to push service
    console.log('[send-push] Sending to push endpoint:', subscription.endpoint);
    const response = await fetch(pushRequest);

    if (!response.ok) {
      const text = await response.text();
      console.error('[send-push] Push delivery failed:', response.status, text);
      return new Response(
        JSON.stringify({ error: 'Push delivery failed', status: response.status, details: text }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[send-push] ✅ Push delivered successfully');
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-push] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
