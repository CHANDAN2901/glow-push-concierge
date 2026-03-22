import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://glowpush.app",
  "https://www.glowpush.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

export interface AuthResult {
  userId: string;
  profileId: string;
  role: string;
}

export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
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

    // Get profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    return {
      userId: user.id,
      profileId: profile?.id || user.id,
      role: profile?.role || "user",
    };
  } catch (e) {
    console.error("Auth error:", e);
    return null;
  }
}

export function createAuthErrorResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Authentication required. Please log in." }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function createForbiddenErrorResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "You don't have permission to perform this action." }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function validateUrl(urlString: string, allowInternal = false): boolean {
  try {
    const url = new URL(urlString);
    
    // Block internal/private IPs unless explicitly allowed
    if (!allowInternal) {
      const hostname = url.hostname.toLowerCase();
      
      // Block localhost
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
        return false;
      }
      
      // Block internal IP ranges
      if (/^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.|^192\.168\./.test(hostname)) {
        return false;
      }
      
      // Block AWS metadata endpoint
      if (hostname === "169.254.169.254") {
        return false;
      }
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

export function validateBase64Size(base64String: string, maxSizeMB: number = 10): boolean {
  // Remove data URL prefix if present
  const base64Content = base64String.includes(",") 
    ? base64String.split(",")[1] 
    : base64String;
  
  // Calculate approximate size in MB (base64 is ~33% larger than binary)
  const sizeInBytes = (base64Content.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  return sizeInMB <= maxSizeMB;
}

export function isBase64Image(base64String: string): boolean {
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(base64String) ||
         /^[A-Za-z0-9+/=]{20,}$/.test(base64String);
}

export function extractContentType(base64String: string): string {
  if (base64String.includes("image/png")) return "image/png";
  if (base64String.includes("image/webp")) return "image/webp";
  if (base64String.includes("image/gif")) return "image/gif";
  return "image/jpeg";
}
