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

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export function useClientGallery(clientId: string | undefined, artistId?: string) {
  const [photos, setPhotos] = useState<SharedGalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [resolvedArtistId, setResolvedArtistId] = useState<string | null>(artistId || null);

  // Resolve clientId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) { setResolvedClientId(null); return; }
      if (isUUID(clientId)) { setResolvedClientId(clientId); return; }
      const name = clientId.trim();
      if (!name) { setResolvedClientId(null); return; }
      const exact = await supabase.from('clients').select('id').eq('full_name', name).limit(1).maybeSingle();
      if (cancelled) return;
      if (exact.data?.id) { setResolvedClientId(exact.data.id); return; }
      const fuzzy = await supabase.from('clients').select('id').ilike('full_name', name).limit(1).maybeSingle();
      if (!cancelled) setResolvedClientId(fuzzy.data?.id || null);
    })().catch(() => { if (!cancelled) setResolvedClientId(null); });
    return () => { cancelled = true; };
  }, [clientId]);

  // Resolve artistId
  useEffect(() => {
    if (artistId && isUUID(artistId)) { setResolvedArtistId(artistId); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setResolvedArtistId(data.id); });
    });
  }, [artistId]);

  // Fallback: derive artist from client record
  useEffect(() => {
    if (resolvedArtistId || !resolvedClientId || !isUUID(resolvedClientId)) return;
    supabase.from('clients').select('artist_id').eq('id', resolvedClientId).limit(1).maybeSingle()
      .then(({ data }) => { if (data?.artist_id) setResolvedArtistId(data.artist_id); });
  }, [resolvedArtistId, resolvedClientId]);

  // Fetch photos — ALWAYS filter by client_id to prevent data leakage
  const fetchPhotos = useCallback(async () => {
    if (!resolvedClientId) { setPhotos([]); setLoading(false); setFetchError(null); return; }
    setFetchError(null);
    try {
      const query = supabase
        .from('client_gallery_photos')
        .select('*')
        .eq('client_id', resolvedClientId)
        .order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      const typed = (data || []) as unknown as SharedGalleryPhoto[];
      setPhotos(typed);
      setNewCount(typed.filter(p => !p.seen_by_client && p.uploaded_by === 'artist').length);
    } catch (e: any) {
      const message = e?.message || 'Unknown gallery fetch error';
      console.error('Gallery fetch failed', { supabaseError: e });
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [resolvedClientId]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  // Realtime subscription — strictly scoped to client_id
  useEffect(() => {
    if (!resolvedClientId) return;
    const channel = supabase
      .channel(`gallery-${resolvedClientId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_gallery_photos', filter: `client_id=eq.${resolvedClientId}` }, () => fetchPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resolvedClientId, fetchPhotos]);

  // Upload — clientId is optional, falls back to artistId
  const uploadPhoto = useCallback(async (
    base64Data: string,
    opts: { photoType?: 'healing' | 'collage'; label?: string; dayNumber?: number; uploadedBy?: 'artist' | 'client' } = {}
  ) => {
    const aId = resolvedArtistId;
    if (!aId) throw new Error('Artist profile not loaded yet. Please wait a moment and try again.');
    const cId = resolvedClientId || aId;

    if (base64Data.length > 10 * 1024 * 1024) throw new Error('File is too large (max 10MB).');
    if (base64Data.includes('data:') && !base64Data.startsWith('data:image/')) throw new Error('Only images (JPG, PNG, WEBP) are supported.');

    const { photoType = 'healing', label, dayNumber, uploadedBy = 'artist' } = opts;
    const fileName = `${photoType}-${Date.now()}.jpg`;
    const safeClientId = cId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const { data, error } = await supabase.functions.invoke('upload-client-photo', {
      body: { artistProfileId: aId, clientId: safeClientId, category: `gallery-${photoType}`, base64Data, fileName },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const { error: insertError } = await supabase.from('client_gallery_photos').insert({
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
    const { error } = await supabase.from('client_gallery_photos').delete().eq('id', photoId);
    if (error) throw error;
    await fetchPhotos();
  }, [fetchPhotos]);

  const markAllSeen = useCallback(async () => {
    if (!resolvedClientId) return;
    await supabase.from('client_gallery_photos').update({ seen_by_client: true } as any)
      .eq('client_id', resolvedClientId).eq('seen_by_client', false);
    setNewCount(0);
  }, [resolvedClientId]);

  return { photos, loading, fetchError, newCount, resolvedClientId, resolvedArtistId, uploadPhoto, deletePhoto, markAllSeen, refetch: fetchPhotos };
}
