import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { beforeUrl, afterUrl, logoUrl, artistProfileId } = await req.json();

    if (!beforeUrl || !afterUrl) {
      return new Response(JSON.stringify({ error: "Both before and after images are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch images and convert to base64
    const fetchImage = async (url: string) => {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch image: ${url}`);
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const type = resp.headers.get("content-type") || "image/jpeg";
      return `data:${type};base64,${btoa(binary)}`;
    };

    const imagesToFetch = [fetchImage(beforeUrl), fetchImage(afterUrl)];
    if (logoUrl) imagesToFetch.push(fetchImage(logoUrl));

    const results = await Promise.all(imagesToFetch);
    const beforeB64 = results[0];
    const afterB64 = results[1];
    const logoB64 = results[2] || null;

    console.log("Sending images to AI for face-aligned collage...");

    const contentParts: any[] = [
      {
        type: "text",
        text: `You are a professional photo alignment AI for permanent makeup (PMU) before & after comparisons.

TASK: Create a perfectly aligned side-by-side comparison from these two photos.

ALIGNMENT RULES (CRITICAL):
1. FACE DETECTION: Identify the face, eyebrows, eyes, nose, and lips in both photos.
2. ROTATION: Straighten both images so the face is perfectly level and upright. Match the head tilt angle.
3. ZOOM & CROP: Scale both photos so the facial features (especially the treatment area — eyebrows or lips) are the EXACT same size in both images.
4. POSITIONING: Center the face identically in both halves so features line up horizontally across the divider.
5. IDENTITY: Do NOT alter, replace, or change the person's face. The person MUST remain identical. Do NOT generate a new face.

LAYOUT:
- Place BEFORE image on the RIGHT side, AFTER image on the LEFT side.
- Use a thin elegant gold divider line between them.
- Add small elegant labels: 'לפני' (Before) on the right, 'אחרי' (After) on the left, at the bottom.
- Both images must be the same height and width.
- Use a clean white background.
${logoB64 ? "- Place the provided logo as a subtle watermark at the bottom center of the collage." : ""}

OUTPUT: A single high-quality image ready for Instagram/portfolio use. Minimal, luxurious, professional.`,
      },
      { type: "image_url", image_url: { url: beforeB64 } },
      { type: "image_url", image_url: { url: afterB64 } },
    ];

    if (logoB64) {
      contentParts.push({ type: "image_url", image_url: { url: logoB64 } });
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
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      throw new Error("AI did not return an image");
    }

    // Upload result to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = generatedImage.includes(",") ? generatedImage.split(",")[1] : generatedImage;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const storagePath = `${artistProfileId || "general"}/aligned/ai-aligned-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("client-photos")
      .upload(storagePath, bytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ alignedUrl: generatedImage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: urlData } = supabase.storage.from("client-photos").getPublicUrl(storagePath);

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
