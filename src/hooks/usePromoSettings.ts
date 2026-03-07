import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromoSettings {
  tag_text: string;
  title: string;
  description: string;
  button_text: string;
  button_url: string;
  is_enabled: boolean;
}

const DEFAULTS: PromoSettings = {
  tag_text: 'פינוק ללקוחות חוזרות ✨',
  title: 'להשלמת המראה',
  description: 'אהבת את הגבות החדשות? השלימי את המראה עם פיגמנט שפתיים בטכניקת אקוורל עדינה! קבלי 15% הנחה לטיפול נוסף כלקוחה קיימת.',
  button_text: 'לפרטים ותיאום 💋',
  button_url: '',
  is_enabled: true,
};

export function usePromoSettings(artistProfileId: string | null | undefined) {
  const [promo, setPromo] = useState<PromoSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchPromo = useCallback(async () => {
    if (!artistProfileId) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('promo_settings' as any)
        .select('tag_text, title, description, button_text, button_url, is_enabled')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();
      if (data) {
        setPromo({
          tag_text: (data as any).tag_text ?? DEFAULTS.tag_text,
          title: (data as any).title ?? DEFAULTS.title,
          description: (data as any).description ?? DEFAULTS.description,
          button_text: (data as any).button_text ?? DEFAULTS.button_text,
          button_url: (data as any).button_url ?? DEFAULTS.button_url,
          is_enabled: (data as any).is_enabled ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to fetch promo settings:', err);
    } finally {
      setLoading(false);
    }
  }, [artistProfileId]);

  useEffect(() => { fetchPromo(); }, [fetchPromo]);

  const savePromo = useCallback(async (settings: PromoSettings) => {
    if (!artistProfileId) return false;
    try {
      const payload = {
        artist_profile_id: artistProfileId,
        ...settings,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('promo_settings' as any)
        .upsert(payload as any, { onConflict: 'artist_profile_id' });
      if (error) throw error;
      setPromo(settings);
      return true;
    } catch (err) {
      console.error('Failed to save promo settings:', err);
      return false;
    }
  }, [artistProfileId]);

  return { promo, loading, savePromo, refetch: fetchPromo };
}
