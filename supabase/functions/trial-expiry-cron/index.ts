import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all profiles whose trial has expired
    const { data: expiredTrials, error: fetchError } = await supabase
      .from("profiles")
      .select("id, user_id, email, trial_source, subscription_tier, subscription_status, trial_ends_at")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", new Date().toISOString())
      .in("subscription_status", ["trial", "active"])
      .neq("subscription_tier", "lite");

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({ message: "No expired trials found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ id: string; email: string | null; action: string }> = [];

    for (const profile of expiredTrials) {
      // Determine action based on trial_source
      // ACADEMY users who just finished 3-month trial → mark past_due (prompt 50% off Elite)
      // GRADUATE users → mark past_due (prompt 50% off first month)
      // INFLUENCERS / default → downgrade to lite
      let newTier = "lite";
      let newStatus = "past_due";
      let action = "downgraded_to_lite";

      if (profile.trial_source === "academy_3m" || profile.trial_source === "graduate_30d") {
        // Keep on professional tier but mark as past_due to trigger payment prompt
        newTier = "professional";
        newStatus = "past_due";
        action = "marked_past_due_for_payment";
      } else {
        // Default / influencer → downgrade to lite
        newTier = "lite";
        newStatus = "past_due";
        action = "downgraded_to_lite";
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_tier: newTier,
          subscription_status: newStatus,
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error(`Failed to update profile ${profile.id}:`, updateError.message);
        results.push({ id: profile.id, email: profile.email, action: `error: ${updateError.message}` });
      } else {
        console.log(`Processed profile ${profile.id} (${profile.email}): ${action}`);
        results.push({ id: profile.id, email: profile.email, action });
      }
    }

    return new Response(
      JSON.stringify({ message: "Trial expiry check complete", processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Trial expiry cron error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
