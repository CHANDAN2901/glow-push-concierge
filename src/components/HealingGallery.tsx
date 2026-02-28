import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, Download, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import ImageEditorDialog from './ImageEditorDialog';

/**
 * Normalize image orientation: loads image onto a canvas and re-exports
 * so that EXIF rotation is baked in and the image always appears upright.
 * Also ensures portrait orientation (height > width). If the image is
 * landscape, it rotates it 90° clockwise to make it portrait.
 */
const normalizeImageOrientation = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        // Drawing onto canvas automatically applies EXIF orientation in modern browsers
        let { width, height } = img;
        const isLandscape = width > height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        if (isLandscape) {
          // Rotate 90° CW to make it portrait
          canvas.width = height;
          canvas.height = width;
          ctx.translate(height, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, 0, width, height);
        } else {
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

interface HealingGalleryProps {
  beforeImg?: string;
  afterImg?: string;
  startDate?: string;
  artistProfileId?: string;
  clientId?: string;
}

const PLACEHOLDER = '/placeholder.svg';

/* ── ImageCard extracted outside to prevent remount on parent re-render ── */
const ImageCard = ({
  label,
  hasImage,
  imageUrl,
  uploading,
  onUpload,
  onEdit,
}: {
  label: string;
  hasImage: boolean;
  imageUrl: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onEdit?: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-full aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group relative bg-muted/20 border border-border/50 shadow-sm"
        onClick={triggerUpload}
      >
        {hasImage ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center 30%' }}
            crossOrigin="anonymous"
            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-muted/20">
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            ) : (
              <>
                <Upload className="w-5 h-5 text-accent/70" />
                <span className="text-[9px] text-muted-foreground/60">{label}</span>
              </>
            )}
          </div>
        )}
        {hasImage && !uploading && (
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
            <Upload className="w-5 h-5 text-white drop-shadow-lg" />
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="absolute bottom-2 right-2 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-foreground" />
              </button>
            )}
          </div>
        )}
        {uploading && hasImage && (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        )}
      </div>
      <span className="text-[10px] font-serif font-semibold tracking-[0.25em] uppercase text-accent/80">
        {label}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
};

