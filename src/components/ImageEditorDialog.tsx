import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCw, ZoomIn, Sun, Contrast, PenTool, Undo2, Check, X } from 'lucide-react';
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
      setOffsetX(0);
      setOffsetY(0);
      setDrawPaths([]);
      setCurrentPath([]);
      setDrawingMode(false);
      drawCanvas(img, 0, 1, 0, 0, 100, 100);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw on param change
  useEffect(() => {
    if (imgRef.current) drawCanvas(imgRef.current, baseRotation + rotation, zoom, offsetX, offsetY, brightness, contrast);
  }, [rotation, baseRotation, zoom, offsetX, offsetY, brightness, contrast]);

  // Redraw drawing overlay
  useEffect(() => {
    redrawDrawingLayer();
  }, [drawPaths, currentPath]);

  const drawCanvas = (img: HTMLImageElement, rot: number, zm: number, ox: number, oy: number, br: number, ct: number) => {
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

  const handleSave = () => {
    const canvas = canvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    if (!canvas) return;

    // Merge drawing onto main canvas
    const mergedCanvas = document.createElement('canvas');
    mergedCanvas.width = W;
    mergedCanvas.height = H;
    const ctx = mergedCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    if (drawCanvas) {
      ctx.drawImage(drawCanvas, 0, 0);
    }

    const dataUrl = mergedCanvas.toDataURL('image/jpeg', 0.92);
    onSave(dataUrl);
  };

  const drawColors = [GOLD, '#EF4444', '#3B82F6', '#10B981', '#000000'];

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
                ? { background: GOLD_GRADIENT, color: '#5C4033', border: 'none' }
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
            size="sm"
            onClick={handleSave}
            className="gap-1 rounded-xl px-5 font-bold border-0"
            style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
          >
            <Check className="w-3.5 h-3.5" />
            {isHe ? 'שמור שינויים' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditorDialog;
