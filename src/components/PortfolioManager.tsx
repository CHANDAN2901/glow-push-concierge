import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { Image, Upload, Trash2, Eye, EyeOff, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const PortfolioManager = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const fetchProfileId = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
    if (data) setProfileId(data.id);
  }, [user]);

  const fetchImages = useCallback(async () => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from('portfolio_images')
      .select('*')
      .eq('artist_profile_id', profileId)
      .order('created_at', { ascending: false });
    if (!error && data) setImages(data as PortfolioImage[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => { fetchProfileId(); }, [fetchProfileId]);
  useEffect(() => { if (profileId) fetchImages(); }, [profileId, fetchImages]);

  // Resize image to max 500px and return data URL
  const resizeToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_W = 500;
        const scale = Math.min(1, MAX_W / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profileId) return;

    setUploading(true);

    // 3-second hard timeout
    const timeout = setTimeout(() => {
      setUploading(false);
      alert('ההעלאה נכשלה — נסי תמונה קטנה יותר');
    }, 3000);

    try {
      const base64 = await resizeToBase64(file);

      const { data, error } = await supabase.from('portfolio_images').insert({
        artist_profile_id: profileId,
        image_url: 'base64',
        base64_data: base64,
        category: 'brows',
        is_public: true,
      } as any).select();

      clearTimeout(timeout);

      if (error) {
        alert('שגיאה: ' + error.message);
      } else {
        toast({ title: 'התמונה הועלתה! ✨' });
        if (data?.[0]) setImages(prev => [data[0] as PortfolioImage, ...prev]);
      }
    } catch (err: any) {
      clearTimeout(timeout);
      alert('שגיאה: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (img: PortfolioImage) => {
    await supabase.from('portfolio_images').delete().eq('id', img.id);
    toast({ title: lang === 'en' ? 'Photo deleted' : 'התמונה נמחקה' });
    fetchImages();
  };

  const handleToggleVisibility = async (img: PortfolioImage) => {
    await supabase.from('portfolio_images').update({ is_public: !img.is_public }).eq('id', img.id);
    fetchImages();
  };

  const handleCategoryChange = async (img: PortfolioImage, category: string) => {
    await supabase.from('portfolio_images').update({ category }).eq('id', img.id);
    fetchImages();
  };

  const filteredImages = filterCategory === 'all'
    ? images
    : images.filter(img => img.category === filterCategory);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-5">
        <Image className="w-5 h-5 text-accent" />
        <h2 className="font-serif font-semibold text-lg">
          {lang === 'en' ? 'Portfolio Manager' : 'מנהל הגלריה'}
        </h2>
      </div>


      {/* Upload — simple visible input */}
      <div className="mb-5 p-4 bg-muted rounded-lg">
        <label className="text-sm font-medium mb-2 block">
          {lang === 'en' ? 'Upload Photo' : 'העלי תמונה'}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-sm"
        />
        {uploading && <p className="text-xs text-muted-foreground mt-2 animate-pulse">מעלה...</p>}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            filterCategory === 'all' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'
          }`}
        >
          {lang === 'en' ? 'All' : 'הכל'}
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              filterCategory === cat.value ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'
            }`}
          >
            {lang === 'en' ? cat.labelEn : cat.labelHe}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="text-center py-8">
          <Image className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {lang === 'en' ? 'No photos yet. Upload your first work!' : 'אין עדיין תמונות. העלי את העבודה הראשונה!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredImages.map(img => (
            <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border bg-muted aspect-square">
              <img
                src={img.base64_data || img.image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {/* Category selector */}
                <Select value={img.category} onValueChange={(v) => handleCategoryChange(img, v)}>
                  <SelectTrigger className="h-7 text-[10px] w-24 bg-card/90 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {lang === 'en' ? cat.labelEn : cat.labelHe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleVisibility(img)}
                    className="w-8 h-8 rounded-full bg-card/90 flex items-center justify-center hover:bg-card transition-colors"
                    title={img.is_public ? 'Make Private' : 'Make Public'}
                  >
                    {img.is_public ? <Eye className="w-3.5 h-3.5 text-accent" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button
                    onClick={() => handleDelete(img)}
                    className="w-8 h-8 rounded-full bg-card/90 flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                <span className="px-1.5 py-0.5 rounded-full bg-card/80 text-[9px] font-medium backdrop-blur-sm">
                  {CATEGORIES.find(c => c.value === img.category)?.[lang === 'en' ? 'labelEn' : 'labelHe'] || img.category}
                </span>
                {!img.is_public && (
                  <span className="px-1.5 py-0.5 rounded-full bg-foreground/70 text-accent-foreground text-[9px] font-medium backdrop-blur-sm">
                    {lang === 'en' ? 'Private' : 'פרטי'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[100] bg-foreground/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-card/20 flex items-center justify-center">
            <X className="w-5 h-5 text-accent-foreground" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;
