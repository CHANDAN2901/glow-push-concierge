import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, Download, Pencil, X, Wand2, RotateCcw } from 'lucide-react';
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

// Validate if string looks like a UUID
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

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
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [collageErrorMessage, setCollageErrorMessage] = useState<string | null>(null);
  const [fetchErrorMessage, setFetchErrorMessage] = useState<string | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'before' | 'after'>('before');
  const [editingSrc, setEditingSrc] = useState('');
  const [autoSaved, setAutoSaved] = useState(false);
  const [aligning, setAligning] = useState(false);
  const [alignedImage, setAlignedImage] = useState<string | null>(null);
  const alignedResultRef = useRef<HTMLDivElement>(null);

  const clearCollageSelection = useCallback(() => {
    setBeforeUrl('');
    setAfterUrl('');
    setAutoSaved(false);
    setUploadErrorMessage(null);
    setCollageErrorMessage(null);
    setFetchErrorMessage(null);
  }, []);

  // Resolve clientId: if it's a UUID use directly, otherwise look up by name
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  useEffect(() => {
    if (!clientId) { setResolvedClientId(null); return; }
    if (isUUID(clientId)) { setResolvedClientId(clientId); return; }
    // Look up by name
    const resolve = async () => {
      const { data } = await supabase
        .from('clients')
        .select('id')
        .ilike('full_name', clientId.trim())
        .limit(1)
        .maybeSingle();
      setResolvedClientId(data?.id || null);
    };
    resolve();
  }, [clientId]);

  // Reset collage slots ONLY when switching to a different client/artist
  const prevClientRef = useRef(clientId);
  const prevArtistRef = useRef(artistProfileId);
  useEffect(() => {
    if (prevClientRef.current !== clientId || prevArtistRef.current !== artistProfileId) {
      clearCollageSelection();
      setSavedToGallery(false);
      prevClientRef.current = clientId;
      prevArtistRef.current = artistProfileId;
    }
  }, [clientId, artistProfileId, clearCollageSelection]);

  // Sync initial prop images (only when they first appear, not on every render)
  useEffect(() => {
    if (beforeImg && !beforeUrl) setBeforeUrl(beforeImg);
  }, [beforeImg]);
  useEffect(() => {
    if (afterImg && !afterUrl) setAfterUrl(afterImg);
  }, [afterImg]);

  const hasBefore = !!beforeUrl && beforeUrl !== PLACEHOLDER;
  const hasAfter = !!afterUrl && afterUrl !== PLACEHOLDER;
  const hasBoth = hasBefore && hasAfter;

  const handleUpload = useCallback(async (file: File, category: 'before' | 'after') => {
    const setUploading = category === 'before' ? setUploadingBefore : setUploadingAfter;
    const setUrl = category === 'before' ? setBeforeUrl : setAfterUrl;

    // Validate file format
    if (!file.type.startsWith('image/')) {
      const msg = isHe ? 'פורמט לא נתמך. נא להעלות תמונה (JPG, PNG, WEBP)' : 'Unsupported format. Please upload an image (JPG, PNG, WEBP).';
      setUploadErrorMessage(msg);
      toast({ title: msg, variant: 'destructive' });
      return;
    }
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const msg = isHe ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)';
      setUploadErrorMessage(msg);
      toast({ title: msg, variant: 'destructive' });
      return;
    }

    const fileName = `${category}-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`;
    const safeClientId = (resolvedClientId || artistProfileId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bucketPath = `${artistProfileId || 'unknown-artist'}/${safeClientId || 'no-client'}/${category}/${fileName}`;

    setUploading(true);
    setUploadErrorMessage(null);
    try {
      const base64 = await normalizeImageOrientation(file);

      if (!artistProfileId) {
        setUrl(base64);
        toast({ title: isHe ? 'התמונה נטענה ✨' : 'Photo loaded ✨' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('upload-client-photo', {
        body: { artistProfileId, clientId: resolvedClientId || artistProfileId || clientId, category, base64Data: base64, fileName },
      });
      if (error) throw new Error(error.message || 'Upload failed');
      if (data?.error) throw new Error(data.error);
      setUrl(data.url);
      toast({ title: isHe ? 'התמונה הועלתה בהצלחה ✨' : 'Photo uploaded successfully ✨' });
    } catch (e: any) {
      const { data: { user } } = await supabase.auth.getUser();
      const message = e?.message || (isHe ? 'נסי שוב' : 'Please try again');
      console.error('Healing single image upload failed', {
        userId: user?.id || null,
        fileName,
        bucketPath,
        supabaseError: e,
      });
      setUploadErrorMessage(message);
      toast({ title: isHe ? `שגיאה בהעלאה: ${message}` : `Upload failed: ${message}`, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [artistProfileId, clientId, resolvedClientId, isHe, toast]);
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

  // AI Auto-Align handler
  const handleAiAlign = useCallback(async () => {
    if (!beforeUrl || !afterUrl || beforeUrl === PLACEHOLDER || afterUrl === PLACEHOLDER) {
      toast({ title: isHe ? 'יש להעלות שתי תמונות (לפני ואחרי)' : 'Please upload both Before and After photos', variant: 'destructive' });
      return;
    }
    setAligning(true);
    setAlignedImage(null);
    try {
      const toBase64 = async (src: string): Promise<string> => {
        if (src.startsWith('data:')) return src;
        const res = await fetch(src);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      };
      const [b64Before, b64After] = await Promise.all([toBase64(beforeUrl), toBase64(afterUrl)]);

      const { data, error } = await supabase.functions.invoke('ai-align', {
        body: {
          beforeUrl: b64Before,
          afterUrl: b64After,
          artistProfileId: artistProfileId || 'general',
        },
      });

      if (error) throw error;
      if (data?.error === 'rate_limit') {
        toast({ title: isHe ? 'יותר מדי בקשות, נסי שוב בעוד רגע' : 'Rate limit reached, try again shortly', variant: 'destructive' });
        return;
      }
      if (data?.error === 'payment_required') {
        toast({ title: isHe ? 'נגמרו קרדיטים של AI' : 'AI credits depleted', variant: 'destructive' });
        return;
      }
      if (data?.error) throw new Error(data.error);

      const url = data?.alignedUrl;
      if (!url) throw new Error('No result from AI');
      setAlignedImage(url);
      toast({ title: isHe ? 'הקולאז׳ מוכן! ✨' : 'Collage is ready! ✨' });
      setTimeout(() => {
        alignedResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    } catch (err: any) {
      console.error('AI align error:', err);
      toast({ title: isHe ? 'שגיאה ביישור AI' : 'AI alignment failed', description: err?.message, variant: 'destructive' });
    } finally {
      setAligning(false);
    }
  }, [beforeUrl, afterUrl, artistProfileId, isHe, toast]);
  const autoSaveCollage = useCallback(async () => {
    if (!collageRef.current || !artistProfileId || autoSaved) return;
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
        body: { artistProfileId, clientId: resolvedClientId || artistProfileId, category: 'collage', base64Data: base64, fileName: `collage-${Date.now()}.jpg` },
      });
      if (!error) {
        setAutoSaved(true);
        console.log('Collage auto-saved to client card');
      }
    } catch (e) {
      console.error('Auto-save collage failed:', e);
    }
  }, [artistProfileId, resolvedClientId, autoSaved]);

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
    if (!collageRef.current || !hasBoth || !artistProfileId) return;

    const effectiveClientId = resolvedClientId || artistProfileId;
    const fileName = `collage-${Date.now()}.jpg`;
    const safeClientId = (effectiveClientId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const bucketPath = `${artistProfileId}/${safeClientId}/gallery-collage/${fileName}`;

    setSavingToGallery(true);
    setCollageErrorMessage(null);
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
          clientId: effectiveClientId,
          category: 'gallery-collage',
          base64Data: base64,
          fileName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save to client_gallery_photos table
      const { error: insertError } = await supabase
        .from('client_gallery_photos')
        .insert({
          client_id: effectiveClientId,
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
      clearCollageSelection();
      toast({ title: isHe ? 'הקולאז׳ נשמר בגלריה! 🎉' : 'Collage saved to gallery! 🎉' });
    } catch (e: any) {
      const { data: { user } } = await supabase.auth.getUser();
      const message = e?.message || (isHe ? 'שגיאה לא ידועה' : 'Unknown save error');
      console.error('Collage save failed', {
        userId: user?.id || null,
        fileName,
        bucketPath,
        supabaseError: e,
      });
      setCollageErrorMessage(message);
      toast({ title: isHe ? `שגיאה בשמירה לגלריה: ${message}` : `Save to gallery failed: ${message}`, variant: 'destructive' });
    } finally {
      setSavingToGallery(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border mb-6 shadow-sm animate-fade-up opacity-0 overflow-hidden" style={{ animationDelay: '350ms' }}>
      {/* Collage */}
      <div ref={collageRef} className="px-5 pt-6 pb-3 relative" style={{ background: '#ffffff' }}>
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
        {/* AI processing overlay - keeps images visible underneath */}
        {aligning && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 z-10 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-sm font-serif font-semibold text-foreground/80">
              {isHe ? 'מיישר תמונות עם AI...' : 'Aligning with AI...'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 pt-3 flex flex-col items-center gap-3">
        {/* AI Auto-Align Button - always visible */}
        <button
          onClick={handleAiAlign}
          disabled={!hasBoth || aligning}
          className="relative inline-flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-[0.98] overflow-hidden"
          style={{
            background: aligning
              ? 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #B8860B 100%)'
              : 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
            color: '#3a2a1a',
            boxShadow: hasBoth && !aligning
              ? '0 0 20px rgba(212, 175, 55, 0.5), 0 0 40px rgba(212, 175, 55, 0.2), 0 4px 14px -2px rgba(212, 175, 55, 0.4)'
              : '0 2px 8px rgba(0,0,0,0.1)',
            border: 'none',
            animation: hasBoth && !aligning ? 'ai-glow-pulse 2s ease-in-out infinite' : 'none',
          }}
        >
          {aligning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          {aligning
            ? (isHe ? 'מיישר עם AI...' : 'Aligning with AI...')
            : (isHe ? '✨ יישור אוטומטי עם AI' : '✨ Auto-Align with AI')}
        </button>

        {(hasBefore || hasAfter) && (
          <button
            onClick={() => {
              clearCollageSelection();
              setSavedToGallery(false);
              setAlignedImage(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all border border-border text-muted-foreground hover:bg-muted/50"
          >
            <X className="w-4 h-4" />
            {isHe ? 'נקה בחירה' : 'Clear Selection'}
          </button>
        )}

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

        {/* AI Aligned Result Preview */}
        {alignedImage && (
          <div ref={alignedResultRef} className="w-full flex flex-col items-center gap-3 mt-2">
            <p className="text-xs font-serif font-semibold tracking-widest uppercase text-accent">
              {isHe ? 'תוצאת יישור AI' : 'AI Aligned Result'}
            </p>
            <div className="w-full rounded-2xl overflow-hidden shadow-lg border-2 border-accent/50">
              <img src={alignedImage} alt="AI Aligned Collage" className="w-full h-auto" />
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={() => {
                  setEditingSrc(alignedImage);
                  setEditingCategory('after');
                  setEditorOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold font-serif transition-all hover:scale-105 border border-accent/50 text-accent"
              >
                <Pencil className="w-3.5 h-3.5" />
                {isHe ? 'עריכה ידנית' : 'Manual Edit'}
              </button>
              <button
                onClick={() => {
                  if (!alignedImage) return;
                  const link = document.createElement('a');
                  link.download = `aligned-collage-${Date.now()}.png`;
                  link.href = alignedImage;
                  link.target = '_blank';
                  link.click();
                  toast({ title: isHe ? 'הקולאז׳ המיושר נשמר ✨' : 'Aligned collage saved ✨' });
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold font-serif transition-all hover:scale-105 border border-accent/50 text-accent"
              >
                <Download className="w-3.5 h-3.5" />
                {isHe ? 'הורדה' : 'Download'}
              </button>
              <button
                onClick={() => setAlignedImage(null)}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold font-serif transition-all hover:scale-105 border border-destructive/50 text-destructive"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isHe ? 'ניקוי' : 'Clear'}
              </button>
            </div>
          </div>
        )}

        {savedToGallery && (
          <p className="text-center text-[10px] text-accent font-medium">
            {isHe ? '✅ הקולאז׳ נשמר בגלריה המשותפת' : '✅ Collage saved to shared gallery'}
          </p>
        )}
        {(fetchErrorMessage || uploadErrorMessage || collageErrorMessage) && (
          <div className="space-y-1">
            {fetchErrorMessage && <p className="text-center text-xs text-destructive">{fetchErrorMessage}</p>}
            {uploadErrorMessage && <p className="text-center text-xs text-destructive">{uploadErrorMessage}</p>}
            {collageErrorMessage && <p className="text-center text-xs text-destructive">{collageErrorMessage}</p>}
          </div>
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
