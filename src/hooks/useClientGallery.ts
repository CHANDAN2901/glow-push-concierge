import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SharedGalleryPhoto {
  id: string;
  client_id: string;
  artist_id: string;
  storage_path: string;
  public_url: string;
  photo_type: 'healing' | 'collage';
  label: string | null;
  day_number: number | null;
  uploaded_by: 'artist' | 'client';
  seen_by_client: boolean;
  created_at: string;
}

// Validate if string looks like a UUID
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function useClientGallery(clientId: string | undefined, artistId?: string) {
  const [photos, setPhotos] = useState<SharedGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);

  // Resolve clientId: if it's a UUID use directly, otherwise look up by name
  useEffect(() => {
    if (!clientId) { setResolvedClientId(null); return; }
    if (isUUID(clientId)) {
      setResolvedClientId(clientId);
      return;
    }
    // Try to find by name
    supabase
      .from('clients')
      .select('id')
      .eq('full_name', clientId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setResolvedClientId(data?.id || null);
      });
  }, [clientId]);

  const fetchPhotos = useCallback(async () => {
    if (!resolvedClientId) { setPhotos([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('client_gallery_photos')
        .select('*')
        .eq('client_id', resolvedClientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const typed = (data || []) as unknown as SharedGalleryPhoto[];
      setPhotos(typed);
      setNewCount(typed.filter(p => !p.seen_by_client && p.uploaded_by === 'artist').length);
    } catch (e) {
      console.error('Failed to fetch gallery:', e);
    } finally {
      setLoading(false);
    }
  }, [resolvedClientId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Realtime subscription
  useEffect(() => {
    if (!resolvedClientId) return;
    const channel = supabase
      .channel(`gallery-${resolvedClientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'client_gallery_photos',
        filter: `client_id=eq.${resolvedClientId}`,
      }, () => {
        fetchPhotos();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [resolvedClientId, fetchPhotos]);

  // Resolve artistId if not provided (from current user profile or existing photos)
  const [resolvedArtistId, setResolvedArtistId] = useState<string | null>(artistId || null);
  
  useEffect(() => {
    if (artistId && isUUID(artistId)) {
      setResolvedArtistId(artistId);
      return;
    }
    // Try to get from current auth user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setResolvedArtistId(data.id);
        });
    });
  }, [artistId]);

  // Fallback: if no artistId resolved yet, try to get it from existing photos
  useEffect(() => {
    if (resolvedArtistId) return;
    if (photos.length > 0 && photos[0].artist_id) {
      setResolvedArtistId(photos[0].artist_id);
    }
  }, [resolvedArtistId, photos]);

  const uploadPhoto = useCallback(async (
    base64Data: string,
    opts: { photoType?: 'healing' | 'collage'; label?: string; dayNumber?: number; uploadedBy?: 'artist' | 'client' } = {}
  ) => {
    const cId = resolvedClientId;
    const aId = resolvedArtistId;
    if (!cId || !aId) throw new Error('Missing clientId or artistId');
    const { photoType = 'healing', label, dayNumber, uploadedBy = 'artist' } = opts;

    const fileName = `${photoType}-${Date.now()}.jpg`;
    const safeClientId = cId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const { data, error } = await supabase.functions.invoke('upload-client-photo', {
      body: {
        artistProfileId: aId,
        clientId: safeClientId,
        category: `gallery-${photoType}`,
        base64Data,
        fileName,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const { error: insertError } = await supabase
      .from('client_gallery_photos')
      .insert({
        client_id: cId,
        artist_id: aId,
        storage_path: data.storagePath,
        public_url: data.url,
        photo_type: photoType,
        label: label || null,
        day_number: dayNumber ?? null,
        uploaded_by: uploadedBy,
        seen_by_client: uploadedBy === 'client',
      } as any);

    if (insertError) throw insertError;
    await fetchPhotos();
    return data.url;
  }, [resolvedClientId, resolvedArtistId, fetchPhotos]);

  const deletePhoto = useCallback(async (photoId: string) => {
    const { error } = await supabase
      .from('client_gallery_photos')
      .delete()
      .eq('id', photoId);
    if (error) throw error;
    await fetchPhotos();
  }, [fetchPhotos]);

  const markAllSeen = useCallback(async () => {
    if (!resolvedClientId) return;
    await supabase
      .from('client_gallery_photos')
      .update({ seen_by_client: true } as any)
      .eq('client_id', resolvedClientId)
      .eq('seen_by_client', false);
    setNewCount(0);
  }, [resolvedClientId]);

  return {
    photos,
    loading,
    newCount,
    resolvedClientId,
    resolvedArtistId,
    uploadPhoto,
    deletePhoto,
    markAllSeen,
    refetch: fetchPhotos,
  };
}
