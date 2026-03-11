import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, Sun, Contrast, PenTool, Undo2, Check, X, Sparkles, Droplets, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface ImageEditorDialogProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (editedBase64: string) => void;
}

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

/* ── pixel-level retouch helpers ── */

/** Gentle skin smoothing: blends each pixel with a small-radius average, preserving edges. */
function applySkinSmoothing(imageData: ImageData, amount: number) {
  if (amount <= 0) return;
  const { width, height, data } = imageData;
  const src = new Uint8ClampedArray(data); // copy
  const radius = Math.max(1, Math.round(amount * 3)); // 0-1 → 1-3px radius
  const threshold = 18 + amount * 12; // edge-preserve threshold

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          const diff = Math.abs(src[nIdx] - src[idx]) + Math.abs(src[nIdx + 1] - src[idx + 1]) + Math.abs(src[nIdx + 2] - src[idx + 2]);
          // Only blend similar-color neighbours (edge preservation)
          if (diff < threshold) {
            rSum += src[nIdx];
            gSum += src[nIdx + 1];
            bSum += src[nIdx + 2];
            count++;
          }
        }
      }

      if (count > 0) {
        const blend = amount * 0.6; // max 60% blend to keep texture
        data[idx]     = src[idx]     + (rSum / count - src[idx])     * blend;
        data[idx + 1] = src[idx + 1] + (gSum / count - src[idx + 1]) * blend;
        data[idx + 2] = src[idx + 2] + (bSum / count - src[idx + 2]) * blend;
      }
    }
  }
}

/** Targeted redness reduction: desaturates only reddish pixels. */
function applyRednessReduction(imageData: ImageData, amount: number) {
  if (amount <= 0) return;
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Detect reddish skin tones: red channel dominant, not too dark/bright
    const isReddish = r > 80 && r > g * 1.15 && r > b * 1.2 && r < 245;
    if (!isReddish) continue;

    // How "red" is this pixel (0-1)
    const redness = Math.min(1, ((r - g) + (r - b)) / 200);
    const reduction = redness * amount * 0.45; // subtle cap

    // Shift red channel down, nudge green up slightly for even tone
    data[i]     = r - r * reduction * 0.35;
    data[i + 1] = g + (r - g) * reduction * 0.12;
    // Blue stays mostly untouched
  }
}

