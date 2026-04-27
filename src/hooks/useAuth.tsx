import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { resolveIsAdmin } from '@/lib/admin-auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async (currentUser: User) => {
      setRoleLoading(true);
      const { data } = await supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'admin' as const });
      if (!isMounted) return;
      const resolvedIsAdmin = resolveIsAdmin(currentUser, !!data);
      setIsAdmin(resolvedIsAdmin);
      setRoleLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            void checkAdmin(session.user);
          }, 0);
        } else {
          setIsAdmin(false);
          setRoleLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        void checkAdmin(session.user);
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[signOut] supabase signOut failed', e);
    }

    // Clear local + session storage so no stale auth/role/cache survives
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('[signOut] storage clear failed', e);
    }

    // Unregister service workers so the next load fetches fresh JS
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.warn('[signOut] sw unregister failed', e);
    }

    // Wipe Cache Storage (PWA / workbox caches holding old bundles)
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      console.warn('[signOut] cache clear failed', e);
    }

    // Force a full reload bypassing the bfcache so the new bundle loads
    window.location.replace('/auth');
  };

  return { user, loading, isAdmin, roleLoading, signOut };
}
