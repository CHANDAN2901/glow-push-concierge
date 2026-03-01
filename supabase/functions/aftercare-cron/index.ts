import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch all aftercare message templates (the artist-editable messages)
    const { data: templates, error: tplErr } = await supabase
      .from('message_templates')
      .select('template_key, default_text, label')
      .like('template_key', 'aftercare_%')
      .order('template_key');

    if (tplErr) throw tplErr;
    if (!templates || templates.length === 0) {
      return new Response(JSON.stringify({ message: 'No aftercare templates found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse day numbers from template keys (aftercare_day_1 → 1)
    const dayMessages = templates.map(t => {
      const match = t.template_key.match(/aftercare_day_(\d+)/);
      return { day: match ? parseInt(match[1]) : 0, text: t.default_text, label: t.label };
    }).filter(d => d.day > 0);

    // 2. Fetch all clients with treatment_date set
    const { data: clients, error: clientErr } = await supabase
      .from('clients')
      .select('id, full_name, artist_id, treatment_date, push_opted_in')
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
    const results: any[] = [];

    for (const client of clients) {
      const treatmentDate = new Date(client.treatment_date);
      treatmentDate.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - treatmentDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if today matches any aftercare day
      const matchingMsg = dayMessages.find(d => d.day === daysSince);
      if (!matchingMsg) continue;

      // Replace placeholders
      const messageText = matchingMsg.text
        .replace(/\[ClientName\]/g, client.full_name)
        .replace(/\[ArtistName\]/g, '');

      if (client.push_opted_in) {
        // Try to send push notification
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth_key')
          .eq('client_id', client.id);

        if (subs && subs.length > 0) {
          for (const sub of subs) {
            try {
              // Call the existing send-push function
              const { error: pushErr } = await supabase.functions.invoke('send-push', {
                body: {
                  subscription: {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth_key },
                  },
                  title: `${matchingMsg.label} ✨`,
                  body: messageText.substring(0, 200),
                  day: matchingMsg.day,
                },
              });
              if (pushErr) {
                console.error(`Push failed for ${client.full_name}:`, pushErr);
                // Create fallback task on push failure
                results.push({ client: client.full_name, day: daysSince, action: 'push_failed_fallback' });
                fallbacksCreated++;
              } else {
                pushesSent++;
                results.push({ client: client.full_name, day: daysSince, action: 'push_sent' });
              }
            } catch (e) {
              console.error(`Push exception for ${client.full_name}:`, e);
              results.push({ client: client.full_name, day: daysSince, action: 'push_error_fallback' });
              fallbacksCreated++;
            }
          }
        } else {
          // Opted in but no subscription found — fallback
          results.push({ client: client.full_name, day: daysSince, action: 'no_subscription_fallback' });
          fallbacksCreated++;
        }
      } else {
        // Not opted in — create WhatsApp fallback task
        results.push({ client: client.full_name, day: daysSince, action: 'whatsapp_fallback' });
        fallbacksCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        pushesSent,
        fallbacksCreated,
        totalClientsScanned: clients.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Aftercare cron error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
