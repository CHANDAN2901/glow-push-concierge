/**
 * Direct REST helpers for Supabase — bypasses the JS client which sometimes hangs.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function headers(accessToken?: string, prefer?: string) {
  const h: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
  if (prefer) h['Prefer'] = prefer;
  return h;
}

export async function restSelect<T = any>(
  table: string,
  params: string = '',
  accessToken?: string
): Promise<T[]> {
  const sep = params ? '&' : '';
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const res = await fetch(url, { headers: headers(accessToken) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`REST SELECT ${table} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function restUpdate(
  table: string,
  id: string,
  body: Record<string, any>,
  accessToken?: string
): Promise<void> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headers(accessToken, 'return=minimal'),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`REST UPDATE ${table} failed (${res.status}): ${text}`);
  }
}

export function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.access_token || null;
    }
  } catch {}
  return null;
}
