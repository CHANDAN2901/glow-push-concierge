import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      JSON.stringify({ error: "Authentication required. Please log in to use AI compare features." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[ai-compare] Authenticated user:", auth.userId);

  try {
    const { beforeImage, afterImage, artistName, logoUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!beforeImage || !afterImage) {
      return new Response(JSON.stringify({ error: "Both before and after images are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Validate URLs to prevent SSRF attacks
    if (!isValidImageUrl(beforeImage)) {
      return new Response(JSON.stringify({ error: "Invalid beforeImage URL. Only external HTTPS URLs are allowed." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidImageUrl(afterImage)) {
      return new Response(JSON.stringify({ error: "Invalid afterImage URL. Only external HTTPS URLs are allowed." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Create a professional side-by-side Before & After comparison image for a PMU (Permanent Makeup) treatment.
Left side: the "Before" photo. Right side: the "After" photo.
Add elegant labels: "BEFORE" on the left, "AFTER" on the right.
Add a subtle watermark at the bottom center: "GlowPush${artistName ? ` · ${artistName}` : ''}".
Make it look like a premium Instagram post with a clean, modern layout.
Use a thin gold divider line between the two photos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: beforeImage } },
              { type: "image_url", image_url: { url: afterImage } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
    const textContent = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ image: resultImage, text: textContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-compare error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
