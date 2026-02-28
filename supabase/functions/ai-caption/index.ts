import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, treatmentType, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const isHebrew = language === "he";

    const systemPrompt = isHebrew
      ? `את מומחית שיווק לאמניות PMU (איפור קבוע). צרי פוסט אינסטגרם מקצועי בעברית עבור טיפול ${treatmentType || "PMU"}. כללי: כותרת קצרה ומושכת, 3-4 שורות תיאור, ו-15 האשטגים רלוונטיים. הטון: מקצועי, חם ומזמין. אל תכללי אימוג'ים מוגזמים.`
      : `You are a marketing expert for PMU (Permanent Makeup) artists. Create a professional Instagram post for a ${treatmentType || "PMU"} treatment. Include: a catchy headline, 3-4 lines of description, and 15 relevant hashtags. Tone: professional, warm, inviting. Don't overuse emojis.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: isHebrew ? "צרי פוסט אינסטגרם מקצועי עבור תמונת הטיפול הזו:" : "Create a professional Instagram post for this treatment photo:" },
          { type: "image_url", image_url: { url: imageBase64 } },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: isHebrew ? "צרי פוסט אינסטגרם מקצועי עבור טיפול PMU:" : "Create a professional Instagram post for a PMU treatment:",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
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
    const caption = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ caption }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-caption error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
