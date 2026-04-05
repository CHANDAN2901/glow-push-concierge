import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Get profile id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (profile) {
      const profileId = profile.id;

      // Get all client IDs for this artist
      const { data: clients } = await supabaseAdmin
        .from("clients")
        .select("id")
        .eq("artist_id", profileId);

      const clientIds = clients?.map((c: any) => c.id) || [];

      if (clientIds.length > 0) {
        // Delete health declarations
        await supabaseAdmin.from("health_declarations").delete().in("client_id", clientIds);
        // Delete client gallery photos
        await supabaseAdmin.from("client_gallery_photos").delete().in("client_id", clientIds);
        // Delete clients
        await supabaseAdmin.from("clients").delete().eq("artist_id", profileId);
      }

      // Delete other artist data
      await supabaseAdmin.from("appointments").delete().eq("artist_id", profileId);
      await supabaseAdmin.from("portfolio_images").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("images_metadata").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("artist_message_settings").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("timeline_content").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("push_subscriptions").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("products").delete().eq("artist_profile_id", profileId);
      await supabaseAdmin.from("referrals").delete().eq("referrer_profile_id", profileId);
      await supabaseAdmin.from("referrals").delete().eq("referred_profile_id", profileId);
      await supabaseAdmin.from("form_links").delete().eq("artist_id", profileId);

      // Delete profile
      await supabaseAdmin.from("profiles").delete().eq("id", profileId);
    }

    // Delete user roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // Delete the auth user
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
