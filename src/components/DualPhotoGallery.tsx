import { useState, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { Camera, Download, Loader2, X, Save, Sparkles, Droplets } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import { STUDIO_LOGO_URL } from '@/lib/branding';
import { Slider } from '@/components/ui/slider';

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

/* ── pixel-level retouch helpers ── */
function applySkinSmoothing(imageData: ImageData, amount: number) {
  if (amount <= 0) return;
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);
  const radius = Math.max(1, Math.round(amount * 3));
  const threshold = 18 + amount * 12;
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          const diff = Math.abs(src[nIdx] - src[idx]) + Math.abs(src[nIdx + 1] - src[idx + 1]) + Math.abs(src[nIdx + 2] - src[idx + 2]);
          if (diff < threshold) { rSum += src[nIdx]; gSum += src[nIdx + 1]; bSum += src[nIdx + 2]; count++; }
        }
      }
      if (count > 0) {
        const blend = amount * 0.6;
        data[idx] = src[idx] + (rSum / count - src[idx]) * blend;
        data[idx + 1] = src[idx + 1] + (gSum / count - src[idx + 1]) * blend;
        data[idx + 2] = src[idx + 2] + (bSum / count - src[idx + 2]) * blend;
      }
    }
  }
}

function applyRednessReduction(imageData: ImageData, amount: number) {
  if (amount <= 0) return;
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isReddish = r > 80 && r > g * 1.15 && r > b * 1.2 && r < 245;
    if (!isReddish) continue;
    const redness = Math.min(1, ((r - g) + (r - b)) / 200);
    const reduction = redness * amount * 0.45;
    data[i] = r - r * reduction * 0.35;
    data[i + 1] = g + (r - g) * reduction * 0.12;
  }
}

