import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import { useI18n } from '@/lib/i18n';

const ROSE = '#d8b4b4';
const ROSE_DARK = '#4a3636';

interface HealingPhotoGalleryProps {
  clientId: string;
  clientName: string;
  treatmentDate?: string | null;
  artistId?: string;
}

const HealingPhotoGallery = ({ clientId, clientName, treatmentDate, artistId }: HealingPhotoGalleryProps) => {
  const { photos, loading, fetchError, uploadPhoto, deletePhoto, resolvedArtistId } = useClientGallery(clientId, artistId);
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [uploading, setUploading] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setLightboxUrl(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxUrl]);

  const getDayLabel = (photoDate: string) => {
    if (!treatmentDate) return null;
    const days = differenceInDays(new Date(photoDate), new Date(treatmentDate));
    return days >= 0 ? days : null;
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!resolvedArtistId) {
      const msg = isHe ? 'טוען פרטי סטודיו, נסי שוב בעוד רגע' : 'Loading studio details, please try again shortly';
      setUploadErrorMessage(msg);
      toast({ title: msg, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    setUploadErrorMessage(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const dayNum = getDayLabel(new Date().toISOString());
      const label = dayNum !== null ? (isHe ? `יום ${dayNum}` : `Day ${dayNum}`) : undefined;
      await uploadPhoto(base64, { photoType: 'healing', label, dayNumber: dayNum ?? undefined, uploadedBy: 'artist' });
      toast({ title: isHe ? 'נשמר בהצלחה ✅' : 'Saved successfully ✅' });
    } catch (err: any) {
      const message = err?.message || 'Unknown upload error';
      setUploadErrorMessage(message);
      toast({ title: isHe ? `שגיאה בהעלאת התמונה: ${message}` : `Upload failed: ${message}`, variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await deletePhoto(id);
    } catch {
      toast({ title: isHe ? 'שגיאה במחיקה' : 'Delete failed', variant: 'destructive' });
    }
  };

  const downloadLightboxPhoto = useCallback(async () => {
    if (!lightboxUrl) return;
    try {
      const res = await fetch(lightboxUrl);
      const blob = await res.blob();
      const fileName = `photo-${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Healing Photo' });
        toast({ title: isHe ? 'נפתח חלון שיתוף ✅' : 'Share dialog opened ✅' });
        return;
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({ title: isHe ? 'התמונה הורדה בהצלחה 📥' : 'Photo downloaded 📥' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      toast({ title: isHe ? 'שגיאה בהורדה' : 'Download failed', variant: 'destructive' });
    }
  }, [lightboxUrl, isHe]);

  const sortedPhotos = [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: ROSE, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lightboxUrl && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.92)' }}
          role="dialog" aria-modal="true"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxUrl(null); }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxUrl(null); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ zIndex: 100000, backgroundColor: 'rgba(255,255,255,0.2)' }}
            aria-label="Close"
          >
            <X className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadLightboxPhoto(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{ zIndex: 100000, backgroundColor: 'rgba(255,255,255,0.2)' }}
            aria-label="Download"
          >
            <Download className="w-6 h-6 text-white" />
          </button>
          <img
            src={lightboxUrl} alt="Enlarged photo" className="rounded-lg"
            style={{ zIndex: 100000, maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !resolvedArtistId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(8px)',
            border: `1.5px solid ${ROSE}`,
            color: ROSE_DARK,
            boxShadow: '0 4px 16px rgba(216, 180, 180, 0.2)',
          }}
        >
          <Camera className="w-4 h-4" style={{ color: ROSE }} />
          {uploading
            ? (isHe ? 'מעלה...' : 'Uploading...')
            : !resolvedArtistId
              ? (isHe ? 'טוען פרופיל...' : 'Loading profile...')
              : (isHe ? 'הוסיפי תמונה' : 'Add Photo')}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />
      </div>

      {(fetchError || uploadErrorMessage) && (
        <div className="space-y-1">
          {fetchError && <p className="text-center text-xs text-destructive">{fetchError}</p>}
          {uploadErrorMessage && <p className="text-center text-xs text-destructive">{uploadErrorMessage}</p>}
        </div>
      )}

      {sortedPhotos.length === 0 ? (
        <div className="text-center py-8">
          <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: GOLD_DARK }} />
          <p className="text-sm font-serif" style={{ color: GOLD_DARK }}>
            {isHe ? 'עדיין אין תמונות החלמה 📸' : 'No healing photos yet 📸'}
          </p>
          <p className="text-xs mt-1 font-light" style={{ color: '#888' }}>
            {isHe ? 'הוסיפי תמונות כדי לעקוב אחרי תהליך ההחלמה' : 'Add photos to track the healing process'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5" dir={isHe ? 'rtl' : 'ltr'}>
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="relative rounded-xl overflow-hidden shadow-sm border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02]"
              style={{ borderColor: `${GOLD}40`, background: '#ffffff' }}
              onClick={() => setLightboxUrl(photo.public_url)}
            >
              <div className="aspect-square overflow-hidden relative">
                <img src={photo.public_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                <button
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm z-10"
                >
                  <X className="w-2.5 h-2.5" style={{ color: GOLD_DARK }} />
                </button>
                {photo.day_number !== null && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold px-2 py-0.5 rounded-full z-10"
                    style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636' }}>
                    {isHe ? `יום ${photo.day_number}` : `Day ${photo.day_number}`}
                  </span>
                )}
                {photo.photo_type === 'collage' && (
                  <span className="absolute bottom-1 right-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10"
                    style={{ background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)', color: '#4a3636' }}>
                    {isHe ? 'קולאז׳' : 'Collage'}
                  </span>
                )}
              </div>
              <div className="px-1.5 py-1 flex items-center gap-1">
                <CalendarIcon className="w-2.5 h-2.5 shrink-0" style={{ color: GOLD_DARK }} />
                <span className="text-[9px] font-serif font-semibold" style={{ color: '#333' }}>
                  {format(new Date(photo.created_at), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HealingPhotoGallery;
