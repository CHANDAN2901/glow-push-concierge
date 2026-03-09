import { useState, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { Camera, Download, Loader2, X, Save, Upload, Move } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClientGallery } from '@/hooks/useClientGallery';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { useI18n } from '@/lib/i18n';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface Transform {
  x: number; y: number; scale: number; rotation: number;
}

const MIN_GESTURE_SCALE = 0.1;
const MAX_GESTURE_SCALE = 8;
const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1, rotation: 0 };
const COLLAGE_HALF_ASPECT = 0.5;

/** A single collage half */
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
  const [imgAspect, setImgAspect] = useState<number | null>(null);

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
      setImgAspect(null);
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
            className="absolute inset-0 flex items-center justify-center will-change-transform"
            style={{
              touchAction: 'none',
              cursor: active ? 'grab' : 'pointer',
              transformOrigin: 'center center',
              transform: `translate3d(${tRef.current.x}px, ${tRef.current.y}px, 0) scale(${tRef.current.scale}) rotate(${tRef.current.rotation}deg)`,
            }}
          >
            <img
              src={src}
              alt=""
              onLoad={(e) => {
                const w = e.currentTarget.naturalWidth || 1;
                const h = e.currentTarget.naturalHeight || 1;
                setImgAspect(w / h);
              }}
              className="pointer-events-none select-none"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              draggable={false}
            />
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
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [activeHalf, setActiveHalf] = useState<'before' | 'after'>('before');
  const collageRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { uploadPhoto } = useClientGallery(clientId, artistId);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [logoHidden, setLogoHidden] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const resolvedLogo = logoHidden ? null : (logoUrl || customLogo || null);
  const bothUploaded = before && after;

  // Draggable logo state — position as % of container, size as % of width
  const [logoPos, setLogoPos] = useState({ x: 50, y: 50 }); // center by default (%)
  const [logoSize, setLogoSize] = useState(25); // 25% of collage width
  const logoDragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleLogoUpload = async (file: File) => {
    if (!artistId) return;
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${artistId}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('portfolio').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from('portfolio').getPublicUrl(path);
      setCustomLogo(publicUrl);
      await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', artistId);
      toast({ title: isHe ? 'הלוגו עודכן בהצלחה ✅' : 'Logo updated ✅' });
    } catch (err: any) {
      toast({ title: isHe ? 'שגיאה בהעלאת לוגו' : 'Logo upload failed', description: err?.message, variant: 'destructive' });
    }
  };

  const setFile = (which: 'before' | 'after') => (file: File) => {
    const url = URL.createObjectURL(file);
    which === 'before' ? setBefore(url) : setAfter(url);
    setActiveHalf(which);
  };

  // Logo drag handlers
  const handleLogoDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    logoDragRef.current = { startX: clientX, startY: clientY, startPosX: logoPos.x, startPosY: logoPos.y };

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!logoDragRef.current || !collageRef.current) return;
      const cx = 'touches' in ev ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const rect = collageRef.current.getBoundingClientRect();
      const dx = ((cx - logoDragRef.current.startX) / rect.width) * 100;
      const dy = ((cy - logoDragRef.current.startY) / rect.height) * 100;
      const newX = Math.max(0, Math.min(100, logoDragRef.current.startPosX + dx));
      const newY = Math.max(0, Math.min(100, logoDragRef.current.startPosY + dy));
      setLogoPos({ x: newX, y: newY });
    };

    const handleEnd = () => {
      logoDragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
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
    ctx.filter = 'none';
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
      ctx.filter = 'none';
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    };

    const [beforeImg, afterImg] = await Promise.all([loadImg(before), loadImg(after)]);
    const frames = collageRef.current?.querySelectorAll<HTMLDivElement>('[data-gesture-frame]');
    const beforeDom = frames?.[0]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;
    const afterDom = frames?.[1]?.querySelector<HTMLDivElement>('[data-gesture-inner]') || null;

    drawCover(beforeImg, 0, HALF - DIVIDER_W / 2, SIZE, beforeDom);
    drawCover(afterImg, HALF + DIVIDER_W / 2, HALF - DIVIDER_W / 2, SIZE, afterDom);

    // Gold divider
    ctx.fillStyle = GOLD;
    ctx.fillRect(HALF - DIVIDER_W / 2, 0, DIVIDER_W, SIZE);

    // Labels — gold text, fixed positions
    ctx.font = 'bold 30px serif';
    ctx.fillStyle = GOLD;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    ctx.fillText('BEFORE', 24, SIZE - 28);
    ctx.textAlign = 'right';
    ctx.fillText('AFTER', SIZE - 24, SIZE - 28);
    ctx.shadowBlur = 0;

    // Artist logo — drawn at user-chosen position & size, as a clean sticker
    if (resolvedLogo) {
      try {
        const logoImg = await loadImg(resolvedLogo);
        const logoW = SIZE * (logoSize / 100);
        const logoH = (logoImg.height / logoImg.width) * logoW;
        // Convert % position to pixel (position is center of logo)
        const lx = (logoPos.x / 100) * SIZE - logoW / 2;
        const ly = (logoPos.y / 100) * SIZE - logoH / 2;

        // Draw subtle shadow behind logo for sticker feel
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.drawImage(logoImg, lx, ly, logoW, logoH);
        ctx.restore();
      } catch { /* skip */ }
    }

    return canvas;
  }, [before, after, resolvedLogo, logoPos, logoSize]);

  const handleSave = useCallback(async () => {
    if (!clientId) { toast({ title: isHe ? 'לא ניתן לשמור ללא תיק לקוחה' : 'Cannot save without a client file', variant: 'destructive' }); return; }
    if (!before || !after) { toast({ title: isHe ? 'יש להעלות שתי תמונות' : 'Please upload both photos', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const canvas = await renderToCanvas();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await uploadPhoto(dataUrl, { photoType: 'collage', label: 'Before & After' });
      toast({ title: isHe ? 'נשמר בתיק הלקוחה ✅' : 'Saved to client file ✅' });
    } catch (err: any) {
      console.error('Save error:', err);
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Save failed', description: err?.message || '', variant: 'destructive' });
    } finally { setSaving(false); }
  }, [renderToCanvas, clientId, uploadPhoto, before, after]);

  const handleDownload = useCallback(async () => {
    if (!before || !after) { toast({ title: isHe ? 'יש להעלות שתי תמונות' : 'Please upload both photos', variant: 'destructive' }); return; }
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
      toast({ title: isHe ? 'הקולאז׳ הורד בהצלחה 📥' : 'Collage downloaded 📥' });
    } catch (err: any) {
      console.error('Download error:', err);
      toast({ title: isHe ? 'שגיאה בהורדה' : 'Download failed', variant: 'destructive' });
    } finally { setDownloading(false); }
  }, [renderToCanvas, before, after, isHe]);

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="text-center space-y-1">
        <p className="text-sm font-serif font-semibold" style={{ color: GOLD_DARK }}>
          📸 העלי תמונות של לפני ואחרי
        </p>
        <p className="text-[10px] font-serif" style={{ color: GOLD_DARK, opacity: 0.75 }}>
          לחצי על המסגרת כדי לבחור תמונה. גררי את הלוגו למיקום הרצוי.
        </p>
        {/* Upload Logo button */}
        {!resolvedLogo && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-1 text-[10px] font-medium px-3 py-1 rounded-full transition-all hover:scale-105"
              style={{ border: `1px solid ${GOLD}`, color: GOLD_DARK }}
            >
              <Upload className="w-3 h-3" />
              העלי לוגו לסימון מים
            </button>
          </div>
        )}
      </div>

      {/* Collage frame */}
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

        {/* Draggable Logo Sticker */}
        {resolvedLogo && bothUploaded && (
          <div
            onMouseDown={handleLogoDragStart}
            onTouchStart={handleLogoDragStart}
            className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
            style={{
              left: `${logoPos.x}%`,
              top: `${logoPos.y}%`,
              transform: 'translate(-50%, -50%)',
              width: `${logoSize}%`,
              touchAction: 'none',
            }}
          >
            <img
              src={resolvedLogo}
              alt="Logo"
              className="w-full h-auto pointer-events-none select-none rounded-md"
              style={{
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
              draggable={false}
            />
            <div
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: GOLD, boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
            >
              <Move className="w-3 h-3 text-white" />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setLogoHidden(true); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setLogoHidden(true); }}
              className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#555', boxShadow: '0 1px 4px rgba(0,0,0,0.4)', zIndex: 30 }}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}

        {/* Labels overlay — FIXED positions */}
        {bothUploaded && (
          <>
            <span className="absolute bottom-3 left-3 text-xs font-bold font-serif tracking-widest uppercase pointer-events-none z-10" style={{ color: GOLD, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              BEFORE
            </span>
            <span className="absolute bottom-3 right-3 text-xs font-bold font-serif tracking-widest uppercase pointer-events-none z-10" style={{ color: GOLD, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              AFTER
            </span>
          </>
        )}
      </div>

      {/* Logo size slider — only shown when logo exists and both images uploaded */}
      {resolvedLogo && bothUploaded && (
        <div className="rounded-xl p-3 space-y-1.5" style={{ backgroundColor: '#faf8f2', border: `1px solid ${GOLD}30` }}>
          <div className="flex items-center gap-2">
            <Move className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
            <span className="text-[11px] font-semibold" style={{ color: GOLD_DARK }}>{isHe ? 'גודל לוגו' : 'Logo size'}</span>
            <span className="text-[10px] font-medium ml-auto" style={{ color: GOLD_DARK }}>{logoSize}%</span>
          </div>
          <Slider
            value={[logoSize]}
            onValueChange={([v]) => setLogoSize(v)}
            min={8}
            max={50}
            step={1}
          />
          <p className="text-[9px] text-center" style={{ color: GOLD_DARK, opacity: 0.6 }}>
            {isHe ? 'גררי את הלוגו על הקולאז׳ למיקום הרצוי' : 'Drag the logo on the collage to reposition'}
          </p>
        </div>
      )}

      {/* ── Action buttons ── */}
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
          {saving ? (isHe ? 'שומר...' : 'Saving...') : (isHe ? 'שמור לתיק לקוחה' : 'Save to client file')}
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
          {downloading ? (isHe ? 'מוריד...' : 'Downloading...') : (isHe ? 'הורדה לגלריה' : 'Download')}
        </button>
      </div>
    </div>
  );
}

export default DualPhotoGallery;
