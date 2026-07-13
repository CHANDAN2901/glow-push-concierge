import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function authenticateCronRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const presented = authHeader.slice("Bearer ".length).trim();
  if (!presented) return false;

  // 1) Env-based secret (legacy/manual override)
  const envSecret = Deno.env.get("CRON_SECRET_KEY");
  if (envSecret && presented === envSecret) return true;

  // 2) DB-stored secret (single source of truth shared with pg_cron)
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase
      .from("cron_tokens")
      .select("token")
      .eq("name", "aftercare")
      .maybeSingle();
    if (error) {
      console.error("[aftercare-cron] cron_tokens lookup failed:", error.message);
      return false;
    }
    if (data?.token && presented === data.token) return true;
  } catch (e) {
    console.error("[aftercare-cron] auth lookup exception:", (e as Error).message);
  }
  return false;
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

interface HealingPhase {
  treatment_type: string;
  day_start: number;
  day_end: number;
  title_he: string;
  title_en: string;
  steps_he: string[];
  steps_en: string[];
  sort_order: number;
}

interface ClientHealingPhase extends HealingPhase {
  client_id: string;
}

interface TimelineOverride {
  quote_he: string | null;
  quote_en: string | null;
}

// Inlined copy of src/lib/timeline-overrides.ts — edge functions can't import frontend modules.
// Treats stale default journey text as "no override" so the cron uses live phase content instead.
const LEGACY_HE_PATTERNS = [
  'יום ראשון - מושלם',
  'שמרי על האזור נקי ויבש. הצבע כהה היום — זה טבעי',
  'הפיגמנט מתחמצן ומכהה',
  'לא לקלף! תני לגלד ליפול לבד',
  'שלב ה-ghosting',
  'הצבע מתייצב. שמרי על הגנה מהשמש',
  'הגיע הזמן לקבוע תור לטאצ׳ אפ',
];
const LEGACY_EN_PATTERNS = [
  'day one - perfect',
  'keep the area clean and dry. color is dark today',
  'the pigment oxidizes and darkens',
  "don't peel!",
  'ghosting phase',
  'color is stabilizing. protect from sun exposure',
  'time to schedule your touch-up',
];