/* ── Main Gallery ── */
const HealingGallery = ({ beforeImg, afterImg, startDate, artistProfileId, clientId }: HealingGalleryProps) => {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const collageRef = useRef<HTMLDivElement>(null);

  const [beforeUrl, setBeforeUrl] = useState(beforeImg || '');
  const [afterUrl, setAfterUrl] = useState(afterImg || '');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingToGallery, setSavingToGallery] = useState(false);
  const [savedToGallery, setSavedToGallery] = useState(false);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'before' | 'after'>('before');
  const [editingSrc, setEditingSrc] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);

  const hasBefore = !!beforeUrl && beforeUrl !== PLACEHOLDER;
  const hasAfter = !!afterUrl && afterUrl !== PLACEHOLDER;
  const hasBoth = hasBefore && hasAfter;

  useEffect(() => {
    if (!artistProfileId || !clientId) return;
    const fetchImages = async () => {
      try {
        const { data } = await supabase
          .from('images_metadata')
          .select('storage_path, category')
          .eq('artist_profile_id', artistProfileId)
          .eq('client_id', clientId)
          .in('category', ['before', 'after']);
        if (data && data.length > 0) {
          for (const img of data) {
            const { data: urlData } = supabase.storage
              .from('client-photos')
              .getPublicUrl(img.storage_path);
            if (img.category === 'before' && !beforeUrl) setBeforeUrl(urlData.publicUrl);
            else if (img.category === 'after' && !afterUrl) setAfterUrl(urlData.publicUrl);
          }
        }
      } catch (e) {
        console.error('Failed to fetch images:', e);
      }
    };
    fetchImages();
  }, [artistProfileId, clientId]);

  const handleUpload = useCallback(async (file: File, category: 'before' | 'after') => {
    const setUploading = category === 'before' ? setUploadingBefore : setUploadingAfter;
    const setUrl = category === 'before' ? setBeforeUrl : setAfterUrl;
    setUploading(true);
    try {
      // Normalize orientation: fix EXIF rotation + force portrait
      const base64 = await normalizeImageOrientation(file);

      if (!artistProfileId) {
        setUrl(base64);
        toast({ title: isHe ? 'התמונה נטענה ✨' : 'Photo loaded ✨' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('upload-client-photo', {
        body: { artistProfileId, clientId, category, base64Data: base64, fileName: `${category}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUrl(data.url);
      toast({ title: isHe ? 'התמונה הועלתה בהצלחה ✨' : 'Photo uploaded successfully ✨' });
    } catch (e: any) {
      console.error('Upload failed:', e);
      toast({ title: isHe ? 'שגיאה בהעלאת התמונה' : 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [artistProfileId, clientId, isHe, toast]);
  const handleUploadBefore = useCallback((f: File) => handleUpload(f, 'before'), [handleUpload]);
  const handleUploadAfter = useCallback((f: File) => handleUpload(f, 'after'), [handleUpload]);

  const handleEditBefore = useCallback(() => {
    if (hasBefore) { setEditingCategory('before'); setEditingSrc(beforeUrl); setEditorOpen(true); }
  }, [hasBefore, beforeUrl]);

  const handleEditAfter = useCallback(() => {
    if (hasAfter) { setEditingCategory('after'); setEditingSrc(afterUrl); setEditorOpen(true); }
  }, [hasAfter, afterUrl]);

  const handleEditorSave = useCallback((editedBase64: string) => {
    if (editingCategory === 'before') setBeforeUrl(editedBase64);
    else setAfterUrl(editedBase64);
    setEditorOpen(false);
    setAutoSaved(false); // trigger re-save
    toast({ title: isHe ? 'התמונה עודכנה ✨' : 'Image updated ✨' });
  }, [editingCategory, isHe, toast]);

  // Auto-save collage when both images are present
  const autoSaveCollage = useCallback(async () => {
    if (!collageRef.current || !artistProfileId || !clientId || autoSaved) return;
    try {
      const clone = collageRef.current.cloneNode(true) as HTMLElement;
      const images = clone.querySelectorAll('img');
      await Promise.all(Array.from(images).map(async (img) => {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          img.removeAttribute('crossorigin');
        } catch { /* keep original */ }
      }));
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      const canvas = await html2canvas(clone, {
        useCORS: false, allowTaint: true, scale: 2, backgroundColor: '#ffffff',
        width: clone.scrollWidth, height: clone.scrollHeight,
      });
      document.body.removeChild(clone);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);
      
      const { error } = await supabase.functions.invoke('upload-client-photo', {
        body: { artistProfileId, clientId, category: 'collage', base64Data: base64, fileName: `collage-${Date.now()}.jpg` },
      });
      if (!error) {
        setAutoSaved(true);
        console.log('Collage auto-saved to client card');
      }
    } catch (e) {
      console.error('Auto-save collage failed:', e);
    }
  }, [artistProfileId, clientId, autoSaved]);

  // Trigger auto-save when both images ready
  const newHasBefore = !!beforeUrl && beforeUrl !== PLACEHOLDER;
  const newHasAfter = !!afterUrl && afterUrl !== PLACEHOLDER;
  const newHasBoth = newHasBefore && newHasAfter;

  useEffect(() => {
    if (newHasBoth && !autoSaved) {
      const timer = setTimeout(autoSaveCollage, 1500);
      return () => clearTimeout(timer);
    }
  }, [newHasBoth, autoSaved, beforeUrl, afterUrl]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!collageRef.current || !hasBoth) return;
    setDownloading(true);
    try {
      const clone = collageRef.current.cloneNode(true) as HTMLElement;
      const images = clone.querySelectorAll('img');
      await Promise.all(Array.from(images).map(async (img) => {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          img.removeAttribute('crossorigin');
        } catch {
          // keep original
        }
      }));
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      const canvas = await html2canvas(clone, {
        useCORS: false,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });
      document.body.removeChild(clone);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `before-after-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: isHe ? 'התמונה נשמרה! 📸' : 'Image saved! 📸' });
    } catch (e) {
      console.error('Download failed:', e);
      toast({ title: isHe ? 'שגיאה בשמירת התמונה' : 'Download failed', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveToGallery = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!collageRef.current || !hasBoth || !artistProfileId || !clientId) return;
    setSavingToGallery(true);
    try {
      const clone = collageRef.current.cloneNode(true) as HTMLElement;
      const images = clone.querySelectorAll('img');
      await Promise.all(Array.from(images).map(async (img) => {
        try {
          const response = await fetch(img.src);
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          img.src = dataUrl;
          img.removeAttribute('crossorigin');
        } catch { /* keep original */ }
      }));
      clone.style.position = 'fixed';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);
      const canvas = await html2canvas(clone, {
        useCORS: false, allowTaint: true, scale: 2, backgroundColor: '#ffffff',
        width: clone.scrollWidth, height: clone.scrollHeight,
      });
      document.body.removeChild(clone);
      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('upload-client-photo', {
        body: {
          artistProfileId,
          clientId: clientId.replace(/[^a-zA-Z0-9_-]/g, '_'),
          category: 'gallery-collage',
          base64Data: base64,
          fileName: `collage-${Date.now()}.jpg`,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save to client_gallery_photos table
      const { error: insertError } = await supabase
        .from('client_gallery_photos')
        .insert({
          client_id: clientId,
          artist_id: artistProfileId,
          storage_path: data.storagePath,
          public_url: data.url,
          photo_type: 'collage',
          label: 'Before & After',
          uploaded_by: 'artist',
          seen_by_client: false,
        } as any);
      if (insertError) throw insertError;

      setSavedToGallery(true);
      toast({ title: isHe ? 'הקולאז׳ נשמר בגלריה! 🎉' : 'Collage saved to gallery! 🎉' });
    } catch (e) {
      console.error('Save to gallery failed:', e);
      toast({ title: isHe ? 'שגיאה בשמירה לגלריה' : 'Save to gallery failed', variant: 'destructive' });
    } finally {
      setSavingToGallery(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border mb-6 shadow-sm animate-fade-up opacity-0 overflow-hidden" style={{ animationDelay: '350ms' }}>
      {/* Collage */}
      <div ref={collageRef} className="px-5 pt-6 pb-3" style={{ background: '#ffffff' }}>
        <div className={`grid grid-cols-2 gap-4 ${isHe ? 'direction-rtl' : ''}`} dir={isHe ? 'rtl' : 'ltr'}>
          <ImageCard
            label={isHe ? 'לפני' : 'Before'}
            hasImage={hasBefore}
            imageUrl={beforeUrl || PLACEHOLDER}
            uploading={uploadingBefore}
            onUpload={handleUploadBefore}
            onEdit={hasBefore ? handleEditBefore : undefined}
          />
          <ImageCard
            label={isHe ? 'אחרי' : 'After'}
            hasImage={hasAfter}
            imageUrl={afterUrl || PLACEHOLDER}
            uploading={uploadingAfter}
            onUpload={handleUploadAfter}
            onEdit={hasAfter ? handleEditAfter : undefined}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 pt-3 flex flex-col items-center gap-3">
        {hasBoth && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 border border-border text-muted-foreground hover:bg-muted/50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isHe ? 'הורדה' : 'Download'}
            </button>
            <button
              onClick={handleSaveToGallery}
              disabled={savingToGallery}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {savingToGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isHe ? 'שמור לגלריה' : 'Save to Gallery'}
            </button>
          </div>
        )}
        {savedToGallery && (
          <p className="text-center text-[10px] text-accent font-medium">
            {isHe ? '✅ הקולאז׳ נשמר בגלריה המשותפת' : '✅ Collage saved to shared gallery'}
          </p>
        )}
        <p className="text-center text-[10px] text-muted-foreground tracking-wide">
          {isHe ? 'קולאז׳ מקצועי מוכן לשיתוף' : 'Professional collage ready to share'}
        </p>
      </div>

      {/* Image Editor */}
      <ImageEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        imageSrc={editingSrc}
        onSave={handleEditorSave}
      />
    </div>
  );
};

export default HealingGallery;
