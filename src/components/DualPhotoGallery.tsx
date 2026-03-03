import { useState, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import html2canvas from 'html2canvas';
import { Camera, Pencil, Save, Loader2, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageEditorDialog from './ImageEditorDialog';
import { useClientGallery } from '@/hooks/useClientGallery';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };

/** A single gesturable photo frame within the collage */
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
  // Memo refs to avoid stale closures in gesture handler
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const bind = useGesture(
    {
      onDrag: ({ offset: [ox, oy], event }) => {
        event.preventDefault();
        // Direct DOM update for 60fps
        if (imgRef.current) {
          imgRef.current.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${transformRef.current.scale})`;
        }
        transformRef.current = { ...transformRef.current, x: ox, y: oy };
      },
      onDragEnd: () => {
        setTransform({ ...transformRef.current });
      },
      onPinch: ({ offset: [s], event }) => {
        event.preventDefault();
        const clamped = Math.min(Math.max(s, 0.5), 4);
        if (imgRef.current) {
          imgRef.current.style.transform = `translate3d(${transformRef.current.x}px, ${transformRef.current.y}px, 0) scale(${clamped})`;
        }
        transformRef.current = { ...transformRef.current, scale: clamped };
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
        scaleBounds: { min: 0.5, max: 4 },
      },
    }
  );

  const resetTransform = (e: React.MouseEvent) => {
    e.stopPropagation();
    const reset = { ...DEFAULT_TRANSFORM };
    setTransform(reset);
    transformRef.current = reset;
    if (imgRef.current) {
      imgRef.current.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
    }
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
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
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
      {(transform.x !== 0 || transform.y !== 0 || transform.scale !== 1) && (
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
}

export function DualPhotoGallery({ clientId, artistId }: DualPhotoGalleryProps) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const [savingCollage, setSavingCollage] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState<'before' | 'after' | null>(null);
  const [activeFrame, setActiveFrame] = useState<'before' | 'after' | null>(null);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'before' | 'after'>('before');
  const [editingSrc, setEditingSrc] = useState('');

  const { uploadPhoto } = useClientGallery(clientId, artistId);

  const bothUploaded = before && after;

  const openEditor = (category: 'before' | 'after') => {
    const src = category === 'before' ? before : after;
    if (!src) return;
    setEditingCategory(category);
    setEditingSrc(src);
    setEditorOpen(true);
  };

  const handleEditorSave = (editedBase64: string) => {
    if (editingCategory === 'before') setBefore(editedBase64);
    else setAfter(editedBase64);
    setEditorOpen(false);
  };

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

  const saveCollageToGallery = useCallback(async () => {
    if (!collageRef.current || !clientId) return;
    setSavingCollage(true);
    try {
      const canvas = await html2canvas(collageRef.current, { useCORS: true, scale: 2 });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await uploadPhoto(dataUrl, { photoType: 'collage', label: 'Before & After' });
      toast({ title: 'הקולאז׳ נשמר בגלריה ✨' });
    } catch (err) {
      console.error('Save collage error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    } finally {
      setSavingCollage(false);
    }
  }, [clientId, uploadPhoto]);

  const savePhotoToGallery = useCallback(async (which: 'before' | 'after') => {
    if (!clientId) return;
    const src = which === 'before' ? before : after;
    if (!src) return;
    setSavingPhoto(which);
    try {
      const b64 = await toBase64(src);
      if (b64) {
        await uploadPhoto(b64, { photoType: 'healing', label: which === 'before' ? 'לפני' : 'אחרי' });
        toast({ title: 'התמונה נשמרה בגלריה 📸' });
      }
    } catch (err) {
      console.error('Save photo error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    } finally {
      setSavingPhoto(null);
    }
  }, [before, after, clientId, uploadPhoto]);

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
                onClick={(e) => { e.stopPropagation(); openEditor('after'); }}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
                style={{ background: GOLD_GRADIENT }}
              >
                <Pencil className="w-3.5 h-3.5" style={{ color: '#5C4033' }} />
              </button>
              {clientId && (
                <button
                  onClick={(e) => { e.stopPropagation(); savePhotoToGallery('after'); }}
                  disabled={savingPhoto === 'after'}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md z-20"
                  style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
                >
                  {savingPhoto === 'after' ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: GOLD_DARK }} /> : <Save className="w-3 h-3" style={{ color: GOLD_DARK }} />}
                </button>
              )}
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
                onClick={(e) => { e.stopPropagation(); openEditor('before'); }}
                className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-20"
                style={{ background: GOLD_GRADIENT }}
              >
                <Pencil className="w-3.5 h-3.5" style={{ color: '#5C4033' }} />
              </button>
              {clientId && (
                <button
                  onClick={(e) => { e.stopPropagation(); savePhotoToGallery('before'); }}
                  disabled={savingPhoto === 'before'}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md z-20"
                  style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
                >
                  {savingPhoto === 'before' ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: GOLD_DARK }} /> : <Save className="w-3 h-3" style={{ color: GOLD_DARK }} />}
                </button>
              )}
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
            <span>הקישי לבחירה</span>
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

          {/* Save collage to gallery */}
          {clientId && (
            <div className="flex justify-center">
              <button
                onClick={saveCollageToGallery}
                disabled={savingCollage}
                className="flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
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
            </div>
          )}
        </div>
      )}

      {/* Image Editor */}
      <ImageEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        imageSrc={editingSrc}
        onSave={handleEditorSave}
      />
    </div>
  );
}

export default DualPhotoGallery;
