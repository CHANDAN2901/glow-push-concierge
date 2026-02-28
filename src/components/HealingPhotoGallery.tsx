import { useState, useRef, useCallback } from 'react';
import { Camera, X, Check, Calendar as CalendarIcon, Layers, Download } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import html2canvas from 'html2canvas';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import glowPushLogo from '@/assets/glowpush-logo.png';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface HealingPhotoGalleryProps {
  clientId: string;
  clientName: string;
  treatmentDate?: string | null;
  artistId?: string;
}

const HealingPhotoGallery = ({ clientId, clientName, treatmentDate, artistId }: HealingPhotoGalleryProps) => {
  const { photos, loading, uploadPhoto, deletePhoto, resolvedArtistId } = useClientGallery(clientId, artistId);
  const [collageMode, setCollageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCollage, setShowCollage] = useState(false);
  const [savingCollage, setSavingCollage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const getDayLabel = (photoDate: string) => {
    if (!treatmentDate) return null;
    const days = differenceInDays(new Date(photoDate), new Date(treatmentDate));
    return days >= 0 ? days : null;
  };

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !resolvedArtistId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const dayNum = getDayLabel(new Date().toISOString());
      const label = dayNum !== null ? `יום ${dayNum}` : undefined;
      await uploadPhoto(base64, { photoType: 'healing', label, dayNumber: dayNum ?? undefined, uploadedBy: 'artist' });
      toast({ title: 'התמונה נשמרה בהצלחה ✨' });
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
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } catch {
      toast({ title: 'שגיאה במחיקה', variant: 'destructive' });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(sid => sid !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const selectedPhotos = selectedIds
    .map(id => photos.find(p => p.id === id))
    .filter(Boolean);

  const createCollage = () => {
    if (selectedPhotos.length !== 2) {
      toast({ title: 'בחרי בדיוק 2 תמונות', variant: 'destructive' });
      return;
    }
    setShowCollage(true);
    setCollageMode(false);
  };

  const saveCollageToDevice = useCallback(async () => {
    if (!collageRef.current || !resolvedArtistId) return;
    setSavingCollage(true);
    try {
      const canvas = await html2canvas(collageRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast({ title: 'שגיאה ביצירת הקולאז׳', variant: 'destructive' });
          setSavingCollage(false);
          return;
        }

        // Save collage to shared gallery
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          await uploadPhoto(dataUrl, { photoType: 'collage', label: 'קולאז׳ לפני ואחרי', uploadedBy: 'artist' });
        } catch (e) {
          console.error('Collage save to gallery error:', e);
        }

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `collage_${clientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ title: 'הקולאז׳ נשמר בהצלחה! ✨' });
        setSavingCollage(false);
      }, 'image/jpeg', 0.92);
    } catch (err) {
      console.error('Collage save error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
      setSavingCollage(false);
    }
  }, [clientName, resolvedArtistId, uploadPhoto]);

  const sortedPhotos = [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#ffffff', border: `2.5px solid ${GOLD}`, color: GOLD_DARK }}
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'מעלה...' : 'הוסיפי תמונה'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />

        {sortedPhotos.length >= 2 && (
          <button
            onClick={() => { setCollageMode(!collageMode); setSelectedIds([]); setShowCollage(false); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98]"
            style={{
              background: collageMode ? GOLD_GRADIENT : '#ffffff',
              border: collageMode ? 'none' : `2.5px solid ${GOLD}`,
              color: collageMode ? '#5C4033' : GOLD_DARK,
            }}
          >
            <Layers className="w-4 h-4" />
            {collageMode ? 'ביטול בחירה' : 'צור קולאז׳ לפני ואחרי'}
          </button>
        )}
      </div>

      {collageMode && (
        <p className="text-center text-xs font-serif" style={{ color: GOLD_DARK }}>
          ✨ בחרי 2 תמונות ליצירת קולאז׳ ({selectedIds.length}/2)
        </p>
      )}

      {/* Gallery grid */}
      {sortedPhotos.length === 0 ? (
        <div className="text-center py-8">
          <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: GOLD_DARK }} />
          <p className="text-sm font-serif" style={{ color: GOLD_DARK }}>
            עדיין אין תמונות החלמה 📸
          </p>
          <p className="text-xs mt-1 font-light" style={{ color: '#888' }}>
            הוסיפי תמונות כדי לעקוב אחרי תהליך ההחלמה
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5" dir="rtl">
          {sortedPhotos.map((photo) => {
            const isSelected = selectedIds.includes(photo.id);

            return (
              <div
                key={photo.id}
                className={`relative rounded-xl overflow-hidden shadow-sm border transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-offset-1 scale-[0.97]' : 'hover:shadow-md hover:scale-[1.02]'
                }`}
                style={{
                  borderColor: isSelected ? GOLD : `${GOLD}40`,
                  background: '#ffffff',
                }}
                onClick={() => collageMode ? toggleSelect(photo.id) : null}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img src={photo.public_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />

                  {/* Selection overlay */}
                  {collageMode && isSelected && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GOLD_GRADIENT }}>
                        <Check className="w-4 h-4" style={{ color: '#5C4033' }} />
                      </div>
                    </div>
                  )}

                  {/* Delete button (not in collage mode) */}
                  {!collageMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm z-10"
                    >
                      <X className="w-2.5 h-2.5" style={{ color: GOLD_DARK }} />
                    </button>
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

                  {/* Collage badge */}
                  {photo.photo_type === 'collage' && (
                    <span
                      className="absolute bottom-1 right-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10"
                      style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
                    >
                      קולאז׳
                    </span>
                  )}
                </div>

                {/* Date label */}
                <div className="px-1.5 py-1 flex items-center gap-1">
                  <CalendarIcon className="w-2.5 h-2.5 shrink-0" style={{ color: GOLD_DARK }} />
                  <span className="text-[9px] font-serif font-semibold" style={{ color: '#333' }}>
                    {format(new Date(photo.created_at), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create collage button */}
      {collageMode && selectedIds.length === 2 && (
        <div className="flex justify-center">
          <button
            onClick={createCollage}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98]"
            style={{
              background: GOLD_GRADIENT,
              color: '#5C4033',
              boxShadow: '0 4px 16px -2px rgba(212,175,55,0.5)',
            }}
          >
            <Layers className="w-4 h-4" />
            צור קולאז׳ ✨
          </button>
        </div>
      )}

      {/* Collage preview */}
      {showCollage && selectedPhotos.length === 2 && (
        <div className="space-y-3 animate-fade-up">
          <div
            ref={collageRef}
            className="relative w-full rounded-2xl overflow-hidden shadow-lg border-2"
            style={{ borderColor: GOLD, background: '#ffffff' }}
          >
            <div className="flex" style={{ aspectRatio: '2/1' }}>
              <div className="w-1/2 relative overflow-hidden">
                <img src={selectedPhotos[1]!.public_url} alt="After" className="w-full h-full object-cover" crossOrigin="anonymous" />
                <span className="absolute bottom-2 left-2 text-white text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                  אחרי ✨
                </span>
              </div>
              <div className="w-[2px] flex-shrink-0" style={{ backgroundColor: GOLD }} />
              <div className="w-1/2 relative overflow-hidden">
                <img src={selectedPhotos[0]!.public_url} alt="Before" className="w-full h-full object-cover" crossOrigin="anonymous" />
                <span className="absolute bottom-2 right-2 text-white text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                  לפני
                </span>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#fefcf7' }}>
              <div className="flex items-center gap-2">
                <img src={glowPushLogo} alt="Glow Push" className="h-6 w-auto object-contain" />
              </div>
              <div className="text-right">
                <p className="text-xs font-serif font-bold" style={{ color: GOLD_DARK }}>{clientName}</p>
                <p className="text-[9px] font-light" style={{ color: '#999' }}>
                  {format(new Date(), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={saveCollageToDevice}
              disabled={savingCollage}
              className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: GOLD_GRADIENT,
                color: '#5C4033',
                boxShadow: '0 4px 16px -2px rgba(212,175,55,0.5)',
              }}
            >
              <Download className="w-4 h-4" />
              {savingCollage ? 'שומר...' : 'שמירת קולאז׳ לגלריה'}
            </button>
          </div>

          <button
            onClick={() => { setShowCollage(false); setSelectedIds([]); }}
            className="w-full text-center text-xs font-serif py-2 transition-all"
            style={{ color: GOLD_DARK }}
          >
            ביטול
          </button>
        </div>
      )}
    </div>
  );
};

export default HealingPhotoGallery;
