import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// SECURITY: Authenticate the request - only admins should generate VAPID keys
async function authenticateRequest(req: Request): Promise<{ userId: string; role: string } | null> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    return {
      userId: user.id,
      role: profile?.role || "user",
    };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Require authentication - only superadmins should generate VAPID keys
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Only administrators can generate VAPID keys." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Only allow superadmins to generate new VAPID keys
  if (auth.role !== "superadmin") {
    return new Response(
      JSON.stringify({ error: "Access denied. Only super administrators can generate VAPID keys." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[generate-vapid-keys] Admin access granted:", auth.userId);

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    // Export public key as raw (uncompressed point)
    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw);

    // Export private key as JWK to get the 'd' parameter
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const privateKeyBase64Url = privateKeyJwk.d!;

    return new Response(
      JSON.stringify({
        publicKey: publicKeyBase64Url,
        privateKey: privateKeyBase64Url,
        instructions: "Save publicKey as VAPID_PUBLIC_KEY and privateKey as VAPID_PRIVATE_KEY in your secrets."
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