function isLegacyTimelineOverride(quoteHe?: string | null, quoteEn?: string | null): boolean {
  const he = (quoteHe || '').trim().toLowerCase();
  const en = (quoteEn || '').trim().toLowerCase();
  if (!he && !en) return false;
  const matchesHe = LEGACY_HE_PATTERNS.some((pattern) => he.includes(pattern.toLowerCase()));
  const matchesEn = LEGACY_EN_PATTERNS.some((pattern) => en.includes(pattern.toLowerCase()));
  return matchesHe || matchesEn;
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

    // 2b. Per-client healing phases (cloned at treatment finish) — primary daily content source
    const { data: clientPhaseRows } = await supabase
      .from('client_healing_phases')
      .select('client_id, treatment_type, day_start, day_end, title_he, title_en, steps_he, steps_en, sort_order');

    const clientPhasesMap = new Map<string, ClientHealingPhase[]>();
    for (const row of (clientPhaseRows ?? []) as ClientHealingPhase[]) {
      if (!clientPhasesMap.has(row.client_id)) clientPhasesMap.set(row.client_id, []);
      clientPhasesMap.get(row.client_id)!.push(row);
    }

    // 2c. Global healing phases — fallback when a client has no cloned phases, keyed by treatment prefix
    const { data: globalPhaseRows } = await supabase
      .from('healing_phases')
      .select('treatment_type, day_start, day_end, title_he, title_en, steps_he, steps_en, sort_order');

    const globalPhasesMap = new Map<string, HealingPhase[]>();
    for (const row of (globalPhaseRows ?? []) as HealingPhase[]) {
      const prefix = getTreatmentPrefix(row.treatment_type);
      if (!prefix) continue;
      if (!globalPhasesMap.has(prefix)) globalPhasesMap.set(prefix, []);
      globalPhasesMap.get(prefix)!.push(row);
    }

    // 2d. Artist journey-text overrides (timeline_content). The journey editor is eyebrows-only and
    //     keys overrides by step_index = 0-based phase order, so these apply to 'brows' clients only.
    const { data: timelineRows } = await supabase
      .from('timeline_content')
      .select('artist_profile_id, step_index, quote_he, quote_en');

    const timelineMap = new Map<string, Map<number, TimelineOverride>>();
    for (const row of (timelineRows ?? []) as { artist_profile_id: string; step_index: number; quote_he: string | null; quote_en: string | null }[]) {
      if (!timelineMap.has(row.artist_profile_id)) timelineMap.set(row.artist_profile_id, new Map());
      timelineMap.get(row.artist_profile_id)!.set(row.step_index, { quote_he: row.quote_he, quote_en: row.quote_en });
    }

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

    // 5. Fetch all already-sent notification days keyed by client_id
    const { data: sentLogs } = await supabase
      .from('push_notification_log')
      .select('client_id, day');

    const sentDaysMap = new Map<string, Set<number>>();
    for (const row of (sentLogs ?? [])) {
      if (!sentDaysMap.has(row.client_id)) sentDaysMap.set(row.client_id, new Set());
      sentDaysMap.get(row.client_id)!.add(row.day);
    }

    // Compute "today" in the artist/client's local timezone (Israel), not the
    // edge runtime's UTC clock — otherwise the day rollover happens ~2-3
    // hours late/early relative to Israel midnight.
    const israelTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
    const [iy, im, id] = israelTodayStr.split('-').map(Number);
    const today = new Date(Date.UTC(iy, im - 1, id));

    let pushesSent = 0;
    let fallbacksCreated = 0;
    const results: { client: string; day: number; action: string; lang: string }[] = [];

    // Helper: build a message from the healing-journey phase covering `dayNum`.
    // Uses the client's cloned phases, falling back to the global phase set for the treatment.
    // For 'brows' clients, a non-legacy artist override (timeline_content) replaces the body text.
    const resolvePhaseMessage = (
      client: { id: string; full_name: string; artist_id: string; treatment_type: string },
      dayNum: number,
      clientLang: Lang,
      treatmentPrefix: string | null,
      artistName: string,
    ): { text: string; label: string } | null => {
      let phases: HealingPhase[] | undefined = clientPhasesMap.get(client.id);
      if (!phases || phases.length === 0) {
        phases = treatmentPrefix ? globalPhasesMap.get(treatmentPrefix) : undefined;
      }
      if (!phases || phases.length === 0) return null;

      const sorted = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      let phaseIndex = -1;
      for (let i = 0; i < sorted.length; i++) {
        if (dayNum >= sorted[i].day_start && dayNum <= sorted[i].day_end) { phaseIndex = i; break; }
      }
      if (phaseIndex === -1) return null;
      const phase = sorted[phaseIndex];

      const title = clientLang === 'en'
        ? (phase.title_en || phase.title_he)
        : (phase.title_he || phase.title_en);

      let body: string | null = null;

      // Artist journey-text override — eyebrows-only (the editor authors timeline_content for brows).
      if (treatmentPrefix === 'brows') {
        const override = timelineMap.get(client.artist_id)?.get(phaseIndex);
        if (override && !isLegacyTimelineOverride(override.quote_he, override.quote_en)) {
          const q = clientLang === 'en' ? override.quote_en : override.quote_he;
          if (q && q.trim()) body = q.trim();
        }
      }

      // Otherwise use a care step, rotating across the days within the phase so the text varies.
      if (!body) {
        const steps = (clientLang === 'en' ? phase.steps_en : phase.steps_he) ?? [];
        const validSteps = steps.filter((s) => s && s.trim());
        if (validSteps.length > 0) {
          const offset = Math.max(0, dayNum - phase.day_start);
          body = validSteps[offset % validSteps.length];
        }
      }

      if (!body) body = title;

      return {
        text: replacePlaceholders(body, client.full_name, artistName),
        label: title,
      };
    };

    // Helper: resolve message for a given day.
    // Priority: (1) per-day automated-message override → (2) healing-journey phase content
    // (with artist journey edits layered) → (3) legacy global aftercare_% template → null.
    const resolveMessage = (
      client: { id: string; full_name: string; artist_id: string; treatment_type: string; preferred_lang: string },
      dayNum: number,
    ): { text: string; label: string } | null => {
      const clientLang: Lang = client.preferred_lang === 'en' ? 'en' : 'he';
      const treatmentPrefix = getTreatmentPrefix(client.treatment_type);
      const artistName = profileNameMap.get(client.artist_id) ?? '';

      // 1. Per-day automated-message override (artist saved/seeded drafts: lips 1/3/10, brows 1/4/10)
      const artistSettings = artistSettingsMap.get(client.artist_id);
      if (artistSettings) {
        const resolved = resolveFromArtistSettings(artistSettings, dayNum, clientLang, treatmentPrefix);
        if (resolved) {
          return {
            text: replacePlaceholders(resolved, client.full_name, artistName),
            label: clientLang === 'en' ? `Day ${dayNum}` : `יום ${dayNum}`,
          };
        }
      }

      // 2. Healing-journey phase content for this day (the daily driver, days 1–30)
      const phaseMsg = resolvePhaseMessage(client, dayNum, clientLang, treatmentPrefix, artistName);
      if (phaseMsg) return phaseMsg;

      // 3. Legacy global fallback (message_templates aftercare_day_N) — kept for backward compat
      const fallback = fallbackDayMessages.find((d: { day: number }) => d.day === dayNum);
      if (!fallback) return null;
      return {
        text: replacePlaceholders(fallback.text, client.full_name, artistName),
        label: fallback.label,
      };
    };

    // Helper: send a push for one client + day and log it on success
    const sendAndLog = async (
      client: { id: string; full_name: string; push_opted_in: boolean; preferred_lang: string; artist_id: string; treatment_type: string },
      dayNum: number,
    ): Promise<{ action: string }> => {
      const clientLang: Lang = client.preferred_lang === 'en' ? 'en' : 'he';
      const msg = resolveMessage(client, dayNum);
      if (!msg) return { action: 'no_message' };

      if (!client.push_opted_in) return { action: 'whatsapp_fallback' };

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('client_id', client.id);

      if (!subs || subs.length === 0) return { action: 'no_subscription_fallback' };

      let anySuccess = false;
      for (const sub of subs) {
        try {
          const { error: pushErr } = await supabase.functions.invoke('send-push', {
            body: {
              subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
              title: `${msg.label} ✨`,
              body: msg.text.substring(0, 200),
              url: `/c/${client.id}`,
              day: dayNum,
            },
          });
          if (!pushErr) anySuccess = true;
          else console.error(`Push failed for ${client.full_name} day ${dayNum}:`, pushErr);
        } catch (e) {
          console.error(`Push exception for ${client.full_name} day ${dayNum}:`, e);
        }
      }

      if (anySuccess) {
        // Log the send so we never re-send this day
        await supabase.from('push_notification_log').upsert(
          { client_id: client.id, day: dayNum, sent_at: new Date().toISOString() },
          { onConflict: 'client_id,day' },
        );
        if (!sentDaysMap.has(client.id)) sentDaysMap.set(client.id, new Set());
        sentDaysMap.get(client.id)!.add(dayNum);
        return { action: 'push_sent' };
      }

      return { action: 'push_failed_fallback' };
    };

    for (const client of clients) {
      // treatment_date is a plain YYYY-MM-DD column; parse its Y/M/D parts
      // directly as a UTC-midnight-equivalent so the diff below is a pure
      // calendar-day count, matching `today`'s Israel-local computation above.
      const [ty, tm, td] = client.treatment_date.split('-').map(Number);
      const treatmentDate = new Date(Date.UTC(ty, tm - 1, td));
      const daysSince = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Day 0 is handled immediately on treatment completion — skip it here
      if (daysSince <= 0) continue;

      const clientLang: Lang = client.preferred_lang === 'en' ? 'en' : 'he';
      const alreadySent = sentDaysMap.get(client.id) ?? new Set<number>();

      // Determine which days need to be sent:
      // 1. Today's scheduled notification (if not already sent)
      // 2. Most recent missed day (if today was already sent or there's a gap)
      const daysToSend: number[] = [];

      // Find the most recent missed day (scanning backwards from today-1)
      for (let d = daysSince - 1; d >= 1; d--) {
        if (!alreadySent.has(d) && resolveMessage(client, d) !== null) {
          daysToSend.push(d); // only the most recent missed day to avoid spam
          break;
        }
      }

      // Add today if not yet sent
      if (!alreadySent.has(daysSince)) {
        daysToSend.push(daysSince);
      }

      for (const dayNum of daysToSend) {
        const { action } = await sendAndLog(client, dayNum);
        results.push({ client: client.full_name, day: dayNum, action, lang: clientLang });
        if (action === 'push_sent') pushesSent++;
        else if (action !== 'no_message') fallbacksCreated++;
        else console.warn(`[aftercare-cron] no_message: ${client.full_name} (${client.treatment_type}) day ${dayNum} — no override, phase, or template content resolved`);
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
