import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FormLinkResolver = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }

    const resolve = async () => {
      const { data, error: err } = await supabase
        .from('form_links')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (err || !data) { setError(true); return; }

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
      if ((data as any).client_id) params.set('client_id', (data as any).client_id);
      params.set('start', new Date().toISOString().split('T')[0]);

      navigate(`/health-declaration?${params.toString()}`, { replace: true });
    };

    resolve();
  }, [code, navigate]);

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
