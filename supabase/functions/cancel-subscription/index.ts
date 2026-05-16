import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

async function getLsMode(supabase: ReturnType<typeof createClient>): Promise<"test" | "live"> {
  const { data } = await supabase.from("app_settings").select("value").eq("key", "ls_mode").single();
  return data?.value === "live" ? "live" : "test";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("ls_subscription_id, tranzilla_token, subscription_end_date, subscription_status, autopay_enabled")
      .eq("user_id", auth.userId)
      .single();

    if (fetchError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile.autopay_enabled) {
      return new Response(JSON.stringify({ error: "Autopay is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessUntil = profile.subscription_end_date;

    // --- LemonSqueezy cancellation ---
    if (profile.ls_subscription_id) {
      const lsMode = await getLsMode(supabase);
      const apiKey = lsMode === "live"
        ? Deno.env.get("LS_API_KEY_LIVE")
        : Deno.env.get("LS_API_KEY_TEST");

      const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${profile.ls_subscription_id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/vnd.api+json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[cancel-subscription] LS cancel failed ${res.status}: ${errText}`);
        return new Response(JSON.stringify({ error: "Failed to cancel with LemonSqueezy" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const json = await res.json();
      // LS returns ends_at = end of current billing period (grace period)
      const endsAt = json?.data?.attributes?.ends_at;
      if (endsAt) accessUntil = endsAt;

      console.log(`[cancel-subscription] LS cancelled userId=${auth.userId} access until ${accessUntil}`);
    }

    // --- Tranzilla cancellation (stop future cron charges) ---
    // Always clear the token regardless of provider to prevent double-charging
    await supabase
      .from("profiles")
      .update({
        autopay_enabled: false,
        tranzilla_token: null,
        tranzilla_expiry: null,
        subscription_status: "cancelled",
        subscription_end_date: accessUntil,
      })
      .eq("user_id", auth.userId);

    console.log(`[cancel-subscription] ✅ Cancelled autopay userId=${auth.userId} access until ${accessUntil}`);

    return new Response(JSON.stringify({ success: true, access_until: accessUntil }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[cancel-subscription] Error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
