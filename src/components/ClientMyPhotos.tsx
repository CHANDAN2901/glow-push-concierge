import { useMemo } from 'react';
import { Camera, Calendar as CalendarIcon } from 'lucide-react';
import { format, isValid } from 'date-fns';
import type { SharedGalleryPhoto } from '@/hooks/useClientGallery';

const SOFT_GOLD_DARK = 'hsl(38 55% 42%)';
const CHARCOAL_TEXT = 'hsl(0 0% 20%)';

interface ClientMyPhotosProps {
  clientId: string;
  artistId?: string;
  lang: string;
  gallery: {
    photos: SharedGalleryPhoto[];
    loading: boolean;
  };
}

const ClientMyPhotos = ({ lang, gallery }: ClientMyPhotosProps) => {
  const { photos, loading } = gallery;

  const myPhotos = useMemo(
    () => photos.filter(p => p.uploaded_by === 'client').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [photos]
  );

  if (loading) return null;

  return (
    <div
      className="rounded-3xl p-6 mb-6 animate-fade-up"
      style={{
        animationDelay: '420ms',
        backgroundColor: 'hsl(0 0% 100%)',
        boxShadow: '0 2px 16px hsl(38 35% 82% / 0.3)',
        border: '1px solid hsl(38 35% 90%)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(40 50% 93%)' }}>
          <Camera className="w-5 h-5" style={{ color: SOFT_GOLD_DARK }} />
        </div>
        <h2 className="text-xl tracking-wide" style={{ color: CHARCOAL_TEXT, fontFamily: 'var(--font-serif)', fontWeight: 300 }}>
          {lang === 'en' ? 'Photos I Sent' : 'התמונות ששלחתי'}
        </h2>
      </div>

      {myPhotos.length === 0 ? (
        <p className="text-center text-sm font-light py-4" style={{ color: 'hsl(0 0% 55%)' }}>
          {lang === 'en' ? 'No photos uploaded yet' : 'טרם הועלו תמונות'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5" dir="rtl">
          {myPhotos.map((photo) => {
            const d = new Date(photo.created_at);
            const dateStr = isValid(d) ? format(d, 'dd/MM/yyyy') : '';
            return (
              <div
                key={photo.id}
                className="rounded-xl overflow-hidden border"
                style={{ borderColor: 'hsl(40 40% 88%)', background: 'hsl(0 0% 100%)' }}
              >
                <div className="aspect-square overflow-hidden">
                  <img src={photo.public_url} alt="" className="w-full h-full object-cover" />
                </div>
                {dateStr && (
                  <div className="px-1.5 py-1 flex items-center gap-1">
                    <CalendarIcon className="w-2.5 h-2.5 shrink-0" style={{ color: SOFT_GOLD_DARK }} />
                    <span className="text-[9px] font-serif font-semibold" style={{ color: 'hsl(0 0% 20%)' }}>{dateStr}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientMyPhotos;
