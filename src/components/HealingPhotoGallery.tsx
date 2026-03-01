import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Check, Calendar as CalendarIcon, Layers, Download, RotateCcw, ZoomIn, ZoomOut, HelpCircle } from 'lucide-react';
import { useGesture } from '@use-gesture/react';
import { format, differenceInDays } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import { supabase } from '@/integrations/supabase/client';
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

interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

const defaultTransform = (): ImageTransform => ({ scale: 1, offsetX: 0, offsetY: 0, rotation: 0 });

// Gesture-powered collage half — uses refs for 60fps DOM updates, syncs to React on gesture end
interface CollageHalfProps {
  index: number;
  imgUrl: string;
  label: string;
  labelPosition: 'left' | 'right';
  transform: ImageTransform;
  isActive: boolean;
  onActivate: () => void;
  onTransformEnd: (index: number, t: ImageTransform) => void;
  isDraggingRef: React.MutableRefObject<boolean>;
}

const CollageHalf = ({ index, imgUrl, label, labelPosition, transform, isActive, onActivate, onTransformEnd, isDraggingRef }: CollageHalfProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  // Live transform tracked in ref for 60fps — no React re-renders during gesture
  const liveRef = useRef<ImageTransform>({ ...transform });

  // Sync from parent when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      liveRef.current = { ...transform };
      applyTransform();
    }
  }, [transform]);

  const applyTransform = () => {
    const el = imgRef.current;
    if (!el) return;
    const t = liveRef.current;
    el.style.transform = `translate(${t.offsetX}px, ${t.offsetY}px) scale(${t.scale}) rotate(${t.rotation}deg)`;
  };

  const bind = useGesture(
    {
      onDrag: ({ delta: [dx, dy], first, tap }) => {
        if (tap) { onActivate(); return; }
        if (first) {
          onActivate();
          isDraggingRef.current = true;
          if (imgRef.current) imgRef.current.style.transition = 'none';
        }
        liveRef.current.offsetX += dx;
        liveRef.current.offsetY += dy;
        applyTransform();
      },
      onDragEnd: () => {
        isDraggingRef.current = false;
        if (imgRef.current) imgRef.current.style.transition = 'transform 0.15s ease';
        onTransformEnd(index, { ...liveRef.current });
      },
      onPinch: ({ first, offset: [scale], movement: [, angleDelta], memo }) => {
        if (first) {
          onActivate();
          isDraggingRef.current = true;
          if (imgRef.current) imgRef.current.style.transition = 'none';
          memo = { startRotation: liveRef.current.rotation };
        }
        liveRef.current.scale = Math.max(0.3, Math.min(5, scale));
        liveRef.current.rotation = memo.startRotation + angleDelta;
        applyTransform();
        return memo;
      },
      onPinchEnd: () => {
        isDraggingRef.current = false;
        if (imgRef.current) imgRef.current.style.transition = 'transform 0.15s ease';
        onTransformEnd(index, { ...liveRef.current });
      },
    },
    {
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: {
        scaleBounds: { min: 0.3, max: 5 },
        pointer: { touch: true },
        from: () => [liveRef.current.scale, 0],
      },
    }
  );

  return (
    <div
      {...bind()}
      className="w-1/2 relative overflow-hidden transition-shadow duration-200"
      style={{
        touchAction: 'none',
        boxShadow: isActive ? `inset 0 0 0 2.5px ${GOLD}, inset 0 0 20px -6px ${GOLD}55` : 'none',
      }}
    >
      <img
        ref={imgRef}
        src={imgUrl} alt={label}
        className="w-full h-full object-cover"
        crossOrigin="anonymous"
        draggable={false}
        style={{
          transformOrigin: 'center center',
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
          transition: 'transform 0.15s ease',
          willChange: 'transform',
        }}
      />
      <span
        className={`absolute bottom-2 ${labelPosition === 'left' ? 'left-2' : 'right-2'} text-white text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none`}
        style={{ background: 'rgba(0,0,0,0.5)', textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
      >
        {label}
      </span>
    </div>
  );
};

const HealingPhotoGallery = ({ clientId, clientName, treatmentDate, artistId }: HealingPhotoGalleryProps) => {
  const { photos, loading, fetchError, uploadPhoto, deletePhoto, resolvedArtistId } = useClientGallery(clientId, artistId);
  const [collageMode, setCollageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCollage, setShowCollage] = useState(false);
  const [savingCollage, setSavingCollage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);
  const [collageErrorMessage, setCollageErrorMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual edit transforms for before (index 0) and after (index 1)
  const [transforms, setTransforms] = useState<[ImageTransform, ImageTransform]>([defaultTransform(), defaultTransform()]);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  // Artist logo URL
  const [artistLogoUrl, setArtistLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!resolvedArtistId) return;
    supabase.from('profiles').select('logo_url').eq('id', resolvedArtistId).maybeSingle()
      .then(({ data }) => { if (data?.logo_url) setArtistLogoUrl(data.logo_url); });
  }, [resolvedArtistId]);

  // Close lightbox on Escape key
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
      const msg = 'טוען פרטי סטודיו, נסי שוב בעוד רגע';
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
      const label = dayNum !== null ? `יום ${dayNum}` : undefined;
      await uploadPhoto(base64, { photoType: 'healing', label, dayNumber: dayNum ?? undefined, uploadedBy: 'artist' });
      toast({ title: 'נשמר בהצלחה ✅' });
    } catch (err: any) {
      const message = err?.message || 'Unknown upload error';
      setUploadErrorMessage(message);
      toast({ title: `שגיאה בהעלאת התמונה: ${message}`, variant: 'destructive' });
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

  const selectedPhotos = selectedIds.map(id => photos.find(p => p.id === id)).filter(Boolean);

  const createCollage = () => {
    if (selectedPhotos.length !== 2) {
      toast({ title: 'בחרי בדיוק 2 תמונות', variant: 'destructive' });
      return;
    }
    setShowCollage(true);
    setCollageMode(false);
    setTransforms([defaultTransform(), defaultTransform()]);
    setActiveEditIndex(null);
  };

  // Transform update helpers
  const updateTransform = (index: number, partial: Partial<ImageTransform>) => {
    setTransforms(prev => {
      const next = [...prev] as [ImageTransform, ImageTransform];
      next[index] = { ...next[index], ...partial };
      return next;
    });
  };

  const setTransformFull = (index: number, t: ImageTransform) => {
    setTransforms(prev => {
      const next = [...prev] as [ImageTransform, ImageTransform];
      next[index] = t;
      return next;
    });
  };

  // Dragging flag for disabling CSS transitions during gesture
  const isDragging = useRef(false);

  // Render collage to canvas and save
  const saveCollageToDevice = useCallback(async () => {
    console.log('[CollageFlow] Step 1: Start save. resolvedArtistId=', resolvedArtistId);
    if (!resolvedArtistId) {
      const msg = 'פרופיל האמנית לא נטען עדיין, נסי שוב בעוד רגע';
      setCollageErrorMessage(msg);
      toast({ title: msg, variant: 'destructive' });
      return;
    }

    setSavingCollage(true);
    setCollageErrorMessage(null);

    try {
      // Step 2: Load both images
      console.log('[CollageFlow] Step 2: Loading images...');
      const loadImg = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
          img.src = url;
        });

      const [beforeImg, afterImg] = await Promise.all([
        loadImg(selectedPhotos[0]!.public_url),
        loadImg(selectedPhotos[1]!.public_url),
      ]);

      // Step 3: Draw canvas with transforms
      console.log('[CollageFlow] Step 3: Drawing canvas...');
      const HALF_W = 600;
      const HALF_H = 600;
      const DIVIDER = 3;
      const FOOTER_H = 60;
      const CANVAS_W = HALF_W * 2 + DIVIDER;
      const CANVAS_H = HALF_H + FOOTER_H;

      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw a single image into a half with transforms applied
      const drawHalf = (img: HTMLImageElement, t: ImageTransform, xStart: number) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(xStart, 0, HALF_W, HALF_H);
        ctx.clip();

        const cx = xStart + HALF_W / 2 + t.offsetX;
        const cy = HALF_H / 2 + t.offsetY;
        ctx.translate(cx, cy);
        ctx.rotate((t.rotation * Math.PI) / 180);
        ctx.scale(t.scale, t.scale);

        // Fill the half while maintaining aspect ratio
        const imgAspect = img.width / img.height;
        const halfAspect = HALF_W / HALF_H;
        let drawW: number, drawH: number;
        if (imgAspect > halfAspect) {
          drawH = HALF_H;
          drawW = HALF_H * imgAspect;
        } else {
          drawW = HALF_W;
          drawH = HALF_W / imgAspect;
        }
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      };

      // RTL layout: After on left, Before on right
      drawHalf(afterImg, transforms[1], 0);
      drawHalf(beforeImg, transforms[0], HALF_W + DIVIDER);

      // Gold divider
      ctx.fillStyle = GOLD;
      ctx.fillRect(HALF_W, 0, DIVIDER, HALF_H);

      // Labels
      ctx.font = 'bold 22px serif';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 4;
      // "אחרי" on left (after)
      ctx.textAlign = 'left';
      ctx.fillText('אחרי ✨', 16, HALF_H - 16);
      // "לפני" on right (before)
      ctx.textAlign = 'right';
      ctx.fillText('לפני', CANVAS_W - 16, HALF_H - 16);
      ctx.shadowBlur = 0;

      // Footer
      ctx.fillStyle = '#fefcf7';
      ctx.fillRect(0, HALF_H, CANVAS_W, FOOTER_H);
      ctx.fillStyle = GOLD_DARK;
      ctx.font = 'bold 18px serif';
      ctx.textAlign = 'right';
      ctx.fillText(clientName, CANVAS_W - 20, HALF_H + 30);
      ctx.font = '14px serif';
      ctx.fillStyle = '#999';
      ctx.fillText(format(new Date(), 'dd/MM/yyyy'), CANVAS_W - 20, HALF_H + 50);

      // Logo watermark (artist logo or glowpush)
      const logoToUse = artistLogoUrl || glowPushLogo;
      try {
        const logoImg = await loadImg(logoToUse);
        const logoH = 36;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.globalAlpha = 0.5;
        ctx.drawImage(logoImg, 16, HALF_H + (FOOTER_H - logoH) / 2, logoW, logoH);
        ctx.globalAlpha = 1;
      } catch {
        // Logo failed to load - skip watermark
        console.warn('[CollageFlow] Logo watermark failed to load, skipping');
      }

      console.log('[CollageFlow] Step 3: Canvas drawn successfully');

      // Step 4: Convert canvas to blob and upload directly to storage
      console.log('[CollageFlow] Step 4: Converting to blob and uploading...');
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.92);
      });

      const fileName = `collage-${Date.now()}.jpg`;
      const safeClientId = clientId ? clientId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
      const storagePath = `${resolvedArtistId}/${safeClientId}/gallery-collage/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-photos')
        .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.error('[CollageFlow] Step 4 FAILED:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;
      console.log('[CollageFlow] Step 4: Uploaded. URL=', publicUrl);

      // Step 5: Insert into DB
      console.log('[CollageFlow] Step 5: Inserting into DB...');
      const { error: insertError } = await supabase.from('client_gallery_photos').insert({
        client_id: clientId || null,
        artist_id: resolvedArtistId,
        storage_path: storagePath,
        public_url: publicUrl,
        photo_type: 'collage',
        label: 'קולאז׳ לפני ואחרי',
        day_number: null,
        uploaded_by: 'artist',
        seen_by_client: false,
      } as any);

      if (insertError) {
        console.error('[CollageFlow] Step 5 FAILED:', insertError);
        throw new Error(`DB insert failed: ${insertError.message}`);
      }

      console.log('[CollageFlow] Step 5: Done!');
      toast({ title: 'הקולאז׳ נשמר בגלריה בהצלחה ✅' });
      setSelectedIds([]);
      setShowCollage(false);
      setCollageMode(false);
      setTransforms([defaultTransform(), defaultTransform()]);
    } catch (err: any) {
      const message = err?.message || 'Unknown collage save error';
      console.error('[CollageFlow] FAILED:', message, err);
      setCollageErrorMessage(message);
      toast({ title: `שגיאה בשמירה: ${message}`, variant: 'destructive' });
    } finally {
      setSavingCollage(false);
    }
  }, [clientId, clientName, resolvedArtistId, selectedPhotos, transforms, artistLogoUrl]);

  const sortedPhotos = [...photos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: GOLD, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const renderEditToolbar = () => {
    const activeIdx = activeEditIndex ?? 0;
    const t = transforms[activeIdx];
    return (
      <div className="flex flex-col items-center gap-2 mt-2">
        {/* Tab selector */}
        <div className="flex rounded-full overflow-hidden border" style={{ borderColor: `${GOLD}66` }}>
          {(['לפני', 'אחרי'] as const).map((label, i) => {
            const isActive = activeEditIndex === i;
            return (
              <button
                key={i}
                onClick={() => setActiveEditIndex(isActive ? null : i)}
                className="px-5 py-1.5 text-[11px] font-serif font-semibold tracking-wide transition-all"
                style={{
                  background: isActive ? GOLD_GRADIENT : 'transparent',
                  color: isActive ? '#5C4033' : GOLD_DARK,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Minimal toolbar: zoom + reset */}
        {activeEditIndex !== null && (
          <div
            className="flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-sm"
            style={{ background: 'rgba(255,252,247,0.85)', boxShadow: `0 2px 12px -3px ${GOLD}44, 0 1px 3px rgba(0,0,0,0.06)`, border: `1px solid ${GOLD}33` }}
          >
            <button onClick={() => updateTransform(activeIdx, { scale: t.scale + 0.15 })} title="זום+"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: GOLD_DARK }}>
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => updateTransform(activeIdx, { scale: Math.max(0.3, t.scale - 0.15) })} title="זום-"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: GOLD_DARK }}>
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-5 mx-0.5" style={{ background: `${GOLD}33` }} />
            <button onClick={() => updateTransform(activeIdx, defaultTransform())} title="איפוס"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
              style={{ color: GOLD_DARK }}>
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeEditIndex !== null && (
          <p className="text-[10px] font-serif text-center" style={{ color: `${GOLD_DARK}99` }}>
            ☝️ גרירה להזזה &nbsp;·&nbsp; 🤏 צביטה לזום וסיבוב
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Help modal */}
      {showHelp && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowHelp(false)}
          role="dialog" aria-modal="true"
        >
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 animate-fade-up"
            style={{ backgroundColor: '#FFFCF7', boxShadow: `0 20px 60px -10px rgba(0,0,0,0.3), 0 0 0 1px ${GOLD}33` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: `${GOLD}15`, color: GOLD_DARK }}
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-center font-serif font-bold text-lg mb-5" style={{ color: GOLD_DARK }}>
              ✨ איך יוצרים קולאז׳?
            </h3>

            <ol className="space-y-3 text-sm font-light list-none" dir="rtl" style={{ color: '#5C4033' }}>
              {[
                { num: '1', icon: '📸', text: 'העלי תמונות לגלריית הלקוחה.' },
                { num: '2', icon: '✅', text: 'בחרי שתי תמונות מהגלריה עבור הקולאז׳.' },
                { num: '3', icon: '🤏', text: 'ערכי את התמונות בעזרת מגע (טאצ\') — השתמשי בשתי אצבעות לזום, הזזה וסיבוב.' },
                { num: '4', icon: '💾', text: 'לחצי על שמירה כדי לשמור את הקולאז׳ לגלריה (תוכלי גם להוריד אותו לטלפון).' },
              ].map((step) => (
                <li key={step.num} className="flex gap-3 items-start">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5"
                    style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
                  >
                    {step.num}
                  </span>
                  <span>{step.icon} {step.text}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-5 w-full py-2.5 rounded-full text-sm font-serif font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
            >
              הבנתי! 👍
            </button>
          </div>
        </div>,
        document.body
      )}
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
          <img
            src={lightboxUrl} alt="Enlarged photo" className="rounded-lg"
            style={{ zIndex: 100000, maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !resolvedArtistId}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#ffffff', border: `2.5px solid ${GOLD}`, color: GOLD_DARK }}
        >
          <Camera className="w-4 h-4" />
          {uploading ? 'מעלה...' : !resolvedArtistId ? 'טוען פרופיל...' : 'הוסיפי תמונה'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAddPhoto} />

        {sortedPhotos.length >= 2 && (
          <div className="flex items-center gap-1.5">
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
            <button
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 flex-shrink-0"
              style={{ border: `1.5px solid ${GOLD}44`, color: GOLD_DARK }}
              title="איך יוצרים קולאז׳?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {collageMode && (
        <p className="text-center text-xs font-serif" style={{ color: GOLD_DARK }}>
          ✨ בחרי 2 תמונות ליצירת קולאז׳ ({selectedIds.length}/2)
        </p>
      )}

      {(fetchError || uploadErrorMessage || collageErrorMessage) && (
        <div className="space-y-1">
          {fetchError && <p className="text-center text-xs text-destructive">{fetchError}</p>}
          {uploadErrorMessage && <p className="text-center text-xs text-destructive">{uploadErrorMessage}</p>}
          {collageErrorMessage && <p className="text-center text-xs text-destructive font-bold">{collageErrorMessage}</p>}
        </div>
      )}

      {/* Gallery grid */}
      {sortedPhotos.length === 0 ? (
        <div className="text-center py-8">
          <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: GOLD_DARK }} />
          <p className="text-sm font-serif" style={{ color: GOLD_DARK }}>עדיין אין תמונות החלמה 📸</p>
          <p className="text-xs mt-1 font-light" style={{ color: '#888' }}>הוסיפי תמונות כדי לעקוב אחרי תהליך ההחלמה</p>
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
                style={{ borderColor: isSelected ? GOLD : `${GOLD}40`, background: '#ffffff' }}
                onClick={() => { collageMode ? toggleSelect(photo.id) : setLightboxUrl(photo.public_url); }}
              >
                <div className="aspect-square overflow-hidden relative">
                  <img src={photo.public_url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  {collageMode && isSelected && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: GOLD_GRADIENT }}>
                        <Check className="w-4 h-4" style={{ color: '#5C4033' }} />
                      </div>
                    </div>
                  )}
                  {!collageMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                      className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm z-10"
                    >
                      <X className="w-2.5 h-2.5" style={{ color: GOLD_DARK }} />
                    </button>
                  )}
                  {photo.day_number !== null && (
                    <span className="absolute top-1 right-1 text-[8px] font-bold px-2 py-0.5 rounded-full z-10"
                      style={{ background: GOLD_GRADIENT, color: '#5C4033' }}>יום {photo.day_number}</span>
                  )}
                  {photo.photo_type === 'collage' && (
                    <span className="absolute bottom-1 right-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10"
                      style={{ background: GOLD_GRADIENT, color: '#5C4033' }}>קולאז׳</span>
                  )}
                </div>
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
            style={{ background: GOLD_GRADIENT, color: '#5C4033', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.5)' }}
          >
            <Layers className="w-4 h-4" />
            צור קולאז׳ ✨
          </button>
        </div>
      )}

      {/* Collage editor with manual controls */}
      {showCollage && selectedPhotos.length === 2 && (
        <div className="space-y-3 animate-fade-up">
          <p className="text-center text-xs font-serif" style={{ color: GOLD_DARK }}>
            🎨 גררי להזזה · צבטי לזום וסיבוב
          </p>

          <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border-2" style={{ borderColor: GOLD, background: '#ffffff' }}>
            <div className="flex" style={{ aspectRatio: '2/1' }}>
              {/* After (left side) */}
              <CollageHalf
                index={1}
                imgUrl={selectedPhotos[1]!.public_url}
                label="אחרי ✨"
                labelPosition="left"
                transform={transforms[1]}
                isActive={activeEditIndex === 1}
                onActivate={() => setActiveEditIndex(1)}
                onTransformEnd={setTransformFull}
                isDraggingRef={isDragging}
              />

              <div className="w-[3px] flex-shrink-0" style={{ backgroundColor: GOLD }} />

              {/* Before (right side) */}
              <CollageHalf
                index={0}
                imgUrl={selectedPhotos[0]!.public_url}
                label="לפני"
                labelPosition="right"
                transform={transforms[0]}
                isActive={activeEditIndex === 0}
                onActivate={() => setActiveEditIndex(0)}
                onTransformEnd={setTransformFull}
                isDraggingRef={isDragging}
              />
            </div>

            {/* Footer with logo */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#fefcf7' }}>
              <div className="flex items-center gap-2">
                <img src={artistLogoUrl || glowPushLogo} alt="Logo" className="h-6 w-auto object-contain" style={{ opacity: 0.6 }} crossOrigin="anonymous" />
              </div>
              <div className="text-right">
                <p className="text-xs font-serif font-bold" style={{ color: GOLD_DARK }}>{clientName}</p>
                <p className="text-[9px] font-light" style={{ color: '#999' }}>{format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Floating edit toolbar */}
          {renderEditToolbar()}

          {/* Save button */}
          <div className="flex justify-center">
            <button
              onClick={saveCollageToDevice}
              disabled={savingCollage}
              className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
              style={{ background: GOLD_GRADIENT, color: '#5C4033', boxShadow: '0 4px 16px -2px rgba(212,175,55,0.5)' }}
            >
              <Download className="w-4 h-4" />
              {savingCollage ? 'שומר...' : 'שמירת קולאז׳ לגלריה'}
            </button>
          </div>

          <button
            onClick={() => { setShowCollage(false); setSelectedIds([]); setTransforms([defaultTransform(), defaultTransform()]); }}
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