const ImageEditorDialog = ({ open, onClose, imageSrc, onSave }: ImageEditorDialogProps) => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const [rotation, setRotation] = useState(0);
  const [baseRotation, setBaseRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [skinSmooth, setSkinSmooth] = useState(0);
  const [rednessReduce, setRednessReduce] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Drawing state
  const [drawingMode, setDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPaths, setDrawPaths] = useState<{ x: number; y: number }[][]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState(GOLD);

  const W = 400;
  const H = 533;

  // Load image once
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setRotation(0);
      setBaseRotation(0);
      setZoom(1);
      setBrightness(100);
      setContrast(100);
      setSkinSmooth(0);
      setRednessReduce(0);
      setOffsetX(0);
      setOffsetY(0);
      setDrawPaths([]);
      setCurrentPath([]);
      setDrawingMode(false);
      drawCanvas(img, 0, 1, 0, 0, 100, 100, 0, 0);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw on param change
  useEffect(() => {
    if (imgRef.current) drawCanvas(imgRef.current, baseRotation + rotation, zoom, offsetX, offsetY, brightness, contrast, skinSmooth, rednessReduce);
  }, [rotation, baseRotation, zoom, offsetX, offsetY, brightness, contrast, skinSmooth, rednessReduce]);

  // Redraw drawing overlay
  useEffect(() => {
    redrawDrawingLayer();
  }, [drawPaths, currentPath]);

  const drawCanvas = (img: HTMLImageElement, rot: number, zm: number, ox: number, oy: number, br: number, ct: number, smooth: number, redness: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    ctx.filter = `brightness(${br}%) contrast(${ct}%)`;

    ctx.save();
    ctx.translate(W / 2 + ox, H / 2 + oy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(zm, zm);

    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    ctx.filter = 'none';

    // Apply pixel-level retouching
    if (smooth > 0 || redness > 0) {
      const imageData = ctx.getImageData(0, 0, W, H);
      if (smooth > 0) applySkinSmoothing(imageData, smooth);
      if (redness > 0) applyRednessReduction(imageData, redness);
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const redrawDrawingLayer = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);

    const allPaths = [...drawPaths, ...(currentPath.length > 0 ? [currentPath] : [])];
    for (const path of allPaths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();
    }
  };

  const handleRotate = () => setBaseRotation((r) => (r + 90) % 360);

  const getCanvasCoords = (e: React.PointerEvent) => {
    const canvas = drawCanvasRef.current || canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (drawingMode) {
      setIsDrawing(true);
      const coords = getCanvasCoords(e);
      setCurrentPath([coords]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offsetX, offsetY, drawingMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (drawingMode && isDrawing) {
      const coords = getCanvasCoords(e);
      setCurrentPath(prev => [...prev, coords]);
      return;
    }
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  }, [isDragging, dragStart, drawingMode, isDrawing]);

  const handlePointerUp = useCallback(() => {
    if (drawingMode && isDrawing) {
      setIsDrawing(false);
      if (currentPath.length > 1) {
        setDrawPaths(prev => [...prev, currentPath]);
      }
      setCurrentPath([]);
      return;
    }
    setIsDragging(false);
  }, [drawingMode, isDrawing, currentPath]);

  const undoLastDraw = () => {
    setDrawPaths(prev => prev.slice(0, -1));
  };

  const getMergedCanvas = () => {
    const canvas = canvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!canvas) return null;

    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = W;
    mergedCanvas.height = H;
    const ctx = mergedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    if (drawCanvas) {
      ctx.drawImage(drawCanvas, 0, 0);
    }
    return mergedCanvas;
  };

  const handleSave = () => {
    const mergedCanvas = getMergedCanvas();
    if (!mergedCanvas) return;
    const dataUrl = mergedCanvas.toDataURL('image/jpeg', 0.92);
    onSave(dataUrl);
  };

  const handleDownload = async () => {
    const mergedCanvas = getMergedCanvas();
    if (!mergedCanvas) return;
    const blob = await new Promise<Blob | null>((resolve) =>
      mergedCanvas.toBlob(resolve, 'image/jpeg', 0.95)
    );
    if (!blob) return;
    const fileName = `edited-photo-${Date.now()}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Edited Photo' });
    } else {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }
  };

  const drawColors = [GOLD, '#EF4444', '#3B82F6', '#10B981', '#000000'];

  const hasRetouch = skinSmooth > 0 || rednessReduce > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden border-2 flex flex-col"
        style={{ borderColor: GOLD, backgroundColor: '#ffffff', maxHeight: '85dvh' }}
        dir={isHe ? 'rtl' : 'ltr'}
      >
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle className="text-base font-serif font-semibold tracking-wide" style={{ color: '#1a1a1a' }}>
            {isHe ? '✏️ עריכת תמונה' : '✏️ Edit Image'}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable middle area */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-3 space-y-3">
          {/* Canvas preview */}
          <div className="relative w-full flex justify-center">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="rounded-xl max-h-[35vh] w-auto touch-none"
                style={{ maxWidth: '100%', border: `1.5px solid ${GOLD}` }}
              />
              <canvas
                ref={drawCanvasRef}
                className="absolute inset-0 rounded-xl max-h-[35vh] w-auto touch-none"
                style={{
                  maxWidth: '100%',
                  cursor: drawingMode ? 'crosshair' : 'grab',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            </div>
          </div>

          {/* Rotate + Drawing toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="gap-1.5 rounded-xl text-xs font-medium"
              style={{ borderColor: GOLD, color: GOLD_DARK }}
            >
              <RotateCw className="w-3.5 h-3.5" />
              {isHe ? 'סיבוב 90°' : 'Rotate 90°'}
            </Button>
            <Button
              variant={drawingMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDrawingMode(!drawingMode)}
              className="gap-1.5 rounded-xl text-xs font-medium"
              style={drawingMode
                ? { background: GOLD_GRADIENT, color: '#4a3636', border: 'none' }
                : { borderColor: GOLD, color: GOLD_DARK }
              }
            >
              <PenTool className="w-3.5 h-3.5" />
              {isHe ? 'סימון' : 'Markup'}
            </Button>
            {drawPaths.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={undoLastDraw}
                className="gap-1 rounded-xl text-xs"
                style={{ color: GOLD_DARK }}
              >
                <Undo2 className="w-3.5 h-3.5" />
                {isHe ? 'בטל' : 'Undo'}
              </Button>
            )}
          </div>

          {/* Drawing color picker */}
          {drawingMode && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium" style={{ color: GOLD_DARK }}>
                {isHe ? 'צבע:' : 'Color:'}
              </span>
              {drawColors.map(c => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: drawColor === c ? '#1a1a1a' : 'transparent',
                    transform: drawColor === c ? 'scale(1.15)' : undefined,
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Retouch Section ── */}
          <div className="rounded-xl p-3 space-y-2.5" style={{ backgroundColor: '#faf8f2', border: `1px solid ${GOLD}30` }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: GOLD_DARK }}>
                {isHe ? 'ריטאצ׳ עדין' : 'Subtle Retouch'}
              </span>
              {hasRetouch && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${GOLD}20`, color: GOLD_DARK }}>
                  {isHe ? 'פעיל' : 'Active'}
                </span>
              )}
            </div>

            {/* Skin Smoothing */}
            <div className="flex items-center gap-3">
              <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
              <div className="flex-1 space-y-0.5">
                <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>
                  {isHe ? 'החלקת עור' : 'Skin Smoothing'}
                </span>
                <Slider
                  value={[skinSmooth]}
                  onValueChange={([v]) => setSkinSmooth(v)}
                  min={0}
                  max={1}
                  step={0.05}
                  className="flex-1"
                />
              </div>
              <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>
                {Math.round(skinSmooth * 100)}%
              </span>
            </div>

            {/* Redness Reduction */}
            <div className="flex items-center gap-3">
              <Droplets className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
              <div className="flex-1 space-y-0.5">
                <span className="text-[10px] font-medium block" style={{ color: GOLD_DARK }}>
                  {isHe ? 'הפחתת אדמומיות' : 'Redness Reduction'}
                </span>
                <Slider
                  value={[rednessReduce]}
                  onValueChange={([v]) => setRednessReduce(v)}
                  min={0}
                  max={1}
                  step={0.05}
                  className="flex-1"
                />
              </div>
              <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>
                {Math.round(rednessReduce * 100)}%
              </span>
            </div>

            <p className="text-[9px] text-center" style={{ color: `${GOLD_DARK}99` }}>
              {isHe ? 'שומר על מרקם טבעי · מראה אדיטוריאלי מקצועי' : 'Preserves natural texture · Professional editorial look'}
            </p>
          </div>

          {/* Fine Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
            <Slider
              value={[rotation]}
              onValueChange={([v]) => setRotation(v)}
              min={-45}
              max={45}
              step={0.5}
              className="flex-1"
            />
            <span className="text-[10px] w-10 text-center font-medium" style={{ color: GOLD_DARK }}>
              {rotation > 0 ? '+' : ''}{rotation}°
            </span>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomIn className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
            <Slider
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              min={0.5}
              max={3}
              step={0.05}
              className="flex-1"
            />
            <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Brightness */}
          <div className="flex items-center gap-3">
            <Sun className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
            <Slider
              value={[brightness]}
              onValueChange={([v]) => setBrightness(v)}
              min={50}
              max={150}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>
              {brightness}%
            </span>
          </div>

          {/* Contrast */}
          <div className="flex items-center gap-3">
            <Contrast className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD_DARK }} />
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={50}
              max={150}
              step={1}
              className="flex-1"
            />
            <span className="text-[10px] w-8 text-center font-medium" style={{ color: GOLD_DARK }}>
              {contrast}%
            </span>
          </div>

          {!drawingMode && (
            <p className="text-[10px] text-center font-medium" style={{ color: GOLD_DARK }}>
              {isHe ? 'גררי את התמונה למיקום הרצוי' : 'Drag image to reposition'}
            </p>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 px-5 pt-4 pb-6 border-t flex gap-2 justify-end bg-white" style={{ borderColor: `${GOLD}40`, paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="gap-1 rounded-xl px-4"
            style={{ borderColor: GOLD, color: GOLD_DARK }}
          >
            <X className="w-3.5 h-3.5" />
            {isHe ? 'ביטול' : 'Cancel'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-1 rounded-xl px-4"
            style={{ borderColor: GOLD, color: GOLD_DARK }}
          >
            <Download className="w-3.5 h-3.5" />
            {isHe ? 'הורדה' : 'Download'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="gap-1 rounded-xl px-5 font-bold border-0"
            style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
          >
            <Check className="w-3.5 h-3.5" />
            {isHe ? 'שמירה' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditorDialog;
