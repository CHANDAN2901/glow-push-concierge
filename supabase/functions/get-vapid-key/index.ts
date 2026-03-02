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

  // Strip any accidental quotes, whitespace, or newlines from the stored secret
  const vapidPublicKey = rawKey.replace(/['"\\]/g, '').trim();
  console.log('[get-vapid-key] Cleaned key length:', vapidPublicKey.length);

  return new Response(
    JSON.stringify({ publicKey: vapidPublicKey }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
