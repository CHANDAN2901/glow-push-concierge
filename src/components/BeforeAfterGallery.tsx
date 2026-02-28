import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RefreshCw, Pencil, Save, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ErrorBoundary from '@/components/ErrorBoundary';
import ImageEditorDialog from '@/components/ImageEditorDialog';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface BeforeAfterGalleryProps {
  artistProfileId?: string;
  clientId?: string;
}

const getStorageKey = (clientId?: string) => clientId ? `pmu_ba_photos_${clientId}` : null;

const BeforeAfterGalleryInner = ({ artistProfileId, clientId }: BeforeAfterGalleryProps) => {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingWhich, setEditingWhich] = useState<'before' | 'after'>('before');
  const [editingSrc, setEditingSrc] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingToCard, setSavingToCard] = useState(false);

  // Load saved photos from localStorage on mount
  useEffect(() => {
    const key = getStorageKey(clientId);
    if (!key) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const { before, after } = JSON.parse(saved);
        if (before) setBeforeImage(before);
        if (after) setAfterImage(after);
      }
    } catch {}
  }, [clientId]);

  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  const beforeReplaceRef = useRef<HTMLInputElement>(null);
  const afterReplaceRef = useRef<HTMLInputElement>(null);

  const handleFile = (which: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (which === 'before') setBeforeImage(url);
    else setAfterImage(url);
    e.target.value = '';
  };

  const openEditor = (which: 'before' | 'after') => {
    const src = which === 'before' ? beforeImage : afterImage;
    if (!src) return;
    setEditingWhich(which);
    setEditingSrc(src);
    setEditorOpen(true);
  };

  const handleEditorSave = (editedBase64: string) => {
    if (editingWhich === 'before') setBeforeImage(editedBase64);
    else setAfterImage(editedBase64);
    setEditorOpen(false);
    toast({ title: isHe ? 'התמונה עודכנה ✨' : 'Image updated ✨' });
  };

  const saveToGallery = async (which: 'before' | 'after') => {
    const image = which === 'before' ? beforeImage : afterImage;
    if (!image || !artistProfileId) {
      toast({ title: isHe ? 'חסרים פרטים לשמירה' : 'Missing details', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.functions.invoke('upload-client-photo', {
        body: {
          artistProfileId,
          clientId: clientId || 'general',
          category: which,
          base64Data: image,
          fileName: `${which}-${Date.now()}.jpg`,
        },
      });
      if (res.error) throw res.error;
      toast({ title: isHe ? 'התמונה נשמרה בגלריית הלקוחה ✨' : 'Saved to client gallery ✨' });
    } catch (err: any) {
      console.error('Save to gallery error:', err);
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderSlot = (which: 'before' | 'after') => {
    const image = which === 'before' ? beforeImage : afterImage;
    const uploadRef = which === 'before' ? beforeRef : afterRef;
    const replaceRef = which === 'before' ? beforeReplaceRef : afterReplaceRef;
    const setImage = which === 'before' ? setBeforeImage : setAfterImage;
    const label = which === 'before'
      ? (isHe ? 'לפני הטיפול' : 'Before')
      : (isHe ? 'מיד אחרי' : 'After');

    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-full aspect-square rounded-2xl overflow-hidden relative"
          style={{
            border: image ? `2px solid ${GOLD}` : `2px dashed hsla(38, 55%, 62%, 0.4)`,
            backgroundColor: image ? 'transparent' : 'hsla(38, 55%, 95%, 0.3)',
          }}
        >
          {!image && (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
              onClick={() => uploadRef.current?.click()}
            >
              <Camera className="w-7 h-7" style={{ color: GOLD }} />
              <span className="text-[11px] font-medium" style={{ color: GOLD_DARK }}>
                {isHe ? 'העלאת תמונה' : 'Upload Photo'}
              </span>
            </div>
          )}

          {image && (
            <>
              <img src={image} alt="" className="w-full h-full object-cover" />
              {/* Edit button */}
              <button
                onClick={() => openEditor(which)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
                style={{ background: '#ffffff', border: `2.5px solid ${GOLD}` }}
              >
                <Pencil className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              </button>
              {/* Replace photo button */}
              <button
                onClick={() => replaceRef.current?.click()}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
                style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
              >
                <RefreshCw className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              </button>
              {/* Remove button */}
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md bg-white/80 hover:bg-white"
              >
                <X className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              </button>
            </>
          )}
        </div>
        <span className="text-[10px] font-serif font-semibold tracking-[0.2em] uppercase" style={{ color: GOLD_DARK }}>
          {label}
        </span>
        {/* Save to gallery button */}
        {image && artistProfileId && (
          <button
            onClick={() => saveToGallery(which)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: '#ffffff', border: `2.5px solid ${GOLD}`, color: GOLD_DARK }}
          >
            <Save className="w-3 h-3" />
            {isHe ? 'שמירה בגלריה' : 'Save to Gallery'}
          </button>
        )}
      </div>
    );
  };

  const downloadCollage = useCallback(async () => {
    if (!beforeImage && !afterImage) {
      toast({ title: isHe ? 'אין תמונות להורדה' : 'No images to download', variant: 'destructive' });
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      const size = 600;
      canvas.width = size * 2;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      if (beforeImage) {
        const img = await loadImg(beforeImage);
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      }
      if (afterImage) {
        const img = await loadImg(afterImage);
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, size + (size - w) / 2, (size - h) / 2, w, h);
      }

      ctx.font = 'bold 24px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(size / 2 - 60, size - 44, 120, 34);
      ctx.fillRect(size + size / 2 - 60, size - 44, 120, 34);
      ctx.fillStyle = '#B8860B';
      ctx.fillText(isHe ? 'לפני' : 'Before', size / 2, size - 18);
      ctx.fillText(isHe ? 'אחרי' : 'After', size + size / 2, size - 18);

      const link = document.createElement('a');
      link.download = `collage-${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.92);
      link.click();
      toast({ title: isHe ? 'הקולאז׳ נשמר בהצלחה ✨' : 'Collage saved ✨' });
    } catch (err) {
      console.error('Collage download error:', err);
      toast({ title: isHe ? 'שגיאה בהורדה' : 'Download failed', variant: 'destructive' });
    }
  }, [beforeImage, afterImage, isHe]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4" dir={isHe ? 'rtl' : 'ltr'}>
        {renderSlot('before')}
        {renderSlot('after')}

        <input type="file" accept="image/*" ref={beforeRef} className="hidden"
          onChange={(e) => handleFile('before', e)} />
        <input type="file" accept="image/*" ref={afterRef} className="hidden"
          onChange={(e) => handleFile('after', e)} />
        <input type="file" accept="image/*" ref={beforeReplaceRef} className="hidden"
          onChange={(e) => handleFile('before', e)} />
        <input type="file" accept="image/*" ref={afterReplaceRef} className="hidden"
          onChange={(e) => handleFile('after', e)} />
      </div>

      {(beforeImage || afterImage) && (
        <div className="flex flex-col items-center gap-3 mt-4">
          {/* Save to Client Card button */}
          {clientId && (
            <button
              onClick={async () => {
                if (!beforeImage && !afterImage) return;
                setSavingToCard(true);
                try {
                  // Convert blob URLs to base64 for persistence
                  const toBase64 = async (src: string | null): Promise<string | null> => {
                    if (!src) return null;
                    if (src.startsWith('data:')) return src;
                    const res = await fetch(src);
                    const blob = await res.blob();
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result as string);
                      reader.readAsDataURL(blob);
                    });
                  };
                  const [b64Before, b64After] = await Promise.all([
                    toBase64(beforeImage),
                    toBase64(afterImage),
                  ]);
                  const key = getStorageKey(clientId)!;
                  localStorage.setItem(key, JSON.stringify({ before: b64Before, after: b64After }));
                  toast({ title: isHe ? 'התמונות נשמרו בהצלחה בכרטיס הלקוחה ✨' : 'Photos saved to client card ✨' });
                } catch (err) {
                  console.error('Save to card error:', err);
                  toast({ title: isHe ? 'שגיאה בשמירה' : 'Save failed', variant: 'destructive' });
                } finally {
                  setSavingToCard(false);
                }
              }}
              disabled={savingToCard}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: '#ffffff',
                border: '3px solid transparent',
                borderImage: GOLD_GRADIENT,
                borderImageSlice: 1,
                color: '#333333',
                boxShadow: '0 4px 14px -2px rgba(212, 175, 55, 0.35), 0 2px 4px -1px rgba(0,0,0,0.1)',
              }}
            >
              <Save className="w-4.5 h-4.5" style={{ color: GOLD_DARK }} />
              {savingToCard ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמירה לכרטיס לקוחה' : 'Save to Client Card')}
            </button>
          )}

          {/* Download collage button */}
          <button
            onClick={downloadCollage}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98]"
            style={{
              background: '#ffffff',
              border: `2.5px solid ${GOLD}`,
              color: GOLD_DARK,
            }}
          >
            <Download className="w-3.5 h-3.5" />
            {isHe ? 'הורדה לגלריה' : 'Download Collage'}
          </button>
        </div>
      )}

      <ImageEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        imageSrc={editingSrc}
        onSave={handleEditorSave}
      />
    </>
  );
};

const BeforeAfterGallery = (props: BeforeAfterGalleryProps) => (
  <ErrorBoundary fallbackMessage="שגיאה בטעינת הגלריה">
    <BeforeAfterGalleryInner {...props} />
  </ErrorBoundary>
);

export default BeforeAfterGallery;
