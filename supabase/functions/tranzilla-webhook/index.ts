import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  // Tranzilla POSTs form data to this webhook after payment
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let fields: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) fields[k] = v;
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) fields[k] = String(v);
    } else {
      // Fallback: try text
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params.entries()) fields[k] = v;
    }

    console.log("[tranzilla-webhook] Received fields:", JSON.stringify(Object.keys(fields)));

    const responseCode = fields["Response"];         // "000" = approved
    const token = fields["TranzilaTK"];              // saved card token
    const expiry = fields["expdate"];                // "MMYY"
    const confirmationCode = fields["ConfirmationCode"];
    const userId = fields["remarks2"];               // passed through from iframe URL
    const planSlug = fields["remarks"];              // passed through from iframe URL
    const sum = fields["sum"];

    console.log(`[tranzilla-webhook] Response=${responseCode} userId=${userId} plan=${planSlug} token=${token ? "present" : "missing"}`);

    if (responseCode !== "000") {
      console.warn(`[tranzilla-webhook] Payment declined. Response=${responseCode}`);
      return new Response("payment_declined", { status: 200 }); // 200 so Tranzilla doesn't retry
    }

    if (!userId || !planSlug) {
      console.error("[tranzilla-webhook] Missing userId or planSlug in pass-through fields");
      return new Response("missing_params", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up tier from DB so any plan created in admin automatically works
    const { data: planRow } = await supabase
      .from("pricing_plans")
      .select("subscription_tier")
      .eq("slug", planSlug)
      .single();

    const tier = planRow?.subscription_tier;
    if (!tier) {
      console.error(`[tranzilla-webhook] Unknown planSlug: ${planSlug}`);
      return new Response("unknown_plan", { status: 200 });
    }

    const now = new Date();
    const subscriptionEndDate = new Date(now);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    const updatePayload: Record<string, unknown> = {
      subscription_tier: tier,
      subscription_status: "active",
      tranzilla_plan_slug: planSlug,
      tranzilla_amount_agorot: sum ? Math.round(parseFloat(sum) * 100) : null,
      subscription_end_date: subscriptionEndDate.toISOString(),
      last_charge_at: now.toISOString(),
      last_charge_confirmation: confirmationCode || null,
    };

    // Save token only if provided (VK mode returns token)
    if (token) {
      updatePayload.tranzilla_token = token;
      updatePayload.tranzilla_expiry = expiry || null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);

    if (error) {
      console.error("[tranzilla-webhook] DB update failed:", error.message);
      return new Response("db_error", { status: 500 });
    }

    console.log(`[tranzilla-webhook] ✅ Subscription upgraded — userId=${userId} tier=${tier} ends=${subscriptionEndDate.toISOString()}`);
    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("[tranzilla-webhook] Unhandled error:", err?.message);
    return new Response("error", { status: 500 });
  }
});
