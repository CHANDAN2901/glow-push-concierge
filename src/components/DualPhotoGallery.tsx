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
  x: number; y: number; scale: number; rotation: number;
}

const MIN_GESTURE_SCALE = 0.5;
const MAX_GESTURE_SCALE = 8;
const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1.5, rotation: 0 };

/* ── pixel-level retouch helpers ── */
const clampByte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function isLikelySkinTone(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 35 && g > 20 && b > 15 && max - min > 12 && r >= g && r > b;
}

function hueDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function hueDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;

  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  const m = l - c / 2;
  return {
    r: clampByte((r1 + m) * 255),
    g: clampByte((g1 + m) * 255),
    b: clampByte((b1 + m) * 255),
  };
}

function createIntegralChannel(data: Uint8ClampedArray, width: number, height: number, channelOffset: number) {
  const stride = width + 1;
  const integral = new Float32Array((width + 1) * (height + 1));

  for (let y = 1; y <= height; y++) {
    let rowSum = 0;
    for (let x = 1; x <= width; x++) {
      const srcIdx = (((y - 1) * width + (x - 1)) * 4) + channelOffset;
      rowSum += data[srcIdx];
      integral[y * stride + x] = integral[(y - 1) * stride + x] + rowSum;
    }
  }

  return integral;
}

function boxBlurFromIntegral(integral: Float32Array, width: number, height: number, x: number, y: number, radius: number) {
  const stride = width + 1;
  const x1 = Math.max(0, x - radius);
  const y1 = Math.max(0, y - radius);
  const x2 = Math.min(width - 1, x + radius);
  const y2 = Math.min(height - 1, y + radius);

  const a = integral[y1 * stride + x1];
  const b = integral[y1 * stride + (x2 + 1)];
  const c = integral[(y2 + 1) * stride + x1];
  const d = integral[(y2 + 1) * stride + (x2 + 1)];
  const area = (x2 - x1 + 1) * (y2 - y1 + 1);

  return (d - b - c + a) / area;
}

function applySkinSmoothing(imageData: ImageData, amount: number) {
  if (amount <= 0) return;

  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data);

  // Edge-aware "smart blur" (integral-image accelerated) — CRANKED UP
  const boosted = amount * 4; // 4x internal multiplier so 100% is extremely strong
  const radius = Math.max(3, Math.round(3 + boosted * 12));
  const blendBase = Math.min(1, 0.3 + boosted * 0.7);
  const edgeThreshold = Math.max(4, 30 - boosted * 6);

  const intR = createIntegralChannel(src, width, height, 0);
  const intG = createIntegralChannel(src, width, height, 1);
  const intB = createIntegralChannel(src, width, height, 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      if (!isLikelySkinTone(r, g, b)) continue;

      const br = boxBlurFromIntegral(intR, width, height, x, y, radius);
      const bg = boxBlurFromIntegral(intG, width, height, x, y, radius);
      const bb = boxBlurFromIntegral(intB, width, height, x, y, radius);

      const edgeDelta = Math.abs(luma(r, g, b) - luma(br, bg, bb));
      const edgeProtect = Math.max(0, 1 - edgeDelta / edgeThreshold);
      const blend = blendBase * edgeProtect;
      if (blend <= 0.01) continue;

      data[idx] = clampByte(r + (br - r) * blend);
      data[idx + 1] = clampByte(g + (bg - g) * blend);
      data[idx + 2] = clampByte(b + (bb - b) * blend);
    }
  }
}

function applyRednessReduction(imageData: ImageData, amount: number) {
  if (amount <= 0) return;

  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isLikelySkinTone(r, g, b)) continue;

    const { h, s, l } = rgbToHsl(r, g, b);

    // Target red-ish skin tones — CRANKED UP 4x
    const boosted = amount * 4;
    const redWeight = Math.max(0, 1 - hueDistance(h, 10) / 70);
    const satWeight = Math.max(0, Math.min(1, (s - 0.04) / 0.4));
    const lightWeight = Math.max(0, 1 - Math.abs(l - 0.55) / 0.6);
    const strength = boosted * redWeight * satWeight * lightWeight;
    if (strength <= 0.01) continue;

    const targetHue = 28; // warm peach, avoids cyan/green cast
    const nextHue = (h + hueDelta(h, targetHue) * Math.min(1, strength * 0.6) + 360) % 360;
    const nextSat = Math.max(0, s * (1 - Math.min(0.95, strength * 0.8)));

    const next = hslToRgb(nextHue, nextSat, l);
    data[i] = next.r;
    data[i + 1] = next.g;
    data[i + 2] = next.b;
  }
}

