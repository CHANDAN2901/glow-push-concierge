import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanRunawayRepetition(text: string, maxConsecutive = 3): string {
  if (!text) return "";

  const parts = text.split(/(\s+)/);
  const cleaned: string[] = [];
  let lastWord = "";
  let count = 0;

  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      cleaned.push(part);
      continue;
    }

    const normalized = part.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
    if (!normalized) {
      cleaned.push(part);
      continue;
    }

    if (normalized === lastWord) {
      count += 1;
      if (count > maxConsecutive) continue;
    } else {
      lastWord = normalized;
      count = 1;
    }

    cleaned.push(part);
  }

  return cleaned.join("").replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, mimeType, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: "No audio provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notMentioned = lang === 'he' ? 'לא צוין' : 'Not mentioned';

    const systemPrompt = `You are a professional medical-beauty treatment documentation assistant.
You will receive an audio recording from a PMU (Permanent Makeup) artist dictating treatment notes.

Your job:
1. Transcribe the audio accurately in the original spoken language.
2. Extract structured data from the transcription.

ALWAYS respond with a valid JSON object with these exact fields (use the language of the audio for values):
{
  "transcription": "the full transcription of the audio",
  "treatmentArea": "the body area treated (e.g. גבות, שפתיים, אייליינר / Brows, Lips, Eyeliner)",
  "pigmentFormula": "pigment colors and mixing ratios used",
  "needleType": "needle type, size, or configuration used",
  "clinicalNotes": "any other clinical observations: skin condition, bleeding, sensitivity, healing expectations, aftercare notes"
}

If a field is not mentioned in the audio, use "${notMentioned}" as the value.
Do NOT add any text outside the JSON object. Return ONLY the JSON.`;

    const basePayload = {
      model: "google/gemini-2.5-flash",
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: {
                data: audioBase64,
                format: "wav",
              },
            },
            {
              type: "text",
              text: lang === 'he'
                ? "אנא תמלל את ההקלטה הזו וסדר את המידע לתבנית הטיפול."
                : "Please transcribe this recording and structure the information into the treatment template.",
            },
          ],
        },
      ],
    };

    const callGateway = (includeRepetitionPenalty: boolean) =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          includeRepetitionPenalty
            ? { ...basePayload, repetition_penalty: 1.1 }
            : basePayload
        ),
      });

    let response = await callGateway(true);
    let preReadErrorText = "";

    if (!response.ok && response.status === 400) {
      preReadErrorText = await response.text();
      const repetitionPenaltyNotSupported = /repetition_penalty|unknown parameter|not supported|additional properties/i.test(preReadErrorText);

      if (repetitionPenaltyNotSupported) {
        response = await callGateway(false);
        preReadErrorText = "";
      }
    }

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
      const t = preReadErrorText || await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed", details: t }), {
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
    } catch {
      const fallback = lang === 'he' ? 'לא זוהה' : 'Not detected';
      structured = {
        transcription: content,
        treatmentArea: fallback,
        pigmentFormula: fallback,
        needleType: fallback,
        clinicalNotes: content,
      };
    }

    const transcriptionText = typeof structured?.transcription === "string" ? structured.transcription : String(structured?.transcription ?? "");
    structured.transcription = cleanRunawayRepetition(transcriptionText, 3);

    return new Response(JSON.stringify(structured), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-treatment-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
