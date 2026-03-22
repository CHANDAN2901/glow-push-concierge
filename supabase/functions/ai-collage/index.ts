import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SECURITY: Validate URLs to prevent SSRF attacks
function isValidImageUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and internal IPs
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
      return false;
    }
    
    // Block internal IP ranges
    if (/^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./.test(hostname)) {
      return false;
    }
    if (hostname === "169.254.169.254") {
      return false;
    }
    
    // Only allow http and https
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// SECURITY: Authenticate the request
async function authenticateRequest(req: Request): Promise<{ userId: string } | null> {
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

    return { userId: user.id };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SECURITY: Require authentication
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please log in to use AI features." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[ai-collage] Authenticated user:", auth.userId);

  try {
    const { beforeUrl, afterUrl, artistProfileId } = await req.json();
    if (!beforeUrl || !afterUrl) {
      return new Response(JSON.stringify({ error: "Both before and after images are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Validate URLs to prevent SSRF attacks
    if (!isValidImageUrl(beforeUrl)) {
      return new Response(JSON.stringify({ error: "Invalid beforeUrl. Only external HTTPS URLs are allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidImageUrl(afterUrl)) {
      return new Response(JSON.stringify({ error: "Invalid afterUrl. Only external HTTPS URLs are allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch both images and convert to base64
    const [beforeResp, afterResp] = await Promise.all([
      fetch(beforeUrl),
      fetch(afterUrl),
    ]);

    if (!beforeResp.ok || !afterResp.ok) throw new Error("Failed to fetch images");

    const [beforeBuf, afterBuf] = await Promise.all([
      beforeResp.arrayBuffer(),
      afterResp.arrayBuffer(),
    ]);

    const toBase64 = (buf: ArrayBuffer, type: string) => {
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return `data:${type};base64,${btoa(binary)}`;
    };

    const beforeB64 = toBase64(beforeBuf, beforeResp.headers.get("content-type") || "image/jpeg");
    const afterB64 = toBase64(afterBuf, afterResp.headers.get("content-type") || "image/jpeg");

    console.log("Sending images to AI for collage generation...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Create a professional, elegant before & after beauty collage from these two images. CRITICAL LAYOUT: Place the AFTER image on the LEFT side and the BEFORE image on the RIGHT side. CRITICAL IDENTITY RULE: Do NOT change, replace, or alter the person's face in any way. The person in both images MUST be the exact same person with the exact same facial features, face shape, eyes, nose, and bone structure. Do NOT generate a new face. ALLOWED EDITS on the AFTER image ONLY: subtle skin smoothing (remove redness, blemishes, spots) and enhance the treatment area (eyebrows/lips) to look slightly more defined. If you cannot preserve the exact same face, show the original unedited photo. Place both images side by side with equal sizing. Add a thin elegant gold divider line between them. Add small elegant text labels: 'לפני' (BEFORE) on the right image and 'אחרי' (AFTER) on the left image at the bottom. Use a clean white background. Make both images the same height. Keep it minimal and luxurious.",
              },
              {
                type: "image_url",
                image_url: { url: beforeB64 },
              },
              {
                type: "image_url",
                image_url: { url: afterB64 },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("AI did not return an image");
    }

    // Upload the collage to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = generatedImage.split(",")[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const storagePath = `${artistProfileId || "general"}/collages/ai-collage-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("client-photos")
      .upload(storagePath, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Return the base64 directly as fallback
      return new Response(JSON.stringify({ collageUrl: generatedImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("client-photos").getPublicUrl(storagePath);

    return new Response(JSON.stringify({ collageUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-collage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
