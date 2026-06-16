// Library-based variant of `send-push`, using the `web-push` npm package instead
// of the hand-rolled VAPID JWT + AES-128-GCM crypto.
//
// ⚠️ VERIFY BEFORE CUTOVER: `web-push` is a Node library; this runs on the Supabase
// Edge Runtime (Deno). `npm:` + Node-compat usually works, but must be confirmed on a
// real deploy with a live subscription. The original `send-push` is left intact as the
// fallback — only repoint callers (aftercare-cron) here once this is confirmed working.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function authenticateRequest(req: Request): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();

  // Trusted internal/server calls (aftercare-cron, birthday-greetings) use the
  // service-role key, which maps to no user — accept it explicitly.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey && token === serviceRoleKey) {
    return { userId: "service-role" };
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { userId: user.id };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

function summarizeSubscription(subscription: any) {
  const endpoint = subscription?.endpoint ?? "";
  const endpointHost =
    typeof endpoint === "string" && endpoint
      ? (() => {
          try {
            return new URL(endpoint).host;
          } catch {
            return "invalid-endpoint";
          }
        })()
      : "missing";
  return {
    endpointHost,
    endpointLength: typeof endpoint === "string" ? endpoint.length : 0,
    p256dhLength: typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh.length : 0,
    authLength: typeof subscription?.keys?.auth === "string" ? subscription.keys.auth.length : 0,
  };
}

type FailureClass = "subscription_gone" | "subscription_transient" | "provider_error";

function classifyProviderFailure(status: number, bodyText: string): FailureClass {
  if (status === 410) return "subscription_gone";
  if (/unsubscribed|not.?registered|gone/i.test(bodyText)) return "subscription_gone";
  if (status === 404) return "subscription_transient";
  if (/expired/i.test(bodyText)) return "subscription_transient";
  return "provider_error";
}

// Delete a permanently-gone subscription, or count a transient failure and delete after 3.
async function cleanupSubscription(endpoint: string, failureReason: FailureClass) {
  if (failureReason !== "subscription_gone" && failureReason !== "subscription_transient") return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (failureReason === "subscription_gone") {
      const { error } = await adminClient.from("push_subscriptions").delete().eq("endpoint", endpoint);
      if (error) console.warn("[send-push-lib] Failed to delete gone subscription:", error.message);
      else console.log("[send-push-lib] ✅ Subscription permanently gone — deleted from DB");
      return;
    }

    // Transient: increment fail_count, delete only at 3.
    const { data: rows, error: fetchErr } = await adminClient
      .from("push_subscriptions")
      .select("id, fail_count")
      .eq("endpoint", endpoint)
      .limit(1);

    if (!fetchErr && rows && rows.length > 0) {
      const row = rows[0];
      const newCount = (row.fail_count ?? 0) + 1;
      if (newCount >= 3) {
        await adminClient.from("push_subscriptions").delete().eq("id", row.id);
        console.log(`[send-push-lib] ✅ Subscription hit ${newCount} transient failures — deleted from DB`);
      } else {
        await adminClient.from("push_subscriptions").update({ fail_count: newCount }).eq("id", row.id);
        console.log(`[send-push-lib] Transient failure recorded (fail_count: ${newCount}/3)`);
      }
    }
  } catch (cleanupErr: any) {
    console.warn("[send-push-lib] Cleanup error:", cleanupErr?.message);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please log in to send push notifications." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  console.log("[send-push-lib] Authenticated user:", auth.userId);

  try {
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseErr: any) {
      console.error("[send-push-lib] JSON parse error:", parseErr?.message);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!requestBody) {
      return new Response(JSON.stringify({ error: "Empty request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subscription, title, body: msgBody, icon, url, day } = requestBody;
    const subscriptionSummary = summarizeSubscription(subscription);
    console.log("[send-push-lib] Request summary:", JSON.stringify(subscriptionSummary));

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response(
        JSON.stringify({
          error: "Invalid subscription object. Required: endpoint, keys.p256dh, keys.auth",
          subscription: subscriptionSummary,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const rawPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidPublicKey = rawPublic.replace(/[^A-Za-z0-9\-_]/g, "");
    const vapidPrivateKey = rawPrivate.replace(/[^A-Za-z0-9\-_]/g, "");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured", hasPublicKey: !!rawPublic, hasPrivateKey: !!rawPrivate }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetUrl = day
      ? `${url || "/client"}${(url || "/client").includes("?") ? "&" : "?"}day=${day}`
      : url || "/client";

    const notificationPayload = JSON.stringify({
      title: title || "Glow Push ✨",
      body: msgBody || "יש לך עדכון חדש!",
      icon: icon || "/pwa-192.png",
      data: { url: targetUrl, day: day || null },
    });

    // === This is the whole point of the library: encryption + VAPID JWT + send in one call. ===
    webpush.setVapidDetails("mailto:push@glowpush.app", vapidPublicKey, vapidPrivateKey);

    try {
      console.log("[send-push-lib] Sending via web-push to host:", subscriptionSummary.endpointHost);
      await webpush.sendNotification(subscription, notificationPayload, {
        TTL: 86400,
        headers: { Urgency: "high" },
      });
      console.log("[send-push-lib] ✅ Push delivered successfully");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (sendErr: any) {
      // web-push throws a WebPushError with statusCode / body / headers on non-2xx.
      const status: number = sendErr?.statusCode ?? 0;
      const providerText: string = typeof sendErr?.body === "string" ? sendErr.body : (sendErr?.message || "");
      const failureReason = classifyProviderFailure(status, providerText);

      console.error(
        "[send-push-lib] Provider error:",
        JSON.stringify({
          failureReason,
          providerStatus: status,
          endpointHost: subscriptionSummary.endpointHost,
          providerResponse: providerText?.slice(0, 500),
        }),
      );

      await cleanupSubscription(subscription.endpoint, failureReason);

      return new Response(
        JSON.stringify({
          error:
            failureReason === "subscription_gone"
              ? "Push subscription permanently unsubscribed (410)"
              : failureReason === "subscription_transient"
              ? "Push subscription transiently unreachable (404)"
              : "Push delivery failed",
          failure_reason: failureReason,
          provider_status: status,
          provider_response: providerText?.slice(0, 500),
        }),
        { status: status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error: any) {
    console.error("[send-push-lib] Unhandled error:", JSON.stringify({ name: error?.name, message: error?.message }));
    return new Response(JSON.stringify({ error: error?.message || "Unknown server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
