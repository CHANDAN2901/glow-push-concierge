import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const FormLinkResolver = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!code) { setError(true); return; }

    const resolve = async () => {
      const { data, error: err } = await supabase
        .from('form_links')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (err || !data) { setError(true); return; }

      // Check if already completed (single-use link)
      if ((data as any).is_completed) {
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
      if ((data as any).client_id) params.set('client_id', (data as any).client_id);
      params.set('start', new Date().toISOString().split('T')[0]);
      // Pass the form_link code as token for single-use validation
      params.set('form_token', code);

      navigate(`/health-declaration?${params.toString()}`, { replace: true });
    };

    resolve();
  }, [code, navigate]);

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center" dir="rtl">
        <div className="max-w-sm mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)' }}>
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-lg font-bold text-foreground">הצהרת הבריאות מולאה בהצלחה</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            הצהרת הבריאות מולאה ונשמרה בהצלחה. לכל שינוי או עדכון, אנא פני למאפרת שלך.
          </p>
          <p className="text-xs text-muted-foreground">
            Health declaration was already submitted. For any changes, please contact your artist.
          </p>
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
