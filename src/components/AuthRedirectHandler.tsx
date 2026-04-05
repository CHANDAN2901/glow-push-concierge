import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Listens for PASSWORD_RECOVERY auth events and redirects to /reset-password.
 * This handles the case where the Supabase redirectTo URL isn't honored
 * and the user lands on the root with recovery tokens in the hash.
 */
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check hash fragment on mount for type=recovery
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery') && location.pathname !== '/reset-password') {
      navigate('/reset-password' + hash, { replace: true });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return null;
};

export default AuthRedirectHandler;
