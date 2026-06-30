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
    const autoPayEnabled = fields["remarks3"] !== "false"; // default true if not set

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
      .select("subscription_tier, price_monthly")
      .eq("slug", planSlug)
      .single();

    const tier = planRow?.subscription_tier;
    if (!tier) {
      console.error(`[tranzilla-webhook] Unknown planSlug: ${planSlug}`);
      return new Response("unknown_plan", { status: 200 });
    }

    const now = new Date();
    let updatePayload: Record<string, unknown>;

    if (planSlug === "glow-trial") {
      // ₪2 trial activation — grants 30-day full access (master tier)
      const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      updatePayload = {
        subscription_status: "trial",
        subscription_tier: "master",
        trial_ends_at: trialEndsAt.toISOString(),
        tranzilla_plan_slug: planSlug,
        tranzilla_amount_agorot: 200,
        last_charge_at: now.toISOString(),
        last_charge_confirmation: confirmationCode || null,
        tranzilla_token: null,
        tranzilla_expiry: null,
        autopay_enabled: false,
        charge_failure_count: 0,
      };
    } else {
      const subscriptionEndDate = new Date(now);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      // Recurring amount = FULL plan price (not the charged `sum`), so a first-charge-only
      // coupon discount never carries into renewals. Falls back to the charged sum if the
      // plan has no configured price. Clearing post_trial_discount_percent consumes the
      // one-time coupon discount so it can't be re-applied to a future checkout.
      const fullPriceAgorot = planRow?.price_monthly
        ? Math.round(Number(planRow.price_monthly) * 100)
        : (sum ? Math.round(parseFloat(sum) * 100) : null);

      updatePayload = {
        subscription_tier: tier,
        subscription_status: "active",
        tranzilla_plan_slug: planSlug,
        tranzilla_amount_agorot: fullPriceAgorot,
        post_trial_discount_percent: null,
        subscription_end_date: subscriptionEndDate.toISOString(),
        last_charge_at: now.toISOString(),
        last_charge_confirmation: confirmationCode || null,
      };

      if (autoPayEnabled && token) {
        updatePayload.tranzilla_token = token;
        updatePayload.tranzilla_expiry = expiry || null;
        updatePayload.autopay_enabled = true;
        updatePayload.charge_failure_count = 0;
      } else {
        updatePayload.tranzilla_token = null;
        updatePayload.tranzilla_expiry = null;
        updatePayload.autopay_enabled = false;
        updatePayload.charge_failure_count = 0;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId);

    if (error) {
      console.error("[tranzilla-webhook] DB update failed:", error.message);
      return new Response("db_error", { status: 500 });
    }

    const logMsg = planSlug === "glow-trial"
      ? `[tranzilla-webhook] ✅ Trial activated — userId=${userId} trial_ends_at=${updatePayload.trial_ends_at}`
      : `[tranzilla-webhook] ✅ Subscription upgraded — userId=${userId} tier=${tier}`;
    console.log(logMsg);
    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("[tranzilla-webhook] Unhandled error:", err?.message);
    return new Response("error", { status: 500 });
  }
});