/** A single collage half — shows upload prompt when empty, gesture-enabled image when filled */
function CollageHalf({ src, label, onClear, onFileSelect, active, onSelect }: {
  src: string | null;
  label: string;
  onClear: () => void;
  onFileSelect: (file: File) => void;
  active: boolean;
  onSelect: () => void;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const tRef = useRef<Transform>({ ...DEFAULT_TRANSFORM });
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = () => {
    if (innerRef.current) {
      const t = tRef.current;
      innerRef.current.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`;
    }
  };

  const bind = useGesture(
    {
      onDrag: ({ offset: [ox, oy], event }) => {
        if (!src || !active) return;
        event.preventDefault();
        tRef.current = { ...tRef.current, x: ox, y: oy };
        apply();
      },
      onPinch: ({ offset: [s], da: [, angle], memo, first, event }) => {
        if (!src || !active) return;
        event.preventDefault();
        if (first) memo = { startAngle: angle, startRotation: tRef.current.rotation };
        const angleDelta = angle - (memo?.startAngle ?? 0);
        const clamped = Math.min(Math.max(s, MIN_GESTURE_SCALE), MAX_GESTURE_SCALE);
        tRef.current = { ...tRef.current, scale: clamped, rotation: (memo?.startRotation ?? 0) + angleDelta };
        apply();
        return memo;
      },
    },
    {
      drag: { from: () => [tRef.current.x, tRef.current.y], filterTaps: true },
      pinch: { from: () => [tRef.current.scale, 0], scaleBounds: { min: MIN_GESTURE_SCALE, max: MAX_GESTURE_SCALE } },
    }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      tRef.current = { ...DEFAULT_TRANSFORM };
      if (innerRef.current) {
        const t = tRef.current;
        innerRef.current.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale}) rotate(${t.rotation}deg)`;
      }
      onFileSelect(e.target.files[0]);
    }
    e.target.value = '';
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ touchAction: 'none' }}
      data-gesture-frame
      onClick={() => { if (src) onSelect(); }}
    >
      {/* Active selection glow indicator */}
      {src && active && (
        <div
          className="absolute inset-0 z-30 pointer-events-none"
          style={{
            border: `2px solid ${GOLD}`,
            boxShadow: `inset 0 0 14px rgba(212, 175, 55, 0.35), 0 0 8px rgba(212, 175, 55, 0.25)`,
          }}
        />
      )}
      {src ? (
        <>
          <div
            ref={innerRef}
            data-gesture-inner
            {...bind()}
            className="absolute will-change-transform"
            style={{
              touchAction: 'none',
              cursor: active ? 'grab' : 'pointer',
              transformOrigin: 'center center',
              top: '-50%', left: '-50%', width: '200%', height: '200%',
              transform: `translate3d(${tRef.current.x}px, ${tRef.current.y}px, 0) scale(${tRef.current.scale}) rotate(${tRef.current.rotation}deg)`,
            }}
          >
            <img src={src} alt="" className="w-full h-full object-cover object-center pointer-events-none select-none" draggable={false} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm z-20 hover:bg-black/70 transition-all"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm z-20 hover:bg-black/70 transition-all"
          >
            <Camera className="w-3 h-3 text-white" />
          </button>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-full flex flex-col items-center justify-center gap-1.5 transition-colors"
          style={{ background: 'hsla(38, 40%, 96%, 0.6)' }}
        >
          <Camera className="w-6 h-6" style={{ color: GOLD_DARK }} />
          <span className="text-xs font-serif font-medium" style={{ color: GOLD_DARK }}>{label}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
  const [activeHalf, setActiveHalf] = useState<'before' | 'after'>('before');
  const collageRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Per-side retouch state
  const [retouchBefore, setRetouchBefore] = useState({ smooth: 0, redness: 0 });
  const [retouchAfter, setRetouchAfter] = useState({ smooth: 0, redness: 0 });

  const activeRetouch = activeHalf === 'before' ? retouchBefore : retouchAfter;
  const setActiveRetouch = activeHalf === 'before' ? setRetouchBefore : setRetouchAfter;

  const { uploadPhoto } = useClientGallery(clientId, artistId);
  const resolvedLogo = logoUrl || STUDIO_LOGO_URL;
  const bothUploaded = before && after;

  const setFile = (which: 'before' | 'after') => (file: File) => {
    const url = URL.createObjectURL(file);
    which === 'before' ? setBefore(url) : setAfter(url);
    setActiveHalf(which);
  };

  /** Render clean 1080×1080 canvas */
  const renderToCanvas = useCallback(async (): Promise<HTMLCanvasElement> => {
    if (!before || !after) throw new Error('Both photos required');
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

    const drawCover = (img: HTMLImageElement, xStart: number, width: number, height: number, domEl: HTMLDivElement | null) => {
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

      const previewHalf = collageRef.current ? collageRef.current.clientWidth / 2 : HALF;
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

    const [beforeImg, afterImg] = await Promise.all([loadImg(before), loadImg(after)]);
    const frames = collageRef.current?.querySelectorAll<HTMLDivElement>('[data-gesture-frame]');
    const beforeDom = frames?.[0]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;
    const afterDom = frames?.[1]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;

    drawCover(beforeImg, 0, HALF - DIVIDER_W / 2, SIZE, beforeDom);
    drawCover(afterImg, HALF + DIVIDER_W / 2, HALF - DIVIDER_W / 2, SIZE, afterDom);

    // Apply per-side retouch
    if (retouchBefore.smooth > 0 || retouchBefore.redness > 0) {
      const leftData = ctx.getImageData(0, 0, HALF, SIZE);
      if (retouchBefore.smooth > 0) applySkinSmoothing(leftData, retouchBefore.smooth);
      if (retouchBefore.redness > 0) applyRednessReduction(leftData, retouchBefore.redness);
      ctx.putImageData(leftData, 0, 0);
    }
    if (retouchAfter.smooth > 0 || retouchAfter.redness > 0) {
      const rightData = ctx.getImageData(HALF, 0, HALF, SIZE);
      if (retouchAfter.smooth > 0) applySkinSmoothing(rightData, retouchAfter.smooth);
      if (retouchAfter.redness > 0) applyRednessReduction(rightData, retouchAfter.redness);
      ctx.putImageData(rightData, HALF, 0);
    }

    // Gold divider
    ctx.fillStyle = GOLD;
    ctx.fillRect(HALF - DIVIDER_W / 2, 0, DIVIDER_W, SIZE);

    // Labels
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
  }, [before, after, resolvedLogo, retouchBefore, retouchAfter]);

  const handleSave = useCallback(async () => {
    if (!clientId) { toast({ title: 'לא ניתן לשמור ללא תיק לקוחה', variant: 'destructive' }); return; }
    if (!before || !after) { toast({ title: 'יש להעלות שתי תמונות', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const canvas = await renderToCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await uploadPhoto(dataUrl, { photoType: 'collage', label: 'Before & After' });
      toast({ title: 'נשמר בתיק הלקוחה ✅' });
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ title: 'שגיאה בשמירה', description: err?.message || '', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [renderToCanvas, clientId, uploadPhoto, before, after]);

  const handleDownload = useCallback(async () => {
    if (!before || !after) { toast({ title: 'יש להעלות שתי תמונות', variant: 'destructive' }); return; }
    setDownloading(true);
    try {
      const canvas = await renderToCanvas();
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.95));
      if (!blob) throw new Error('Failed to create image');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `collage-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast({ title: 'הקולאז׳ הורד בהצלחה 📥' });
    } catch (err: any) {
      console.error('Download error:', err);
      toast({ title: 'שגיאה בהורדה', variant: 'destructive' });
    } finally { setDownloading(false); }
  }, [renderToCanvas, before, after]);

  const hasRetouch = activeRetouch.smooth > 0 || activeRetouch.redness > 0;

  return (
    <div className="space-y-4">
      {/* Hint */}
      <p className="text-center text-[10px] font-serif" style={{ color: GOLD_DARK }}>
        👆 לחצי על צד כדי לבחור אותו · ☝️ גררי להזזה · 🤏 צבטי לזום
      </p>

      {/* Single unified collage frame — always visible */}
      <div
        ref={collageRef}
        className="relative w-full rounded-2xl overflow-hidden shadow-lg"
        style={{ aspectRatio: '1 / 1', border: `2px solid ${GOLD}`, background: '#000' }}
      >
        {/* BEFORE half (left) */}
        <div className="absolute inset-y-0 left-0 w-1/2">
          <CollageHalf src={before} label="לפני" onClear={() => setBefore(null)} onFileSelect={setFile('before')} active={activeHalf === 'before'} onSelect={() => setActiveHalf('before')} />
        </div>
        {/* AFTER half (right) */}
        <div className="absolute inset-y-0 right-0 w-1/2">
          <CollageHalf src={after} label="אחרי ✨" onClear={() => setAfter(null)} onFileSelect={setFile('after')} active={activeHalf === 'after'} onSelect={() => setActiveHalf('after')} />
        </div>
        {/* Gold divider */}
        <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 z-10 pointer-events-none" style={{ backgroundColor: GOLD }} />
        {/* Labels overlay */}
        {bothUploaded && (
          <>
            <span className="absolute bottom-3 left-3 text-white text-xs font-bold font-serif tracking-wide pointer-events-none z-10" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              לפני
            </span>
            <span className="absolute bottom-3 right-3 text-white text-xs font-bold font-serif tracking-wide pointer-events-none z-10" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
              אחרי ✨
            </span>
          </>
        )}
      </div>

      {/* ── Retouch Section ── */}
      <div className="rounded-xl p-3 space-y-2.5" style={{ backgroundColor: '#faf8f2', border: `1px solid ${GOLD}30` }}>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
          <span className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD_DARK }}>ריטאצ׳ עדין</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${GOLD}20`, color: GOLD_DARK }}>
            {activeHalf === 'before' ? 'לפני' : 'אחרי ✨'}
          </span>
          {hasRetouch && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${GOLD}40`, color: GOLD_DARK }}>פעיל</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
          <div className="flex-1 space-y-0.5">
            <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>החלקת עור</span>
            <Slider value={[activeRetouch.smooth]} onValueChange={([v]) => setActiveRetouch(prev => ({ ...prev, smooth: v }))} min={0} max={1} step={0.05} />
          </div>
          <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>{Math.round(activeRetouch.smooth * 100)}%</span>
        </div>
        <div className="flex items-center gap-3">
          <Droplets className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
          <div className="flex-1 space-y-0.5">
            <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>הפחתת אדמומיות</span>
            <Slider value={[activeRetouch.redness]} onValueChange={([v]) => setActiveRetouch(prev => ({ ...prev, redness: v }))} min={0} max={1} step={0.05} />
          </div>
          <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>{Math.round(activeRetouch.redness * 100)}%</span>
        </div>
      </div>

      {/* ── Permanent action buttons — always visible ── */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={handleSave}
          disabled={saving || !bothUploaded}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
          style={{
            background: bothUploaded ? GOLD_GRADIENT : `${GOLD}44`,
            color: '#5C4033',
            boxShadow: bothUploaded ? '0 4px 20px -4px rgba(212, 175, 55, 0.5)' : 'none',
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'שומר...' : 'שמור לתיק לקוחה'}
        </button>

        <button
          onClick={handleDownload}
          disabled={downloading || !bothUploaded}
          className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold font-serif tracking-wide transition-all hover:scale-105 active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
          style={{
            background: 'transparent',
            color: GOLD_DARK,
            border: `2px solid ${bothUploaded ? GOLD : `${GOLD}44`}`,
          }}
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'מוריד...' : 'הורדה לגלריה'}
        </button>
      </div>
    </div>
  );
}

export default DualPhotoGallery;
