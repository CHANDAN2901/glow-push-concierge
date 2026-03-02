import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rawKey = Deno.env.get('VAPID_PUBLIC_KEY');
  if (!rawKey) {
    return new Response(
      JSON.stringify({ error: 'VAPID_PUBLIC_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Strip accidental whitespace/quotes/control chars
  const vapidPublicKey = rawKey.replace(/[^A-Za-z0-9\-_]/g, '');

  console.log('[get-vapid-key] Cleaned key length:', vapidPublicKey.length, 'first10:', vapidPublicKey.substring(0, 10));

  return new Response(
    JSON.stringify({ publicKey: vapidPublicKey }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
