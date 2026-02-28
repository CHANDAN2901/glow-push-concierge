import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { Image, X } from 'lucide-react';
import { restSelect } from '@/lib/supabase-rest';

interface PortfolioImage {
  id: string;
  image_url: string;
  base64_data: string | null;
  category: string;
  is_public: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'brows', labelEn: 'Brows', labelHe: 'גבות' },
  { value: 'lips', labelEn: 'Lips', labelHe: 'שפתיים' },
  { value: 'eyeliner', labelEn: 'Eyeliner', labelHe: 'אייליינר' },
  { value: 'other', labelEn: 'Other', labelHe: 'אחר' },
];

interface Props {
  artistProfileId?: string;
}

const PortfolioGallery = ({ artistProfileId }: Props) => {
  const { lang } = useI18n();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    const params = artistProfileId
      ? `artist_profile_id=eq.${artistProfileId}&is_public=eq.true&order=created_at.desc`
      : `is_public=eq.true&order=created_at.desc`;

    restSelect<PortfolioImage>('portfolio_images', params)
      .then(data => { if (!cancelled) { setImages(data); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [artistProfileId]);

  const filtered = filterCategory === 'all' ? images : images.filter(i => i.category === filterCategory);
  const categories = [...new Set(images.map(i => i.category))];

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm animate-fade-up">
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <>
      <div className="bg-card rounded-2xl p-5 border border-border shadow-sm animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Image className="w-4 h-4 text-accent" />
          <h2 className="font-serif font-semibold text-base tracking-wide">
            {lang === 'en' ? 'Portfolio' : 'גלריה'}
          </h2>
        </div>

        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase transition-all ${
                filterCategory === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent/10'
              }`}
            >
              {lang === 'en' ? 'All' : 'הכל'}
            </button>
            {categories.map(cat => {
              const catInfo = CATEGORIES.find(c => c.value === cat);
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase transition-all whitespace-nowrap ${
                    filterCategory === cat ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:bg-accent/10'
                  }`}
                >
                  {catInfo ? (lang === 'en' ? catInfo.labelEn : catInfo.labelHe) : cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Masonry-style grid — Vogue aesthetic */}
        <div className="columns-2 gap-2 space-y-2">
          {filtered.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setLightboxUrl(img.base64_data || img.image_url)}
              className="block w-full overflow-hidden rounded-lg border border-border/50 hover:border-accent/40 transition-all duration-300 hover:shadow-gold break-inside-avoid group"
            >
              <img
                src={img.base64_data || img.image_url}
                alt=""
                loading="lazy"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03] img-fade-in"
                onLoad={(e) => e.currentTarget.classList.add('loaded')}
                style={{ minHeight: i % 3 === 0 ? '180px' : '140px' }}
              />
            </button>
          ))}
        </div>

        <p className="text-center text-[9px] text-muted-foreground tracking-widest uppercase mt-4">
          {lang === 'en' ? `${filtered.length} Works` : `${filtered.length} עבודות`}
        </p>
      </div>

      {/* Lightbox / Zoom */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-foreground/95 flex items-center justify-center p-4 animate-fade-in cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full bg-card/10 backdrop-blur-sm flex items-center justify-center border border-accent-foreground/20 hover:bg-card/20 transition-colors">
            <X className="w-5 h-5 text-accent-foreground" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-[85vh] rounded-xl object-contain animate-scale-in"
            style={{ animationDuration: '0.3s' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default PortfolioGallery;
