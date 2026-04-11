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
    const { artistProfileId, fullName, phone, birthDate, formData, signatureDataUrl, formToken, token } = await req.json();
    const submittedToken = token || formToken;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!artistProfileId || !uuidRegex.test(artistProfileId) || !fullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: artistProfileId (valid UUID) and fullName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!submittedToken) {
      return new Response(
        JSON.stringify({ error: "הקישור לא תקין — חסר טוקן אבטחה. פני למטפלת לקבלת קישור חדש." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate single-use token
    const { data: linkData, error: linkErr } = await supabase
      .from("form_links")
      .select("id, artist_id, client_id, form_token, code, is_token_used, is_completed")
      .or(`form_token.eq.${submittedToken},code.eq.${submittedToken}`)
      .maybeSingle();

    if (linkErr || !linkData) {
      return new Response(
        JSON.stringify({ error: "קישור לא תקין או שפג תוקפו. פני למטפלת לקבלת קישור חדש." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkData.artist_id !== artistProfileId) {
      return new Response(
        JSON.stringify({ error: "הקישור לא שייך למטפלת זו." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (linkData.is_token_used || linkData.is_completed) {
      return new Response(
        JSON.stringify({ error: "הטופס כבר מולא. לא ניתן למלא שוב." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find or create client
    let clientId: string;

    if (linkData.client_id) {
      clientId = linkData.client_id;

      const updates: Record<string, string | null> = {
        full_name: fullName,
      };
      if (phone) updates.phone = phone;
      if (birthDate) updates.birth_date = birthDate;

      await supabase.from("clients").update(updates).eq("id", clientId);
    } else {
      const { data: existingClients } = await supabase
        .from("clients")
        .select("id")
        .eq("artist_id", artistProfileId)
        .eq("full_name", fullName)
        .limit(1);

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
            treatment_date: null,
          })
          .select("id")
          .single();

        if (clientErr) throw clientErr;
        clientId = newClient.id;
      }
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

    // Update matching scheduled appointment health_form_status to 'signed'
    await supabase
      .from("appointments")
      .update({ health_form_status: "signed", health_risk_level: "green" })
      .eq("artist_id", artistProfileId)
      .eq("client_id", clientId)
      .eq("status", "scheduled")
      .eq("health_form_status", "pending");

    // VERY LAST step: burn token after successful save
    const { data: burned, error: burnErr } = await supabase
      .from("form_links")
      .update({ is_token_used: true, is_completed: true })
      .eq("id", linkData.id)
      .eq("is_token_used", false)
      .select("id")
      .maybeSingle();

    if (burnErr || !burned) {
      return new Response(
        JSON.stringify({ error: "הטופס כבר מולא. לא ניתן למלא שוב." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, clientId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("submit-health-declaration error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
