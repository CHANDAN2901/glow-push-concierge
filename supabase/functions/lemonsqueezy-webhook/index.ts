import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SLUG_TO_TIER: Record<string, string> = {
  pro: "lite",
  starter: "lite",
  professional: "professional",
  elite: "professional",
  master: "master",
  "vip-3year": "master",
};

async function getLsMode(supabase: ReturnType<typeof createClient>): Promise<"test" | "live"> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "ls_mode")
    .single();
  return data?.value === "live" ? "live" : "test";
}

async function verifySignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  const signature = req.headers.get("X-Signature");
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hexMac = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hexMac.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hexMac.length; i++) {
    diff |= hexMac.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lsMode = await getLsMode(supabase);
  const secret = lsMode === "live"
    ? Deno.env.get("LS_WEBHOOK_SECRET_LIVE")
    : Deno.env.get("LS_WEBHOOK_SECRET_TEST");

  if (!secret) {
    console.error(`[lemonsqueezy-webhook] LS_WEBHOOK_SECRET_${lsMode.toUpperCase()} not set`);
    return new Response("webhook_secret_not_configured", { status: 500 });
  }

  const valid = await verifySignature(req, rawBody, secret);
  if (!valid) {
    console.warn(`[lemonsqueezy-webhook] Signature verification failed (mode=${lsMode})`);
    return new Response("invalid_signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("invalid_json", { status: 400 });
  }

  const eventName = req.headers.get("X-Event-Name") || "";
  console.log(`[lemonsqueezy-webhook] Event: ${eventName} mode=${lsMode}`);

  const customData = payload?.meta?.custom_data || {};
  const userId = customData?.user_id;
  const planSlug = customData?.plan_slug;

  if (!userId || !planSlug) {
    console.error("[lemonsqueezy-webhook] Missing user_id or plan_slug in custom_data");
    return new Response("missing_custom_data", { status: 200 });
  }

  const attrs = payload?.data?.attributes || {};
  const lsSubscriptionId = payload?.data?.id ? String(payload.data.id) : null;
  const lsCustomerId = attrs?.customer_id ? String(attrs.customer_id) : null;
  const lsOrderId = attrs?.order_id ? String(attrs.order_id) : null;

  if (
    eventName === "order_created" ||
    eventName === "subscription_created" ||
    eventName === "subscription_renewed" ||
    eventName === "subscription_updated"
  ) {
    const tier = SLUG_TO_TIER[planSlug];
    if (!tier) {
      console.error(`[lemonsqueezy-webhook] Unknown planSlug: ${planSlug}`);
      return new Response("unknown_plan", { status: 200 });
    }

    const now = new Date();
    const subscriptionEndDate = new Date(now);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    const updatePayload: Record<string, unknown> = {
      subscription_tier: tier,
      subscription_status: "active",
      subscription_end_date: subscriptionEndDate.toISOString(),
      last_charge_at: now.toISOString(),
    };

    if (lsSubscriptionId) updatePayload.ls_subscription_id = lsSubscriptionId;
    if (lsCustomerId) updatePayload.ls_customer_id = lsCustomerId;
    if (lsOrderId) updatePayload.ls_order_id = lsOrderId;

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);

    if (error) {
      console.error("[lemonsqueezy-webhook] DB update failed:", error.message);
      return new Response("db_error", { status: 500 });
    }

    console.log(`[lemonsqueezy-webhook] ✅ Upgraded userId=${userId} tier=${tier} via ${eventName} mode=${lsMode}`);
  } else if (
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired"
  ) {
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_status: "cancelled" })
      .eq("user_id", userId);

    if (error) {
      console.error("[lemonsqueezy-webhook] DB update failed:", error.message);
      return new Response("db_error", { status: 500 });
    }

    console.log(`[lemonsqueezy-webhook] ⚠️ Cancelled userId=${userId} via ${eventName} mode=${lsMode}`);
  } else {
    console.log(`[lemonsqueezy-webhook] Unhandled event: ${eventName} — ignoring`);
  }

  return new Response("ok", { status: 200 });
});
