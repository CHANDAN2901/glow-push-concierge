const ADMIN_ONLY_PREFIXES = ['/admin', '/super-admin'];
const ARTIST_ONLY_PREFIXES = ['/artist'];

export function getRoleHomePath(isAdmin: boolean) {
  return isAdmin ? '/super-admin' : '/artist';
}

export function sanitizeRoleDestination(path: string | null | undefined, isAdmin: boolean) {
  if (!path) {
    return getRoleHomePath(isAdmin);
  }

  const [pathname] = path.split('?');

  if (isAdmin && ARTIST_ONLY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return getRoleHomePath(true);
  }

  if (!isAdmin && ADMIN_ONLY_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return getRoleHomePath(false);
  }

  return path;
}
