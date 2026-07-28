import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, authenticateRequest, createAuthErrorResponse } from "../_shared/auth.ts";
import { createMorningInvoice } from "../_shared/morning.ts";

// One-off: generates a Morning.co invoice for a subscription that was
// already charged before invoicing was wired up (no webhook event to
// hook into, so this reads the existing last_charge snapshot on profiles
// and calls the same helper the webhooks use). Self-serve — the caller
// can only backfill their own profile.
serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const auth = await authenticateRequest(req);
  if (!auth) return createAuthErrorResponse(corsHeaders);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, business_phone, last_charge_at, tranzilla_plan_slug, tranzilla_amount_agorot, morning_invoice_url")
    .eq("user_id", auth.userId)
    .single();

  if (!profile?.last_charge_at) {
    return new Response(JSON.stringify({ error: "No charge on record for this account" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (profile.morning_invoice_url) {
    return new Response(JSON.stringify({ error: "Invoice already exists", url: profile.morning_invoice_url }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const planSlug = profile.tranzilla_plan_slug;
  const { data: planRow } = await supabase
    .from("pricing_plans")
    .select("price_monthly, name_he, name_en")
    .eq("slug", planSlug)
    .single();

  const price = profile.tranzilla_amount_agorot != null
    ? profile.tranzilla_amount_agorot / 100
    : planRow?.price_monthly ?? 0;

  try {
    const invoice = await createMorningInvoice({
      clientName: profile.full_name || "GlowPush Artist",
      clientEmail: profile.email || undefined,
      clientPhone: profile.business_phone || undefined,
      description: `GlowPush — ${planRow?.name_he || planRow?.name_en || planSlug || "Subscription"}`,
      price,
      currency: "ILS",
      lang: "he",
    });

    await supabase
      .from("profiles")
      .update({
        morning_invoice_url: invoice.url?.he || invoice.url?.origin || null,
        morning_invoice_number: invoice.number ?? null,
      })
      .eq("user_id", auth.userId);

    return new Response(JSON.stringify({ url: invoice.url?.he || invoice.url?.origin, number: invoice.number }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[backfill-morning-invoice] failed:", err?.message);
    return new Response(JSON.stringify({ error: "Invoice creation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
