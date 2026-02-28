import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Calendar as CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

export interface GalleryPhoto {
  id: string;
  date: string;
  dataUrl: string;
  label?: string;
}

interface ClientPhotoTimelineProps {
  clientId: string;
}

const getKey = (clientId: string) => `pmu_gallery_${clientId}`;

/** Load gallery from localStorage */
export const loadGallery = (clientId: string): GalleryPhoto[] => {
  try {
    const saved = localStorage.getItem(getKey(clientId));
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

/** Save a photo to gallery */
export const addToGallery = (clientId: string, dataUrl: string, label?: string): GalleryPhoto[] => {
  const photos = loadGallery(clientId);
  const newPhoto: GalleryPhoto = {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    dataUrl,
    label,
  };
  const updated = [newPhoto, ...photos];
  try {
    localStorage.setItem(getKey(clientId), JSON.stringify(updated));
  } catch (e) {
    console.error('Gallery save error:', e);
  }
  return updated;
};

const ClientPhotoTimeline = ({ clientId }: ClientPhotoTimelineProps) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    setPhotos(loadGallery(clientId));
  }, [clientId]);

  // Expose reload for parent
  const reload = useCallback(() => {
    setPhotos(loadGallery(clientId));
  }, [clientId]);

  // Listen for custom gallery update events
  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('gallery-updated', handler);
    return () => window.removeEventListener('gallery-updated', handler);
  }, [reload]);

  const persist = (updated: GalleryPhoto[]) => {
    setPhotos(updated);
    try {
      localStorage.setItem(getKey(clientId), JSON.stringify(updated));
    } catch (e) {
      console.error('Gallery save error:', e);
    }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = addToGallery(clientId, reader.result as string);
      setPhotos(updated);
      toast({ title: 'התמונה נשמרה בגלריה ✨' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (id: string) => {
    persist(photos.filter(p => p.id !== id));
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
  };

  const sortedPhotos = [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {/* Add photo button */}
      <div className="flex justify-center">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98]"
          style={{
            background: '#ffffff',
            border: `2.5px solid ${GOLD}`,
            color: GOLD_DARK,
          }}
        >
          <Camera className="w-4 h-4" />
          הוסיפי תמונה לגלריה
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAddPhoto}
        />
      </div>

      {/* Gallery grid */}
      {sortedPhotos.length === 0 ? (
        <p className="text-center text-xs font-serif" style={{ color: GOLD_DARK }}>
          עדיין אין תמונות בגלריה 📸
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3" dir="rtl">
          {sortedPhotos.map((photo, idx) => (
            <div
              key={photo.id}
              className="rounded-2xl overflow-hidden shadow-sm border transition-all hover:shadow-md cursor-pointer"
              style={{ borderColor: `${GOLD}50`, background: '#ffffff' }}
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={photo.dataUrl}
                  alt={photo.label || ''}
                  className="w-full h-full object-cover"
                />
                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm z-10"
                >
                  <X className="w-3 h-3" style={{ color: GOLD_DARK }} />
                </button>
                {idx === 0 && (
                  <span
                    className="absolute top-1.5 right-1.5 text-[8px] font-bold px-2 py-0.5 rounded-full z-10"
                    style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
                  >
                    חדש
                  </span>
                )}
              </div>
              <div className="px-2.5 py-1.5 flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3 shrink-0" style={{ color: GOLD_DARK }} />
                <span className="text-[10px] font-serif font-semibold" style={{ color: '#333' }}>
                  {format(new Date(photo.date), 'dd/MM/yyyy')}
                </span>
              </div>
              {photo.label && (
                <div className="px-2.5 pb-1.5">
                  <span className="text-[9px] font-medium" style={{ color: GOLD_DARK }}>
                    {photo.label}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen preview */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border-2"
            style={{ borderColor: GOLD }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedPhoto.dataUrl} alt="" className="w-full" />
            <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-white/90 backdrop-blur-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
                  <span className="text-sm font-serif font-semibold" style={{ color: '#333' }}>
                    {format(new Date(selectedPhoto.date), 'dd/MM/yyyy')}
                  </span>
                </div>
                {selectedPhoto.label && (
                  <span className="text-[10px] font-medium" style={{ color: GOLD_DARK }}>
                    {selectedPhoto.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
              >
                <X className="w-4 h-4" style={{ color: GOLD_DARK }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPhotoTimeline;
