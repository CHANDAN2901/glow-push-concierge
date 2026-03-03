import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Remove repeated sentences/phrases from raw dictation text */
function deduplicateText(text: string): string {
  if (!text) return "";
  // Split into sentences
  const sentences = text.split(/[.!?،,؛]\s*|\n+/).map(s => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of sentences) {
    const key = s.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  // Also remove consecutive duplicate words
  const words = unique.join('. ').split(/\s+/);
  const cleaned: string[] = [];
  let lastWord = '';
  let count = 0;
  for (const w of words) {
    const norm = w.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
    if (norm === lastWord && norm) {
      count++;
      if (count > 2) continue;
    } else {
      lastWord = norm;
      count = 1;
    }
    cleaned.push(w);
  }
  return cleaned.join(' ').trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rawText, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!rawText || rawText.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-clean the text before sending to AI
    const cleanedText = deduplicateText(rawText);

    const notMentioned = lang === 'he' ? 'לא צוין' : 'Not mentioned';

    const systemPrompt = `You are a professional medical-beauty treatment documentation assistant.
You receive raw dictated notes from a PMU (Permanent Makeup) artist and must extract structured data.

IMPORTANT INSTRUCTIONS:
1. CLEAN the input first: Remove any duplicated or repeated sentences/words. The input comes from speech recognition and may contain repetitions.

2. INFER the treatment area from context clues:
   - Words like "פאודר", "powder", "מיקרובליידינג", "microblading", "גבות", "brows", "ombre" → treatment area is "גבות" (Brows)
   - Words like "שפתיים", "lips", "lip liner", "lip contour", "lip blush", "קונטור שפתיים" → treatment area is "שפתיים" (Lips)
   - Words like "אייליינר", "eyeliner", "עיניים" → treatment area is "אייליינר" (Eyeliner)
   - If ambiguous, make your best guess based on the full context. Only use "${notMentioned}" if truly impossible to determine.

3. ALWAYS respond with a valid JSON object with these exact fields (use the language of the input text for values):
{
  "treatmentArea": "the body area treated",
  "pigmentFormula": "pigment colors and mixing ratios used",
  "needleType": "needle type, size, or configuration used",
  "clinicalNotes": "any other clinical observations: skin condition, bleeding, sensitivity, healing expectations, aftercare notes, technique used"
}

4. For clinicalNotes, include any technique details (powder, ombre, microblading, etc.) and general observations.
5. If a field is not mentioned in the notes, use "${notMentioned}" as the value.
6. Do NOT add any text outside the JSON object. Return ONLY the JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: cleanedText },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let structured;
    try {
      structured = JSON.parse(jsonStr);
      // Validate required keys exist
      const requiredKeys = ['treatmentArea', 'pigmentFormula', 'needleType', 'clinicalNotes'];
      for (const key of requiredKeys) {
        if (!structured[key]) {
          structured[key] = notMentioned;
        }
      }
    } catch {
      // Fallback: return raw content if JSON parsing fails
      structured = {
        treatmentArea: lang === 'he' ? 'לא זוהה' : 'Not detected',
        pigmentFormula: lang === 'he' ? 'לא זוהה' : 'Not detected',
        needleType: lang === 'he' ? 'לא זוהה' : 'Not detected',
        clinicalNotes: content,
      };
    }

    return new Response(JSON.stringify(structured), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("structure-treatment-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
