import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Main terminal used for the iframe (VK mode charges + saves token in one step)
const TERMINAL_NAME = Deno.env.get("TRANZILA_TERMINAL_MAIN")!;
const TERMINAL_PW = Deno.env.get("TRANZILA_TERMINAL_MAIN_PW")!;

async function authenticateRequest(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { userId: user.id };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { planSlug, amountIls, lang, autoPayEnabled = true, isIsrael = false } = await req.json();

    if (!planSlug || !amountIls) {
      return new Response(JSON.stringify({ error: "planSlug and amountIls are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // For trial plan, read amount from app_settings so super admin can control it
    let effectiveAmount = amountIls;
    if (planSlug === "glow-trial") {
      const settingKey = isIsrael ? "trial_amount_il" : "trial_amount_global";
      const { data: setting } = await supabaseAdmin
        .from("app_settings")
        .select("value")
        .eq("key", settingKey)
        .maybeSingle();
      effectiveAmount = Number(setting?.value ?? (isIsrael ? 1 : 2));
    }

    console.log(`[create-payment-session] TERMINAL_NAME="${TERMINAL_NAME}" TERMINAL_PW_set=${!!TERMINAL_PW}`);

    if (!TERMINAL_NAME || !TERMINAL_PW) {
      console.error("[create-payment-session] Missing TRANZILA_TERMINAL_TOKENS or TRANZILA_TERMINAL_TOKENS_PW secrets");
      return new Response(JSON.stringify({ error: "Payment gateway not configured — secrets missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const appUrl = Deno.env.get("APP_URL") || "https://app.glowpush.co.il";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // Build Tranzilla iframe URL
    // tranmode=VK → charge now AND save token for future recurring charges
    // tranmode=V  → charge only, no token saved (one-time payment)
    const tranmode = autoPayEnabled ? "VK" : "V";
    const params = new URLSearchParams({
      supplier: TERMINAL_NAME,
      TranzilaPW: TERMINAL_PW,
      sum: String(effectiveAmount),
      currency: "1",         // 1 = ILS
      cred_type: "1",        // regular credit
      tranmode,
      lang: lang === 'en' ? 'en' : 'il',
      trButtonColor: "D4AF37",
      notify_url_address: `${supabaseUrl}/functions/v1/tranzilla-webhook`,
      success_url_address: `${appUrl}/payment-success?plan=${planSlug}&autopay=${autoPayEnabled}`,
      fail_url_address: `${appUrl}/payment-failed`,
      // Pass-through fields back to webhook
      remarks: planSlug,              // plan slug passed through
      remarks2: auth.userId,          // userId pass-through
      remarks3: String(autoPayEnabled), // autopay flag pass-through
    });

    // iframenew.php doesn't reliably support lang=en; use iframe.php for English
    const endpoint = lang === 'en' ? 'iframe.php' : 'iframenew.php';
    const iframeUrl = `https://direct.tranzila.com/${TERMINAL_NAME}/${endpoint}?${params.toString()}`;

    console.log(`[create-payment-session] userId=${auth.userId} plan=${planSlug} amount=₪${effectiveAmount}`);

    return new Response(JSON.stringify({ iframeUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[create-payment-session] Error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
