import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Token terminal credentials — set these in Supabase Dashboard → Settings → Edge Functions → Secrets
const TERMINAL_NAME = Deno.env.get("TRANZILLA_TOKEN_TERMINAL_NAME")!;
const CREDIT_PASSWORD = Deno.env.get("TRANZILLA_TOKEN_CREDIT_PW")!;

interface Profile {
  user_id: string;
  tranzilla_token: string;
  tranzilla_expiry: string;
  tranzilla_amount_agorot: number;
  tranzilla_plan_slug: string;
  subscription_end_date: string;
}

async function chargeToken(token: string, expiry: string, amountAgorot: number): Promise<{
  success: boolean;
  confirmationCode?: string;
  responseCode?: string;
  error?: string;
}> {
  const amountIls = (amountAgorot / 100).toFixed(2);

  const params = new URLSearchParams({
    supplier: TERMINAL_NAME,
    TranzilaPW: CREDIT_PASSWORD,
    TranzilaTK: token,
    expdate: expiry,
    sum: amountIls,
    currency: "1",    // ILS
    cred_type: "1",   // regular credit
    tranmode: "A",    // A = charge
  });

  const url = `https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi?${params.toString()}`;

  try {
    const res = await fetch(url);
    const text = await res.text();

    // Response is URL-encoded: "Response=000&ConfirmationCode=ABC123&..."
    const parsed = Object.fromEntries(new URLSearchParams(text));
    const responseCode = parsed["Response"];
    const confirmationCode = parsed["ConfirmationCode"];

    console.log(`[tranzilla-recurring] charge response: Response=${responseCode} Confirmation=${confirmationCode}`);

    if (responseCode === "000") {
      return { success: true, confirmationCode, responseCode };
    }
    return { success: false, responseCode, error: `Tranzilla declined: Response=${responseCode}` };
  } catch (err: any) {
    return { success: false, error: err?.message || "Fetch failed" };
  }
}

serve(async (req: Request) => {
  // Allow manual trigger via POST (e.g. from Supabase cron or admin)
  // Also supports GET for cron invocation
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    // Charge subscriptions that expired in the last 24h (with a small buffer)
    const windowStart = new Date(now);
    windowStart.setHours(windowStart.getHours() - 24);

    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id, tranzilla_token, tranzilla_expiry, tranzilla_amount_agorot, tranzilla_plan_slug, subscription_end_date")
      .eq("subscription_status", "active")
      .not("tranzilla_token", "is", null)
      .lte("subscription_end_date", now.toISOString())
      .gte("subscription_end_date", windowStart.toISOString());

    if (fetchError) {
      console.error("[tranzilla-recurring] Failed to fetch profiles:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    console.log(`[tranzilla-recurring] Found ${profiles?.length ?? 0} subscriptions due for renewal`);

    const results: Array<{ userId: string; success: boolean; error?: string }> = [];

    for (const profile of (profiles as Profile[]) ?? []) {
      const { user_id, tranzilla_token, tranzilla_expiry, tranzilla_amount_agorot } = profile;

      if (!tranzilla_token || !tranzilla_expiry || !tranzilla_amount_agorot) {
        console.warn(`[tranzilla-recurring] Skipping userId=${user_id}: missing token/expiry/amount`);
        results.push({ userId: user_id, success: false, error: "missing token/expiry/amount" });
        continue;
      }

      const charge = await chargeToken(tranzilla_token, tranzilla_expiry, tranzilla_amount_agorot);

      if (charge.success) {
        const newEndDate = new Date(now);
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await supabase
          .from("profiles")
          .update({
            subscription_end_date: newEndDate.toISOString(),
            last_charge_at: now.toISOString(),
            last_charge_confirmation: charge.confirmationCode || null,
          })
          .eq("user_id", user_id);

        console.log(`[tranzilla-recurring] ✅ Renewed userId=${user_id} until ${newEndDate.toISOString()}`);
        results.push({ userId: user_id, success: true });
      } else {
        // Mark subscription as past_due after failed charge
        await supabase
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("user_id", user_id);

        console.warn(`[tranzilla-recurring] ❌ Charge failed userId=${user_id}: ${charge.error}`);
        results.push({ userId: user_id, success: false, error: charge.error });
      }
    }

    const summary = {
      processed: results.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };

    console.log("[tranzilla-recurring] Summary:", JSON.stringify(summary));
    return new Response(JSON.stringify(summary), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[tranzilla-recurring] Unhandled error:", err?.message);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), { status: 500 });
  }
});
