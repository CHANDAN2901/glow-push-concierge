import { useState, useRef } from 'react';
import { Camera, X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';

interface ClientPhotoTimelineProps {
  clientId: string;
  artistId?: string;
}

const ClientPhotoTimeline = ({ clientId, artistId }: ClientPhotoTimelineProps) => {
  const { photos, loading, uploadPhoto, deletePhoto } = useClientGallery(clientId, artistId);
  const [selectedPhoto, setSelectedPhoto] = useState<typeof photos[0] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      await uploadPhoto(base64, { photoType: 'healing', label: 'תמונת גלריה' });
      toast({ title: 'התמונה נשמרה בגלריה ✨' });
    } catch (err) {
      console.error('Upload error:', err);
      toast({ title: 'שגיאה בהעלאת התמונה', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await deletePhoto(id);
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const sortedPhotos = [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add photo button */}
      <div className="flex justify-center">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
          style={{
            background: '#ffffff',
            border: `2.5px solid ${GOLD}`,
            color: GOLD_DARK,
          }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {uploading ? 'מעלה...' : 'הוסיפי תמונה לגלריה'}
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
                  src={photo.public_url}
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
                    style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#5C4033' }}
                  >
                    חדש
                  </span>
                )}
              </div>
              <div className="px-2.5 py-1.5 flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3 shrink-0" style={{ color: GOLD_DARK }} />
                <span className="text-[10px] font-serif font-semibold" style={{ color: '#333' }}>
                  {format(new Date(photo.created_at), 'dd/MM/yyyy')}
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
            <img src={selectedPhoto.public_url} alt="" className="w-full" />
            <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-white/90 backdrop-blur-sm flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
                  <span className="text-sm font-serif font-semibold" style={{ color: '#333' }}>
                    {format(new Date(selectedPhoto.created_at), 'dd/MM/yyyy')}
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
