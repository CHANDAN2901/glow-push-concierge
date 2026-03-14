import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FormLinkResolver = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      return;
    }

    const providedToken = searchParams.get('token') || '';
    const providedClientId = searchParams.get('client_id') || '';

    const resolve = async () => {
      const { data, error: err } = await supabase
        .from('form_links')
        .select('code, form_token, client_id, artist_id, client_name, client_phone, treatment_type, artist_phone, logo_url, artist_name, include_policy, is_token_used, is_completed')
        .eq('code', code)
        .maybeSingle();

      if (err || !data) {
        setError(true);
        return;
      }

      const dbToken = (data as any).form_token as string | null;
      const tokenUsed = Boolean((data as any).is_token_used || (data as any).is_completed);

      // If caller provides token, it must match the generated DB token
      if (providedToken && dbToken && providedToken !== dbToken) {
        setError(true);
        return;
      }

      if (tokenUsed) {
        setCompleted(true);
        return;
      }

      // Build the internal health-declaration URL from stored metadata
      const params = new URLSearchParams();
      if (data.client_name) params.set('name', data.client_name);
      if (data.client_phone) params.set('client_phone', data.client_phone || '');
      if ((data as any).treatment_type) params.set('treatment', (data as any).treatment_type);
      if (data.artist_id) params.set('artist_id', data.artist_id);
      if (data.artist_phone) params.set('phone', data.artist_phone || '');
      if (data.logo_url) params.set('logo', data.logo_url || '');
      if ((data as any).artist_name) params.set('artist', (data as any).artist_name);
      if ((data as any).include_policy) params.set('include_policy', 'true');

      const resolvedClientId = ((data as any).client_id as string | null) || providedClientId;
      if (resolvedClientId) params.set('client_id', resolvedClientId);

      const resolvedToken = dbToken || providedToken;
      if (resolvedToken) params.set('token', resolvedToken);

      navigate(`/health-declaration?${params.toString()}`, { replace: true });
    };

    resolve();
  }, [code, navigate, searchParams]);

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center" dir="rtl">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)' }}>
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">הטופס כבר מולא. לא ניתן למלא שוב.</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-lg font-bold text-foreground mb-2">הקישור לא נמצא</p>
          <p className="text-sm text-muted-foreground">Link not found or expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground text-sm">טוען...</div>
    </div>
  );
};

export default FormLinkResolver;
