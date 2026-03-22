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
    
    // Block internal IP ranges (AWS metadata, private networks)
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // SECURITY: Require authentication
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please log in to use AI features." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[ai-align] Authenticated user:", auth.userId);

  try {
    const { beforeUrl, afterUrl, logoUrl, artistProfileId } = await req.json();

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

    if (logoUrl && !isValidImageUrl(logoUrl)) {
      return new Response(JSON.stringify({ error: "Invalid logoUrl. Only external HTTPS URLs are allowed." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auto-fetch artist logo from profile if not provided
    let resolvedLogoUrl = logoUrl || null;
    if (!resolvedLogoUrl && artistProfileId && artistProfileId !== 'general') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('logo_url')
        .eq('id', artistProfileId)
        .maybeSingle();
      if (profile?.logo_url) {
        resolvedLogoUrl = profile.logo_url;
      }
    }

    console.log("Sending image URLs to AI for face-aligned collage...", { hasLogo: !!resolvedLogoUrl });

    // Pass URLs directly to the AI - no need to fetch and convert to base64
    const contentParts: any[] = [
      {
        type: "text",
        text: `You are a professional photo alignment AI for permanent makeup (PMU) before & after comparisons.

TASK: Create a perfectly aligned side-by-side comparison from the two DIFFERENT photos provided below.

CRITICAL — IMAGE IDENTITY:
- The FIRST image provided is the BEFORE photo. The SECOND image provided is the AFTER photo.
- These are TWO DISTINCT photos taken at different times. They will look similar but have differences.
- You MUST use each photo exactly as provided. Do NOT duplicate one photo for both sides.

CRITICAL — ROTATION / ORIENTATION:
- Do NOT rotate images based on face detection. Face detection rotation is UNRELIABLE and causes upside-down results.
- Instead, respect the EXIF orientation of each image. If the image appears upright as provided, keep it upright.
- Only apply minimal straightening (a few degrees at most) to level the eyes horizontally. NEVER flip or rotate 180 degrees.
- If unsure about orientation, keep the image exactly as provided.

ALIGNMENT RULES:
1. Scale both photos so the facial features are the EXACT same size in both images.
2. Center the face identically in both halves so features line up horizontally across the divider.
3. Do NOT alter, replace, or change the person's face.

CRITICAL — LAYOUT AND LABELS:
- Place the BEFORE (first) image on the RIGHT side, the AFTER (second) image on the LEFT side.
- LABELS MUST MATCH: Add 'לפני' (Before) label on the RIGHT side (where the BEFORE/first image is), and 'אחרי' (After) label on the LEFT side (where the AFTER/second image is). NEVER swap these labels.
- Use a thin elegant gold divider line between them.
- Labels should be small and elegant, at the bottom of each respective side.
- Both images must be the same height and width.
- Use a clean white background.
${resolvedLogoUrl ? "- Place the provided logo as a subtle watermark in the bottom-right corner, about 10% of the collage width with 50% opacity." : ""}

OUTPUT: A single high-quality image ready for Instagram/portfolio use. Minimal, luxurious, professional.`,
      },
      { type: "image_url", image_url: { url: beforeUrl } },
      { type: "image_url", image_url: { url: afterUrl } },
    ];

    if (resolvedLogoUrl) {
      contentParts.push({ type: "image_url", image_url: { url: resolvedLogoUrl } });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: contentParts }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received, extracting image...");
    
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("AI did not return an image");
    }

    // Upload result to storage - use streaming approach to minimize memory
    const base64Content = generatedImage.includes(",") ? generatedImage.split(",")[1] : generatedImage;
    
    // Use Uint8Array from base64 without intermediate binary string
    const rawLen = base64Content.length;
    const binaryStr = atob(base64Content);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const storagePath = `${artistProfileId || "general"}/aligned/ai-aligned-${Date.now()}.png`;
    console.log("Uploading AI result to storage...", storagePath);
    
    const { error: uploadError } = await supabase.storage
      .from("client-photos")
      .upload(storagePath, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Fallback: return the base64 image directly
      return new Response(JSON.stringify({ alignedUrl: generatedImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("client-photos").getPublicUrl(storagePath);
    console.log("AI align complete! URL:", urlData.publicUrl);

    return new Response(JSON.stringify({ alignedUrl: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-align error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
