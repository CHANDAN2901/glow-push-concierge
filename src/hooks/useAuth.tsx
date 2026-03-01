import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdmin = async (userId: string) => {
      setRoleLoading(true);
      const { data } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' as const });
      if (!isMounted) return;
      setIsAdmin(!!data);
      setRoleLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            void checkAdmin(session.user.id);
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
        void checkAdmin(session.user.id);
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
    await supabase.auth.signOut();
  };

  return { user, loading, isAdmin, roleLoading, signOut };
}
