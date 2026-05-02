import { useState, useEffect, useContext, createContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { resolveIsAdmin } from '@/lib/admin-auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  roleLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

    try {
      const PRESERVE_PREFIXES = ['push_', 'notif_', 'vapid', 'subscription_', 'glow-lang'];
      const preserved: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && PRESERVE_PREFIXES.some((p) => key.toLowerCase().includes(p))) {
          const v = localStorage.getItem(key);
          if (v !== null) preserved[key] = v;
        }
      }
      localStorage.clear();
      sessionStorage.clear();
      for (const [k, v] of Object.entries(preserved)) {
        localStorage.setItem(k, v);
      }
    } catch (e) {
      console.warn('[signOut] storage clear failed', e);
    }

    window.location.replace('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, roleLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
