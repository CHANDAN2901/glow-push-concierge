import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const { planSlug, autoPayEnabled = true } = await req.json();

    if (!planSlug) {
      return new Response(JSON.stringify({ error: "planSlug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read ls_mode from app_settings
    const { data: setting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ls_mode")
      .single();

    const lsMode = setting?.value || "test";
    const apiKey = lsMode === "live"
      ? Deno.env.get("LS_API_KEY_LIVE")
      : Deno.env.get("LS_API_KEY_TEST");

    const storeId = Deno.env.get("LS_STORE_ID");

    // Read variant ID from pricing_plans DB (set by admin in dashboard)
    const { data: planRow } = await supabase
      .from("pricing_plans")
      .select("ls_variant_id_test, ls_variant_id_live, ls_variant_id_autopay_test, ls_variant_id_autopay_live")
      .eq("slug", planSlug)
      .single();

    // Use autopay (subscription) variant if opted in and configured, else one-time variant
    const autopayVariantId = lsMode === "live"
      ? planRow?.ls_variant_id_autopay_live
      : planRow?.ls_variant_id_autopay_test;

    const onetimeVariantId = lsMode === "live"
      ? planRow?.ls_variant_id_live
      : planRow?.ls_variant_id_test;

    const variantId = (autoPayEnabled && autopayVariantId) ? autopayVariantId : onetimeVariantId;

    if (!apiKey || !storeId || !variantId) {
      console.error(`[create-lemonsqueezy-checkout] Missing config — mode=${lsMode} apiKey=${!!apiKey} storeId=${storeId} variantId=${variantId} plan=${planSlug} autopay=${autoPayEnabled}`);
      return new Response(JSON.stringify({ error: "Lemon Squeezy not configured — set variant IDs in SuperAdmin → Pricing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = req.headers.get("origin") || Deno.env.get("APP_URL") || "https://app.glowpush.co.il";

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: auth.userId,
              plan_slug: planSlug,
              auto_pay: String(autoPayEnabled),
            },
          },
          checkout_options: {
            button_color: "#D4AF37",
            dark: false,
          },
          product_options: {
            redirect_url: `${appUrl}/payment-success?plan=${planSlug}&gateway=lemonsqueezy&autopay=${autoPayEnabled}`,
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: String(storeId) },
          },
          variant: {
            data: { type: "variants", id: String(variantId) },
          },
        },
      },
    };

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[create-lemonsqueezy-checkout] LS API error ${res.status}: ${errText}`);
      return new Response(JSON.stringify({ error: "Lemon Squeezy checkout creation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const checkoutUrl = json?.data?.attributes?.url;

    if (!checkoutUrl) {
      return new Response(JSON.stringify({ error: "No checkout URL returned from Lemon Squeezy" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-lemonsqueezy-checkout] ✅ userId=${auth.userId} plan=${planSlug} mode=${lsMode}`);

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[create-lemonsqueezy-checkout] Error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
