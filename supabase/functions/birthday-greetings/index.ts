import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SECURITY: Authenticate the request
async function authenticateRequest(req: Request): Promise<{ userId: string; role: string } | null> {
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

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    return {
      userId: user.id,
      role: profile?.role || "user",
    };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Require authentication - only artists/admins should access birthday greetings
  const auth = await authenticateRequest(req);
  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Authentication required. Please log in to view birthday greetings." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Only allow artists and admins to access this endpoint
  if (!["artist", "admin", "superadmin"].includes(auth.role)) {
    return new Response(
      JSON.stringify({ error: "Access denied. Only artists and admins can view birthday greetings." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log("[birthday-greetings] Authenticated user:", auth.userId, "Role:", auth.role);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get today's month and day
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    // Find clients with birthday today (match month-day regardless of year)
    const { data: clients, error: clientsErr } = await supabase
      .from("clients")
      .select("id, full_name, phone, artist_id, birth_date")
      .not("birth_date", "is", null)
      .not("phone", "is", null);

    if (clientsErr) throw clientsErr;

    const birthdayClients = (clients || []).filter((c: any) => {
      if (!c.birth_date) return false;
      const bd = c.birth_date; // format: YYYY-MM-DD
      return bd.slice(5, 7) === month && bd.slice(8, 10) === day;
    });

    if (birthdayClients.length === 0) {
      return new Response(
        JSON.stringify({ message: "No birthdays today", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get artist profiles for all relevant artists
    const artistIds = [...new Set(birthdayClients.map((c: any) => c.artist_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, business_phone")
      .in("id", artistIds);

    const artistMap: Record<string, string> = {};
    for (const p of profiles || []) {
      artistMap[p.id] = p.full_name || "המטפלת שלך";
    }

    const results: any[] = [];

    for (const client of birthdayClients) {
      const artistName = artistMap[client.artist_id] || "המטפלת שלך";
      const message = `יום הולדת שמח ${client.full_name}! 🎂✨ מאחלת לך יום מיוחד ומלא אהבה - ${artistName}`;

      // Format phone for WhatsApp (remove leading 0, add 972)
      let waPhone = (client.phone || "").replace(/[-\s]/g, "");
      if (waPhone.startsWith("0")) {
        waPhone = "972" + waPhone.slice(1);
      }

      const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

      results.push({
        clientName: client.full_name,
        phone: client.phone,
        artistName,
        message,
        waUrl,
      });
    }

    return new Response(
      JSON.stringify({ message: "Birthday greetings prepared", count: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("birthday-greetings error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
