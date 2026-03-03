import { useState, useRef, useCallback, useEffect } from 'react';
import { useGesture } from '@use-gesture/react';
import html2canvas from 'html2canvas';
import { Camera, Save, Loader2, RotateCcw, ZoomIn, ZoomOut, Move, Download, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import { STUDIO_LOGO_URL } from '@/lib/branding';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };

/** A single gesturable photo frame with drag, pinch-to-zoom, and rotation */
function GestureFrame({
  src,
  label,
  isActive,
  onTap,
}: {
  src: string;
  label: string;
  isActive: boolean;
  onTap: () => void;
}) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ ...DEFAULT_TRANSFORM });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const applyDom = (t: Transform) => {
    if (imgRef.current) {
      imgRef.current.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`;
    }
  };

  const bind = useGesture(
    {
      onDrag: ({ offset: [ox, oy], event }) => {
        event.preventDefault();
        const next = { ...transformRef.current, x: ox, y: oy };
        transformRef.current = next;
        applyDom(next);
      },
      onDragEnd: () => {
        setTransform({ ...transformRef.current });
      },
      onPinch: ({ offset: [s], movement: [, angleDelta], memo, first, event }) => {
        event.preventDefault();
        if (first) {
          memo = { startRotation: transformRef.current.rotation };
        }
        const clamped = Math.min(Math.max(s, 0.3), 5);
        const next = { ...transformRef.current, scale: clamped, rotation: memo.startRotation + angleDelta };
        transformRef.current = next;
        applyDom(next);
        return memo;
      },
      onPinchEnd: () => {
        setTransform({ ...transformRef.current });
      },
    },
    {
      drag: {
        from: () => [transformRef.current.x, transformRef.current.y],
        filterTaps: true,
      },
      pinch: {
        from: () => [transformRef.current.scale, 0],
        scaleBounds: { min: 0.3, max: 5 },
      },
    }
  );

  const isModified = transform.x !== 0 || transform.y !== 0 || transform.scale !== 1 || transform.rotation !== 0;

  const resetTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    const reset = { ...DEFAULT_TRANSFORM };
    setTransform(reset);
    transformRef.current = reset;
    applyDom(reset);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden touch-none"
      style={{
        boxShadow: isActive ? `inset 0 0 0 2px ${GOLD}` : 'none',
      }}
      onClick={onTap}
    >
      <div
        ref={imgRef}
        {...bind()}
        className="w-full h-full touch-none will-change-transform"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
          cursor: 'grab',
        }}
      >
        <img
          src={src}
          alt={label}
          className="w-full h-full object-cover object-center pointer-events-none select-none"
          draggable={false}
        />
      </div>
      {/* Label */}
      <span
        className="absolute bottom-3 text-white text-sm font-bold tracking-wide pointer-events-none z-10"
        style={{
          textShadow: '0 1px 4px rgba(0,0,0,0.7)',
          ...(label === 'לפני' ? { left: 12 } : { right: 12 }),
        }}
      >
        {label}
      </span>
      {/* Reset button */}
      {isModified && (
        <button
          onClick={resetTransform}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-20 transition-all hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <RotateCcw className="w-3.5 h-3.5 text-white" />
        </button>
      )}
    </div>
  );
}

interface DualPhotoGalleryProps {
  clientId?: string;
  artistId?: string;
  logoUrl?: string;
}

export function DualPhotoGallery({ clientId, artistId, logoUrl }: DualPhotoGalleryProps) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const [savingCollage, setSavingCollage] = useState(false);
  const [activeFrame, setActiveFrame] = useState<'before' | 'after' | null>(null);

  const { uploadPhoto } = useClientGallery(clientId, artistId);

  const resolvedLogo = logoUrl || STUDIO_LOGO_URL;

  const bothUploaded = before && after;

  const addWatermark = useCallback((canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      if (!resolvedLogo) { resolve(canvas); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(canvas); return; }
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.onload = () => {
        const maxH = canvas.height * 0.12;
        const ratio = logo.width / logo.height;
        const h = maxH;
        const w = h * ratio;
        const x = canvas.width - w - 20;
        const y = canvas.height - h - 20;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(logo, x, y, w, h);
        ctx.globalAlpha = 1;
        resolve(canvas);
      };
      logo.onerror = () => resolve(canvas);
      logo.src = resolvedLogo;
    });
  }, [resolvedLogo]);

  const renderCollageToCanvas = useCallback(async () => {
    if (!collageRef.current) throw new Error('No collage ref');
    let canvas = await html2canvas(collageRef.current, { useCORS: true, scale: 2 });
    canvas = await addWatermark(canvas);
    return canvas;
  }, [addWatermark]);

  const saveCollageToGallery = useCallback(async () => {
    if (!collageRef.current || !clientId) return;
    setSavingCollage(true);
    try {
      const canvas = await renderCollageToCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await uploadPhoto(dataUrl, { photoType: 'collage', label: 'Before & After' });
      toast({ title: 'הקולאז׳ נשמר בגלריה ✨' });
    } catch (err) {
      console.error('Save collage error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    } finally {
      setSavingCollage(false);
    }
  }, [clientId, uploadPhoto, renderCollageToCanvas]);

  const downloadCollage = useCallback(async () => {
    if (!collageRef.current) return;
    setSavingCollage(true);
    try {
      const canvas = await renderCollageToCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );
      if (!blob) throw new Error('Failed to create image');

      const fileName = `before-after-${Date.now()}.jpg`;

      // Try Web Share API first (works on mobile)
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Before & After Collage' });
        toast({ title: 'נפתח חלון שיתוף ✅' });
        return;
      }

      // Fallback: blob download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({ title: 'הקולאז׳ הורד בהצלחה 📥' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Download collage error:', err);
      toast({ title: 'שגיאה בהורדה', variant: 'destructive' });
    } finally {
      setSavingCollage(false);
    }
  }, [renderCollageToCanvas]);

  return (
    <div className="space-y-4">
      {/* Upload boxes */}
      <div className="flex gap-4 justify-center" dir="rtl">
        {/* AFTER BOX */}
        <div className="relative w-40 h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center overflow-hidden bg-white shadow-sm"
          style={{ borderColor: GOLD }}
        >
          {after ? (
            <>
              <img src={after} alt="After" className="w-full h-full object-cover pointer-events-none" />
              <button
                onClick={(e) => { e.stopPropagation(); setAfter(null); }}
                className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md bg-white/80 hover:bg-white z-20"
              >
                <X className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              </button>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 mb-1 pointer-events-none" style={{ color: GOLD_DARK }} />
              <span className="text-sm pointer-events-none" style={{ color: GOLD_DARK }}>אחרי</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) setAfter(URL.createObjectURL(e.target.files[0]));
            }}
          />
        </div>

        {/* BEFORE BOX */}
        <div className="relative w-40 h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center overflow-hidden bg-white shadow-sm"
          style={{ borderColor: GOLD }}
        >
          {before ? (
            <>
              <img src={before} alt="Before" className="w-full h-full object-cover pointer-events-none" />
              <button
                onClick={(e) => { e.stopPropagation(); setBefore(null); }}
                className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md bg-white/80 hover:bg-white z-20"
              >
                <X className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              </button>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 mb-1 pointer-events-none" style={{ color: GOLD_DARK }} />
              <span className="text-sm pointer-events-none" style={{ color: GOLD_DARK }}>לפני</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) setBefore(URL.createObjectURL(e.target.files[0]));
            }}
          />
        </div>
      </div>

      {/* Interactive collage with gesture support */}
      {bothUploaded && (
        <div className="space-y-3">
          {/* Gesture hint */}
          <div className="flex items-center justify-center gap-3 text-[10px] font-medium" style={{ color: GOLD_DARK }}>
            <span className="flex items-center gap-1"><Move className="w-3 h-3" /> גררי</span>
            <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> צבטי לזום</span>
            <span>🤏 סיבוב</span>
          </div>

          <div
            ref={collageRef}
            className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden shadow-md border-2"
            style={{ borderColor: GOLD, background: '#000' }}
          >
            {/* BEFORE half (left) */}
            <div className="absolute inset-y-0 left-0 w-1/2">
              <GestureFrame
                src={before}
                label="לפני"
                isActive={activeFrame === 'before'}
                onTap={() => setActiveFrame(activeFrame === 'before' ? null : 'before')}
              />
            </div>
            {/* AFTER half (right) */}
            <div className="absolute inset-y-0 right-0 w-1/2">
              <GestureFrame
                src={after}
                label="אחרי ✨"
                isActive={activeFrame === 'after'}
                onTap={() => setActiveFrame(activeFrame === 'after' ? null : 'after')}
              />
            </div>
            {/* Center divider */}
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 z-10" style={{ backgroundColor: GOLD }} />
          </div>

          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={downloadCollage}
              disabled={savingCollage}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: '#fff',
                color: GOLD_DARK,
                boxShadow: `0 2px 10px -2px rgba(212, 175, 55, 0.4)`,
                border: `2px solid ${GOLD}`,
              }}
            >
              <Download className="w-4 h-4" />
              הורדה / שיתוף 📥
            </button>
            {clientId && (
              <button
                onClick={saveCollageToGallery}
                disabled={savingCollage}
                className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: GOLD_GRADIENT,
                  color: '#5C4033',
                  boxShadow: '0 4px 16px -2px rgba(212, 175, 55, 0.5), 0 2px 6px -1px rgba(0,0,0,0.15)',
                  border: 'none',
                }}
              >
                {savingCollage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingCollage ? 'שומר...' : 'שמור לגלריה 📸'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DualPhotoGallery;
