import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistProfileId, fullName, phone, birthDate, formData, signatureDataUrl } = await req.json();

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!artistProfileId || !uuidRegex.test(artistProfileId) || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: artistProfileId (valid UUID) and fullName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find or create client
    const { data: existingClients } = await supabase
      .from("clients")
      .select("id")
      .eq("artist_id", artistProfileId)
      .eq("full_name", fullName)
      .limit(1);

    let clientId: string;

    if (existingClients && existingClients.length > 0) {
      clientId = existingClients[0].id;
      const updates: Record<string, string> = {};
      if (phone) updates.phone = phone;
      if (birthDate) updates.birth_date = birthDate;
      if (Object.keys(updates).length > 0) {
        await supabase.from("clients").update(updates).eq("id", clientId);
      }
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from("clients")
        .insert({
          artist_id: artistProfileId,
          full_name: fullName,
          phone: phone || null,
          birth_date: birthDate || null,
          treatment_date: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (clientErr) throw clientErr;
      clientId = newClient.id;
    }

    // Save health declaration
    const { error: declErr } = await supabase
      .from("health_declarations")
      .insert({
        client_id: clientId,
        form_data: formData,
        is_signed: !!signatureDataUrl,
        signature_svg: signatureDataUrl || null,
        consent_accepted_at: formData?.legalConsentAt || null,
        medical_consent_at: formData?.medicalConsentAt || null,
      });

    if (declErr) throw declErr;

    return new Response(
      JSON.stringify({ success: true, clientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-health-declaration error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
