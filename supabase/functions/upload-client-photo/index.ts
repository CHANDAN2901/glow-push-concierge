import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SECURITY: Validate base64 image data
function isValidBase64Image(base64String: string): boolean {
  // Check if it's a valid base64 image format
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(base64String);
}

// SECURITY: Check file size (max 10MB)
function isValidFileSize(base64String: string, maxSizeMB: number = 10): boolean {
  const base64Content = base64String.includes(",") 
    ? base64String.split(",")[1] 
    : base64String;
  
  const sizeInBytes = (base64Content.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  return sizeInMB <= maxSizeMB;
}

// SECURITY: Authenticate the request
async function authenticateRequest(req: Request): Promise<{ userId: string; profileId: string } | null> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    return {
      userId: user.id,
      profileId: user.id,
    };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Require authentication
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please log in to upload photos." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[upload-client-photo] Authenticated user:", auth.userId);

  try {
    const { artistProfileId, clientId, category, base64Data, fileName } = await req.json();

    if (!artistProfileId || !category || !base64Data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: artistProfileId, category, and base64Data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Validate that the image is actually an image
    if (!isValidBase64Image(base64Data)) {
      return new Response(
        JSON.stringify({ error: "Invalid image format. Only JPEG, PNG, GIF, and WebP images are allowed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Check file size
    if (!isValidFileSize(base64Data, 10)) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB." }),
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
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
