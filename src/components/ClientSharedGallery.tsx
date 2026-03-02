import { forwardRef, useState, useEffect, useRef } from 'react';
import { Camera, X, Calendar as CalendarIcon, Download, Sparkles } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { useClientGallery, type SharedGalleryPhoto } from '@/hooks/useClientGallery';
import { toast } from '@/hooks/use-toast';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface ClientSharedGalleryProps {
  clientId: string;
  artistId?: string;
}

const ClientSharedGallery = forwardRef<HTMLDivElement, ClientSharedGalleryProps>(({ clientId, artistId }, ref) => {
  const { photos, loading, newCount, markAllSeen, uploadPhoto, resolvedArtistId } = useClientGallery(clientId, artistId);
  const [selected, setSelected] = useState<SharedGalleryPhoto | null>(null);
  const [notifShown, setNotifShown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Show notification when new photos arrive
  useEffect(() => {
    if (newCount > 0 && !notifShown) {
      toast({ title: 'המאפרת שלך העלתה תמונה חדשה למסע ההחלמה! 📸✨' });
      setNotifShown(true);
    }
  }, [newCount, notifShown]);

  // Mark all as seen when gallery is viewed
  useEffect(() => {
    if (newCount > 0 && photos.length > 0) {
      markAllSeen();
    }
  }, [photos.length]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await uploadPhoto(base64, { photoType: 'healing', uploadedBy: 'client' });
      toast({ title: 'התמונה הועלתה בהצלחה! 📸✨' });
    } catch (err) {
      console.error('Client upload error:', err);
      toast({ title: 'שגיאה בהעלאת התמונה', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatPhotoDate = (raw: string, formatPattern: string) => {
    const parsed = new Date(raw);
    return isValid(parsed) ? format(parsed, formatPattern) : '';
  };

  const handleSaveToDevice = async (photo: SharedGalleryPhoto) => {
    try {
      const response = await fetch(photo.public_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `healing-${photo.photo_type}-${formatPhotoDate(photo.created_at, 'yyyyMMdd') || 'unknown-date'}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'התמונה נשמרה! 📸' });
    } catch {
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin w-5 h-5 border-2 rounded-full" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const sorted = [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div ref={ref}>
      {/* Upload button */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#ffffff', border: `2.5px solid ${GOLD}`, color: GOLD_DARK }}
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'מעלה...' : 'העלאת תמונה 📸'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
      <p className="text-center text-[11px] font-serif -mt-1 mb-3" style={{ color: '#999' }}>
        צלמי תמונה ברורה של אזור הטיפול
      </p>

      {/* New badge */}
      {newCount > 0 && (
        <div className="flex items-center justify-center gap-2 mb-3 p-2.5 rounded-2xl" style={{ background: 'hsl(40 50% 94%)' }}>
          <Sparkles className="w-4 h-4" style={{ color: GOLD_DARK }} />
          <span className="text-xs font-medium" style={{ color: GOLD_DARK }}>
            {newCount} תמונות חדשות מהמאפרת שלך! ✨
          </span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-6">
          <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: GOLD_DARK }} />
          <p className="text-xs font-serif" style={{ color: GOLD_DARK }}>
            עדיין אין תמונות בגלריה 📸
          </p>
          <p className="text-[10px] mt-1" style={{ color: '#999' }}>
            העלי תמונה כדי לתעד את תהליך ההחלמה שלך
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5" dir="rtl">
          {sorted.map((photo) => {
            const isNew = !photo.seen_by_client && photo.uploaded_by === 'artist';

            return (
              <div
                key={photo.id}
                className="relative rounded-xl overflow-hidden shadow-sm border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
                style={{ borderColor: `${GOLD}40`, background: '#ffffff' }}
                onClick={() => setSelected(photo)}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img src={photo.public_url} alt="" className="w-full h-full object-cover" />

                  {/* New badge */}
                  {isNew && (
                    <span
                      className="absolute top-1 left-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse"
                      style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
                    >
                      חדש ✨
                    </span>
                  )}

                  {/* Day badge */}
                  {photo.day_number !== null && (
                    <span
                      className="absolute top-1 right-1 text-[8px] font-bold px-2 py-0.5 rounded-full z-10"
                      style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
                    >
                      יום {photo.day_number}
                    </span>
                  )}


                  {/* Client upload badge */}
                  {photo.uploaded_by === 'client' && (
                    <span
                      className="absolute bottom-1 left-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10"
                      style={{ background: 'hsl(350 50% 93%)', color: '#5C4033' }}
                    >
                      שלי
                    </span>
                  )}
                </div>

                <div className="px-1.5 py-1 flex items-center gap-1">
                  <CalendarIcon className="w-2.5 h-2.5 shrink-0" style={{ color: GOLD_DARK }} />
                  <span className="text-[9px] font-serif font-semibold" style={{ color: '#333' }}>
                    {formatPhotoDate(photo.created_at, 'dd/MM/yyyy') || '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fullscreen preview */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border-2"
            style={{ borderColor: GOLD }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selected.public_url} alt="" className="w-full" />
            <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-white/90 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
                <span className="text-sm font-serif font-semibold" style={{ color: '#333' }}>
                  {formatPhotoDate(selected.created_at, 'dd/MM/yyyy') || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveToDevice(selected)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: GOLD_GRADIENT }}
                >
                  <Download className="w-4 h-4" style={{ color: '#5C4033' }} />
                </button>
                <button
                  onClick={() => setSelected(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
                >
                  <X className="w-4 h-4" style={{ color: GOLD_DARK }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ClientSharedGallery;
