import type { User } from '@supabase/supabase-js';

const SEEDED_ADMIN_EMAILS = new Set(['admin@glowpush.dev']);

export function isSeededAdminEmail(email: string | null | undefined) {
  return !!email && SEEDED_ADMIN_EMAILS.has(email.toLowerCase());
}

export function resolveIsAdmin(user: Pick<User, 'email'> | null | undefined, hasAdminRole: boolean) {
  return hasAdminRole || isSeededAdminEmail(user?.email);
}
