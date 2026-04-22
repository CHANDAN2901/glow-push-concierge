import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function authenticateCronRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET_KEY");
  if (!cronSecret) {
    console.error("[aftercare-cron] CRON_SECRET_KEY not configured - denying access");
    return false;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

type Lang = 'he' | 'en';

const TREATMENT_PREFIX_MAP: Record<string, string> = {
  'גבות': 'brows',
  'eyebrows': 'brows',
  'brows': 'brows',
  'Brows': 'brows',
  'שפתיים': 'lips',
  'lips': 'lips',
  'Lips': 'lips',
};

function getTreatmentPrefix(treatmentType: string | null): string | null {
  if (!treatmentType) return null;
  const normalized = treatmentType.trim().toLowerCase();
  for (const [key, prefix] of Object.entries(TREATMENT_PREFIX_MAP)) {
    if (key.toLowerCase() === normalized) return prefix;
  }
  if (normalized.includes('גבות') || normalized.includes('brow')) return 'brows';
  if (normalized.includes('שפתיי') || normalized.includes('lip')) return 'lips';
  return null;
}

interface ArtistSettings {
  drafts?: Record<string, string>;
  days?: Record<string, number | string | null>;
}

/**
 * Resolve the message text for a given client from the artist's message settings.
 * Priority: artist draft (lang-specific) → artist draft (legacy) → null
 */
function resolveFromArtistSettings(
  settings: ArtistSettings,
  daysSince: number,
  lang: Lang,
  treatmentPrefix: string | null,
): string | null {
  const drafts = settings.drafts ?? {};
  const days = settings.days ?? {};

  // Collect all base template IDs that match this day number
  const matchingBaseIds = new Set<string>();

  for (const [rawKey, dayValue] of Object.entries(days)) {
    if (Number(dayValue) !== daysSince) continue;
    // Strip __lang suffix to get the base ID
    const baseId = rawKey.replace(/__(he|en)$/i, '');
    matchingBaseIds.add(baseId);
  }

  for (const baseId of matchingBaseIds) {
    // Filter by treatment prefix (skip if prefix doesn't match, allow custom_* always)
    if (treatmentPrefix && !baseId.startsWith('custom_')) {
      const keyPrefix = baseId.split('_')[0];
      if (keyPrefix !== treatmentPrefix) continue;
    }

    // Language-specific draft first
    const langDraft = drafts[`${baseId}__${lang}`];
    if (langDraft?.trim()) return langDraft.trim();

    // Legacy single-language draft as fallback
    const legacyDraft = drafts[baseId];
    if (legacyDraft?.trim()) return legacyDraft.trim();
  }

  return null;
}

const CLIENT_PLACEHOLDER_PATTERNS = [/\[ClientName\]/g, /\{שם_לקוחה\}/g, /\{Client_Name\}/g, /\[שם הלקוחה\]/g];
const ARTIST_PLACEHOLDER_PATTERNS = [/\[ArtistName\]/g, /\{שם_אמנית\}/g, /\{Artist_Name\}/g];

function replacePlaceholders(text: string, clientName: string, artistName: string): string {
  let result = text;
  CLIENT_PLACEHOLDER_PATTERNS.forEach(p => { result = result.replace(p, clientName); });
  ARTIST_PLACEHOLDER_PATTERNS.forEach(p => { result = result.replace(p, artistName); });
  return result;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const isAuthenticated = await authenticateCronRequest(req);
  if (!isAuthenticated) {
    return new Response(
      JSON.stringify({ error: "Access denied. Valid cron token required." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[aftercare-cron] Cron access authenticated");

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fallback: global message_templates (used when artist has no custom settings)
    const { data: templates, error: tplErr } = await supabase
      .from('message_templates')
      .select('template_key, default_text, label')
      .like('template_key', 'aftercare_%')
      .order('template_key');

    if (tplErr) throw tplErr;

    // Day 0 is sent immediately on treatment completion (from SmartCalendar), so exclude it here
    const fallbackDayMessages = (templates ?? []).map((t: { template_key: string; default_text: string; label: string }) => {
      const match = t.template_key.match(/aftercare_day_(\d+)/);
      return { day: match ? parseInt(match[1]) : 0, text: t.default_text, label: t.label };
    }).filter((d: { day: number }) => d.day > 0);

    // 2. Fetch all artist message settings keyed by artist_profile_id
    const { data: allArtistSettings, error: settingsErr } = await supabase
      .from('artist_message_settings')
      .select('artist_profile_id, settings');

    if (settingsErr) console.warn("[aftercare-cron] Could not fetch artist settings:", settingsErr.message);

    const artistSettingsMap = new Map<string, ArtistSettings>(
      (allArtistSettings ?? []).map((row: { artist_profile_id: string; settings: ArtistSettings }) => [
        row.artist_profile_id,
        row.settings as ArtistSettings,
      ])
    );

    // 3. Fetch artist profile names (for placeholder replacement)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name');

    const profileNameMap = new Map<string, string>(
      (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name ?? ''])
    );

    // 4. Fetch all clients with treatment_date + preferred_lang
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name, artist_id, treatment_date, treatment_type, push_opted_in, preferred_lang')
      .not('treatment_date', 'is', null);

    if (clientErr) throw clientErr;
    if (!clients || clients.length === 0) {
      return new Response(JSON.stringify({ message: 'No clients with treatment dates' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pushesSent = 0;
    let fallbacksCreated = 0;
    const results: { client: string; day: number; action: string; lang: string }[] = [];

    for (const client of clients) {
      const treatmentDate = new Date(client.treatment_date);
      treatmentDate.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Day 0 is handled immediately on treatment completion — skip it here
      if (daysSince === 0) continue;

      const clientLang: Lang = client.preferred_lang === 'en' ? 'en' : 'he';
      const treatmentPrefix = getTreatmentPrefix(client.treatment_type);
      const artistName = profileNameMap.get(client.artist_id) ?? '';

      // Resolve message: artist custom settings → global fallback
      let messageText: string | null = null;
      let messageLabel = '';

      const artistSettings = artistSettingsMap.get(client.artist_id);
      if (artistSettings) {
        const resolved = resolveFromArtistSettings(artistSettings, daysSince, clientLang, treatmentPrefix);
        if (resolved) {
          messageText = replacePlaceholders(resolved, client.full_name, artistName);
          messageLabel = clientLang === 'en' ? `Day ${daysSince}` : `יום ${daysSince}`;
        }
      }

      // Fall back to global message_templates if artist has no matching template
      if (!messageText) {
        const fallback = fallbackDayMessages.find((d: { day: number }) => d.day === daysSince);
        if (!fallback) continue; // No message for this day at all — skip client
        messageText = replacePlaceholders(fallback.text, client.full_name, artistName);
        messageLabel = fallback.label;
      }

      if (client.push_opted_in) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth_key')
          .eq('client_id', client.id);

        if (subs && subs.length > 0) {
          for (const sub of subs) {
            try {
              const { error: pushErr } = await supabase.functions.invoke('send-push', {
                body: {
                  subscription: {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth_key },
                  },
                  title: `${messageLabel} ✨`,
                  body: messageText.substring(0, 200),
                  url: `/c/${client.id}`,
                  day: daysSince,
                },
              });
              if (pushErr) {
                console.error(`Push failed for ${client.full_name}:`, pushErr);
                results.push({ client: client.full_name, day: daysSince, action: 'push_failed_fallback', lang: clientLang });
                fallbacksCreated++;
              } else {
                pushesSent++;
                results.push({ client: client.full_name, day: daysSince, action: 'push_sent', lang: clientLang });
              }
            } catch (e) {
              console.error(`Push exception for ${client.full_name}:`, e);
              results.push({ client: client.full_name, day: daysSince, action: 'push_error_fallback', lang: clientLang });
              fallbacksCreated++;
            }
          }
        } else {
          results.push({ client: client.full_name, day: daysSince, action: 'no_subscription_fallback', lang: clientLang });
          fallbacksCreated++;
        }
      } else {
        results.push({ client: client.full_name, day: daysSince, action: 'whatsapp_fallback', lang: clientLang });
        fallbacksCreated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, pushesSent, fallbacksCreated, totalClientsScanned: clients.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Aftercare cron error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
