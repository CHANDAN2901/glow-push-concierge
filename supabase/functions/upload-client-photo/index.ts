import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artistProfileId, clientId, category, base64Data, fileName } = await req.json();

    if (!artistProfileId || !category || !base64Data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Decode base64 to binary
    const base64Content = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Determine content type
    let contentType = "image/jpeg";
    if (base64Data.includes("image/png")) contentType = "image/png";
    else if (base64Data.includes("image/webp")) contentType = "image/webp";

    // Sanitize clientId for storage path (remove non-ASCII chars)
    const safeClientId = (clientId || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${artistProfileId}/${safeClientId}/${category}/${fileName || `${Date.now()}.jpg`}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("client-photos")
      .upload(storagePath, bytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("client-photos")
      .getPublicUrl(storagePath);

    // Save metadata
    const { error: metaError } = await supabase
      .from("images_metadata")
      .insert({
        artist_profile_id: artistProfileId,
        client_id: clientId || null,
        category,
        storage_path: storagePath,
        label: category,
      });

    if (metaError) {
      console.error("Metadata error:", metaError);
    }

    return new Response(
      JSON.stringify({
        url: urlData.publicUrl,
        storagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