/** Inner gesture frame — drag to pan, pinch to zoom/rotate */
function GestureFrameInner({ src }: { src: string }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const tRef = useRef<Transform>({ ...DEFAULT_TRANSFORM });

  const apply = () => {
    if (innerRef.current) {
      const t = tRef.current;
      innerRef.current.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`;
    }
  };

  const bind = useGesture(
    {
      onDrag: ({ offset: [ox, oy], event }) => {
        event.preventDefault();
        tRef.current = { ...tRef.current, x: ox, y: oy };
        apply();
      },
      onPinch: ({ offset: [s], da: [, angle], memo, first, event }) => {
        event.preventDefault();
        if (first) memo = { startAngle: angle, startRotation: tRef.current.rotation };
        const angleDelta = angle - (memo?.startAngle ?? 0);
        const clamped = Math.min(Math.max(s, 0.3), 5);
        tRef.current = { ...tRef.current, scale: clamped, rotation: (memo?.startRotation ?? 0) + angleDelta };
        apply();
        return memo;
      },
    },
    {
      drag: { from: () => [tRef.current.x, tRef.current.y], filterTaps: true },
      pinch: { from: () => [tRef.current.scale, 0], scaleBounds: { min: 0.3, max: 5 } },
    }
  );

  return (
    <div className="absolute inset-0 overflow-hidden touch-none">
      <div
        ref={innerRef}
        data-gesture-inner
        {...bind()}
        className="w-full h-full touch-none will-change-transform"
        style={{ cursor: 'grab' }}
      >
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover object-center pointer-events-none select-none"
          draggable={false}
        />
      </div>
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
  const [skinSmooth, setSkinSmooth] = useState(0);
  const [rednessReduce, setRednessReduce] = useState(0);
  const collageRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { uploadPhoto } = useClientGallery(clientId, artistId);
  const resolvedLogo = logoUrl || STUDIO_LOGO_URL;
  const bothUploaded = before && after;
  const hasRetouch = skinSmooth > 0 || rednessReduce > 0;

  /** Render the collage to a high-res square canvas (1080×1080) — 100% clean output */
  const renderToCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    const SIZE = 1080;
    const HALF = SIZE / 2;
    const DIVIDER_W = 3;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const loadImg = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
      });

    const drawCover = (
      img: HTMLImageElement,
      xStart: number,
      width: number,
      height: number,
      domEl: HTMLDivElement | null
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(xStart, 0, width, height);
      ctx.clip();

      let tx = 0, ty = 0, sc = 1, rot = 0;
      if (domEl) {
        const raw = domEl.style.transform;
        const t3d = raw.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
        const scM = raw.match(/scale\(([-\d.]+)\)/);
        const rotM = raw.match(/rotate\(([-\d.]+)deg\)/);
        if (t3d) { tx = parseFloat(t3d[1]); ty = parseFloat(t3d[2]); }
        if (scM) { sc = parseFloat(scM[1]); }
        if (rotM) { rot = parseFloat(rotM[1]); }
      }

      const previewFrame = collageRef.current;
      const previewHalf = previewFrame ? previewFrame.clientWidth / 2 : HALF;
      const ratio = width / previewHalf;

      const cx = xStart + width / 2 + tx * ratio;
      const cy = height / 2 + ty * ratio;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);
      ctx.rotate((rot * Math.PI) / 180);

      const imgAspect = img.width / img.height;
      const frameAspect = width / height;
      let dw: number, dh: number;
      if (imgAspect > frameAspect) { dh = height; dw = height * imgAspect; }
      else { dw = width; dh = width / imgAspect; }
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    };

    const [beforeImg, afterImg] = await Promise.all([loadImg(before!), loadImg(after!)]);

    const frames = collageRef.current?.querySelectorAll<HTMLDivElement>('[data-gesture-frame]');
    const beforeDom = frames?.[0]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;
    const afterDom = frames?.[1]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;

    drawCover(beforeImg, 0, HALF - DIVIDER_W / 2, SIZE, beforeDom);
    drawCover(afterImg, HALF + DIVIDER_W / 2, HALF - DIVIDER_W / 2, SIZE, afterDom);

    // Apply retouch to final canvas
    if (skinSmooth > 0 || rednessReduce > 0) {
      const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
      if (skinSmooth > 0) applySkinSmoothing(imageData, skinSmooth);
      if (rednessReduce > 0) applyRednessReduction(imageData, rednessReduce);
      ctx.putImageData(imageData, 0, 0);
    }

    // Gold divider
    ctx.fillStyle = GOLD;
    ctx.fillRect(HALF - DIVIDER_W / 2, 0, DIVIDER_W, SIZE);

    // Clean text labels
    ctx.font = 'bold 28px serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.fillText('לפני', 20, SIZE - 24);
    ctx.textAlign = 'right';
    ctx.fillText('אחרי ✨', SIZE - 20, SIZE - 24);
    ctx.shadowBlur = 0;

    // Logo watermark
    if (resolvedLogo) {
      try {
        const logoImg = await loadImg(resolvedLogo);
        const logoW = SIZE * 0.18;
        const logoH = (logoImg.height / logoImg.width) * logoW;
        ctx.globalAlpha = 0.45;
        ctx.drawImage(logoImg, SIZE - logoW - 20, SIZE - logoH - 50, logoW, logoH);
        ctx.globalAlpha = 1;
      } catch { /* skip */ }
    }

    return canvas;
  }, [before, after, resolvedLogo, skinSmooth, rednessReduce]);

  /** Save to client file (gallery) */
  const handleSave = useCallback(async () => {
    if (!clientId) {
      toast({ title: 'לא ניתן לשמור ללא תיק לקוחה', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const canvas = await renderToCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await uploadPhoto(dataUrl, { photoType: 'collage', label: 'Before & After' });
      toast({ title: 'נשמר בתיק הלקוחה ✅' });
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ title: 'שגיאה בשמירה', description: err?.message || '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [renderToCanvas, clientId, uploadPhoto]);

  /** Download — always forces a real file download, never share menu */
  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = await renderToCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      );
      if (!blob) throw new Error('Failed to create image');

      const fileName = `collage-${Date.now()}.jpg`;
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
      console.error('Download error:', err);
      toast({ title: 'שגיאה בהורדה', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  }, [renderToCanvas]);

  return (
    <div className="space-y-5">
      {/* Upload boxes */}
      <div className="flex gap-4 justify-center" dir="rtl">
        {(['after', 'before'] as const).map((which) => {
          const img = which === 'before' ? before : after;
          const setImg = which === 'before' ? setBefore : setAfter;
          const label = which === 'before' ? 'לפני' : 'אחרי';
          return (
            <div
              key={which}
              className="relative w-36 h-36 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all"
              style={{
                border: img ? `2px solid ${GOLD}` : `1.5px solid ${GOLD}66`,
                background: img ? '#000' : 'hsla(38, 40%, 96%, 0.6)',
              }}
            >
              {img ? (
                <>
                  <img src={img} alt={label} className="w-full h-full object-cover pointer-events-none" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setImg(null); }}
                    className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm z-20 transition-all hover:bg-black/70"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mb-1 pointer-events-none" style={{ color: GOLD_DARK }} />
                  <span className="text-xs font-serif pointer-events-none" style={{ color: GOLD_DARK }}>{label}</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={(e) => {
                  if (e.target.files?.[0]) setImg(URL.createObjectURL(e.target.files[0]));
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Collage preview — square 1:1 */}
      {bothUploaded && (
        <div className="space-y-4">
          <p className="text-center text-[10px] font-serif" style={{ color: GOLD_DARK }}>
            ☝️ גררי להזזה · 🤏 צבטי לזום
          </p>

          <div
            ref={collageRef}
            className="relative w-full rounded-2xl overflow-hidden shadow-lg"
            style={{ aspectRatio: '1 / 1', border: `2px solid ${GOLD}`, background: '#000' }}
          >
            {/* BEFORE half (left) */}
            <div className="absolute inset-y-0 left-0 w-1/2" data-gesture-frame>
              <GestureFrameInner src={before} />
            </div>
            {/* AFTER half (right) */}
            <div className="absolute inset-y-0 right-0 w-1/2" data-gesture-frame>
              <GestureFrameInner src={after} />
            </div>
            {/* Divider */}
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 z-10" style={{ backgroundColor: GOLD }} />
            {/* Labels */}
            <span className="absolute bottom-3 left-3 text-white text-xs font-bold font-serif tracking-wide pointer-events-none z-10" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              לפני
            </span>
            <span className="absolute bottom-3 right-3 text-white text-xs font-bold font-serif tracking-wide pointer-events-none z-10" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              אחרי ✨
            </span>
          </div>

          {/* ── Retouch Section ── */}
          <div className="rounded-xl p-3 space-y-2.5" style={{ backgroundColor: '#faf8f2', border: `1px solid ${GOLD}30` }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD_DARK }}>
                ריטאצ׳ עדין
              </span>
              {hasRetouch && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${GOLD}20`, color: GOLD_DARK }}>
                  פעיל
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
              <div className="flex-1 space-y-0.5">
                <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>החלקת עור</span>
                <Slider value={[skinSmooth]} onValueChange={([v]) => setSkinSmooth(v)} min={0} max={1} step={0.05} />
              </div>
              <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>{Math.round(skinSmooth * 100)}%</span>
            </div>

            <div className="flex items-center gap-3">
              <Droplets className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
              <div className="flex-1 space-y-0.5">
                <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>הפחתת אדמומיות</span>
                <Slider value={[rednessReduce]} onValueChange={([v]) => setRednessReduce(v)} min={0} max={1} step={0.05} />
              </div>
              <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>{Math.round(rednessReduce * 100)}%</span>
            </div>

            <p className="text-[9px] text-center" style={{ color: `${GOLD_DARK}99` }}>
              שומר על מרקם טבעי · מראה אדיטוריאלי מקצועי
            </p>
          </div>

          {/* Two separate action buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: GOLD_GRADIENT,
                color: '#5C4033',
                boxShadow: '0 4px 20px -4px rgba(212, 175, 55, 0.5)',
                border: 'none',
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'שומר...' : 'שמור לתיק לקוחה'}
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'transparent',
                color: GOLD_DARK,
                border: `2px solid ${GOLD}`,
              }}
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'מוריד...' : 'הורדה לגלריה'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DualPhotoGallery;
