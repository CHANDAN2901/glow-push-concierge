import { useState, useEffect, useCallback, useRef, DragEvent } from 'react';
import { ImagePlus, X, Share2, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface GalleryImage {
  id: string;
  image_url: string;
  base64_data: string | null;
  category: string;
  is_public: boolean;
}

interface PendingFile {
  file: File;
  previewUrl: string;
}

const SimpleGallery = () => {
  const { user } = useAuth();
  const { lang } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('id').eq('user_id', user.id).single()
      .then(({ data }) => { if (data) setProfileId(data.id); });
  }, [user]);

  const fetchImages = useCallback(async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('portfolio_images')
      .select('id, image_url, base64_data, category, is_public')
      .eq('artist_profile_id', profileId)
      .order('created_at', { ascending: false });
    if (data) setImages(data as GalleryImage[]);
  }, [profileId]);

  useEffect(() => { if (profileId) fetchImages(); }, [profileId, fetchImages]);

  const addFiles = (files: FileList | File[]) => {
    const newPending: PendingFile[] = [];
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: lang === 'en' ? 'File too large (max 10MB)' : 'הקובץ גדול מדי (מקסימום 10MB)', variant: 'destructive' });
        return;
      }
      newPending.push({ file, previewUrl: URL.createObjectURL(file) });
    });
    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const removePending = (index: number) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const uploadAll = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);

    const filesToProcess = [...pendingFiles];
    pendingFiles.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPendingFiles([]);

    let successCount = 0;
    let errorCount = 0;
    for (const pending of filesToProcess) {
      try {
        if (!pending.file.type.startsWith('image/')) {
          errorCount++;
          continue;
        }
        if (pending.file.size > 10 * 1024 * 1024) {
          toast({ title: lang === 'en' ? `"${pending.file.name}" is too large (max 10MB)` : `"${pending.file.name}" גדול מדי (מקסימום 10MB)`, variant: 'destructive' });
          errorCount++;
          continue;
        }

        const base64 = await resizeToBase64(pending.file);
        const localId = `local-${Date.now()}-${Math.round(Math.random() * 100000)}`;

        setImages(prev => [{
          id: localId,
          image_url: 'local',
          base64_data: base64,
          category: 'brows',
          is_public: true,
        }, ...prev]);

        if (profileId) {
          // Upload via edge function to storage
          const { data: uploadData, error: uploadErr } = await supabase.functions.invoke('upload-client-photo', {
            body: {
              artistProfileId: profileId,
              clientId: 'portfolio',
              category: 'portfolio',
              base64Data: base64,
              fileName: `portfolio-${Date.now()}.jpg`,
            },
          });

          if (uploadErr || uploadData?.error) {
            const errMsg = uploadErr?.message || uploadData?.error || 'Upload failed';
            console.error('Storage upload error:', errMsg);
            toast({ title: lang === 'en' ? `Failed to upload "${pending.file.name}"` : `שגיאה בהעלאת "${pending.file.name}"`, variant: 'destructive' });
            setImages(prev => prev.filter(i => i.id !== localId));
            errorCount++;
            continue;
          }

          const { error: insertError } = await supabase.from('portfolio_images').insert({
            artist_profile_id: profileId,
            image_url: uploadData.url,
            base64_data: null,
            category: 'brows',
            is_public: true,
          } as any);

          if (insertError) {
            console.error('Portfolio insert error:', insertError);
            toast({ title: lang === 'en' ? `Failed to save "${pending.file.name}"` : `שגיאה בשמירת "${pending.file.name}"`, variant: 'destructive' });
            setImages(prev => prev.filter(i => i.id !== localId));
            errorCount++;
            continue;
          }
        }
        successCount++;
      } catch (err) {
        console.error('Upload error:', err);
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast({ title: lang === 'en' ? `${successCount} photo(s) uploaded! ✅` : `${successCount} תמונות הועלו בהצלחה! ✅` });
    }
    if (errorCount > 0 && successCount === 0) {
      toast({ title: lang === 'en' ? 'Upload failed. Check file format and size.' : 'ההעלאה נכשלה. בדקי פורמט וגודל הקובץ.', variant: 'destructive' });
    }
    // Refresh from DB to get real IDs
    fetchImages();
  };

  const resizeToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new window.Image();
        img.onload = () => {
          const MAX = 1024;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('No canvas')); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('portfolio_images').delete().eq('id', id);
    setImages(prev => prev.filter(i => i.id !== id));
    toast({ title: lang === 'en' ? 'Photo deleted' : 'התמונה נמחקה' });
  };

  const handleShare = async () => {
    const url = window.location.origin + '/card/' + (profileId || '');
    try {
      await navigator.share({ title: 'My Portfolio', url });
    } catch {
      try { await navigator.clipboard.writeText(url); } catch {}
      toast({ title: lang === 'en' ? 'Link copied!' : 'הקישור הועתק!' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif font-medium text-lg tracking-wide" style={{ color: '#1a1a1a' }}>
          {lang === 'en' ? 'Portfolio Gallery' : 'גלריית עבודות'}
        </h2>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 bg-accent text-accent-foreground shadow-gold"
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          {lang === 'en' ? 'Share' : 'שתפי'}
        </button>
      </div>

      {/* Hero Upload Zone */}
      <div
        className={`rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${isDragOver ? 'bg-accent/5 border-accent shadow-[0_0_0_4px_hsl(38_55%_62%/0.1)]' : 'bg-background border-accent/40'}`}
        style={{ border: `2px dashed`, minHeight: 180 }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-accent/10">
          <ImagePlus className="w-8 h-8 text-accent" strokeWidth={1.5} />
        </div>
        <p className="font-serif font-medium text-sm tracking-wide text-center text-accent">
          {lang === 'en' ? 'Click or drag photos here' : 'לחצי או גררי תמונות לכאן'}
        </p>
        <p className="text-[11px] text-muted-foreground">
          PNG, JPG {lang === 'en' ? 'up to' : 'עד'} 10MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* Pending Previews */}
      {pendingFiles.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {pendingFiles.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-accent/30">
                <img src={p.previewUrl} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removePending(i); }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={uploadAll}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold tracking-wide transition-all active:scale-95 disabled:opacity-50 btn-gold-cta"
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            {uploading
              ? (lang === 'en' ? 'Uploading...' : 'מעלה...')
              : (lang === 'en' ? `Upload ${pendingFiles.length} Photo(s)` : `העלי ${pendingFiles.length} תמונות`)}
          </button>
        </div>
      )}

      {/* Existing Photos Grid */}
      {images.length === 0 && pendingFiles.length === 0 ? (
        <div className="rounded-2xl py-12 text-center bg-background border border-border">
          <p className="text-sm font-light text-muted-foreground">
            {lang === 'en' ? 'No photos yet — start building your portfolio ✨' : 'אין עדיין תמונות — התחילי לבנות את הגלריה שלך ✨'}
          </p>
        </div>
      ) : images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {images.filter(img => img.base64_data || (img.image_url && img.image_url !== 'base64')).map(img => (
            <div
              key={img.id}
              className="relative group aspect-[4/5] rounded-2xl overflow-hidden shadow-md"
            >
              <img
                src={img.base64_data || img.image_url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
              >
                <Trash2 className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SimpleGallery;
