import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLUG_TO_VARIANT_ENV: Record<string, string> = {
  professional: "LS_VARIANT_ID_PROFESSIONAL",
  elite: "LS_VARIANT_ID_PROFESSIONAL",
  master: "LS_VARIANT_ID_MASTER",
  "vip-3year": "LS_VARIANT_ID_MASTER",
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
    const { planSlug } = await req.json();

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
    const variantEnvKey = SLUG_TO_VARIANT_ENV[planSlug];
    const variantId = variantEnvKey ? Deno.env.get(variantEnvKey) : null;

    if (!apiKey || !storeId || !variantId) {
      console.error(`[create-lemonsqueezy-checkout] Missing config — mode=${lsMode} apiKey=${!!apiKey} storeId=${storeId} variantId=${variantId}`);
      return new Response(JSON.stringify({ error: "Lemon Squeezy not configured — secrets missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = Deno.env.get("APP_URL") || "https://app.glowpush.co.il";

    const body = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: auth.userId,
              plan_slug: planSlug,
            },
          },
          checkout_options: {
            button_color: "#D4AF37",
            dark: false,
          },
          product_options: {
            redirect_url: `${appUrl}/payment-success?plan=${planSlug}&gateway=lemonsqueezy`,
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
