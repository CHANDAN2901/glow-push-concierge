import { useState } from 'react';
import { Sparkles, Upload, Wand2, ImagePlus, Copy, CheckCircle, Download, Crown, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AiMagicSectionProps {
  lang: 'en' | 'he';
  artistName: string;
  logoUrl: string;
}

export default function AiMagicSection({ lang, artistName, logoUrl }: AiMagicSectionProps) {
  const { toast } = useToast();

  // Story Writer state
  const [storyPhoto, setStoryPhoto] = useState<string | null>(null);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyTreatment, setStoryTreatment] = useState('');
  const [caption, setCaption] = useState('');
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  // Photo Compare state
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 4 * 1024 * 1024) {
        reject(new Error('File too large'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const fixOrientation = (img: HTMLImageElement): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return canvas;
  };

  const detectFaceCenter = async (canvas: HTMLCanvasElement): Promise<{ x: number; y: number } | null> => {
    try {
      if ('FaceDetector' in window) {
        const detector = new (window as any).FaceDetector();
        const faces = await detector.detect(canvas);
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        }
      }
    } catch { /* fallback to center */ }
    return null;
  };

  const smartCrop = (
    source: HTMLCanvasElement,
    centerX: number,
    centerY: number,
    targetW: number,
    targetH: number,
  ): HTMLCanvasElement => {
    const sW = source.width;
    const sH = source.height;
    const targetAspect = targetW / targetH;
    const sourceAspect = sW / sH;

    let cropW: number, cropH: number;
    if (sourceAspect > targetAspect) {
      cropH = sH;
      cropW = sH * targetAspect;
    } else {
      cropW = sW;
      cropH = sW / targetAspect;
    }

    let sx = Math.max(0, Math.min(sW - cropW, centerX - cropW / 2));
    let sy = Math.max(0, Math.min(sH - cropH, centerY - cropH / 2));

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(source, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
    return out;
  };

  const generateCompare = async () => {
    if (!beforePhoto || !afterPhoto) {
      toast({ title: lang === 'en' ? 'Upload both photos' : 'העלי שתי תמונות', variant: 'destructive' });
      return;
    }
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const [beforeImg, afterImg] = await Promise.all([loadImage(beforePhoto), loadImage(afterPhoto)]);

      const beforeCanvas = fixOrientation(beforeImg);
      const afterCanvas = fixOrientation(afterImg);

      const [beforeFace, afterFace] = await Promise.all([
        detectFaceCenter(beforeCanvas),
        detectFaceCenter(afterCanvas),
      ]);
      const bCenter = beforeFace || { x: beforeCanvas.width / 2, y: beforeCanvas.height / 2 };
      const aCenter = afterFace || { x: afterCanvas.width / 2, y: afterCanvas.height / 2 };

      const outputW = 1080;
      const outputH = 1350;
      const frameW = (outputW - 4) / 2;
      const frameH = outputH - 90;
      const labelAreaH = 48;
      const watermarkH = 42;

      const croppedBefore = smartCrop(beforeCanvas, bCenter.x, bCenter.y, frameW, frameH);
      const croppedAfter = smartCrop(afterCanvas, aCenter.x, aCenter.y, frameW, frameH);

      const canvas = document.createElement('canvas');
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, outputW, outputH);

      const topY = labelAreaH;

      ctx.drawImage(croppedBefore, 0, topY, frameW, frameH);
      ctx.drawImage(croppedAfter, frameW + 4, topY, frameW, frameH);

      ctx.fillStyle = '#c2ad50';
      ctx.fillRect(frameW, topY, 4, frameH);

      ctx.font = '600 20px "Assistant", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#999999';
      ctx.fillText('BEFORE', frameW / 2, labelAreaH - 14);
      ctx.fillText('AFTER', frameW + 4 + frameW / 2, labelAreaH - 14);

      ctx.font = '300 15px "Assistant", "Helvetica Neue", sans-serif';
      ctx.fillStyle = '#CCCCCC';
      ctx.textAlign = 'center';
      const watermarkText = `GlowPush${artistName ? ` · ${artistName}` : ''}`;
      ctx.fillText(watermarkText, outputW / 2, outputH - watermarkH / 2 + 4);

      setCompareResult(canvas.toDataURL('image/jpeg', 0.92));
    } catch (e: any) {
      console.error('Compare error:', e);
      toast({ title: lang === 'en' ? 'Failed to generate comparison' : 'שגיאה ביצירת ההשוואה', variant: 'destructive' });
    } finally {
      setCompareLoading(false);
    }
  };

  const generateCaption = async () => {
    setCaptionLoading(true);
    setCaption('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-caption', {
        body: {
          imageBase64: storyPhoto,
          treatmentType: storyTreatment || 'PMU',
          language: lang,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: 'destructive' });
      } else {
        setCaption(data.caption);
      }
    } catch (e: any) {
      toast({ title: lang === 'en' ? 'Failed to generate caption' : 'שגיאה ביצירת הכיתוב', variant: 'destructive' });
    } finally {
      setCaptionLoading(false);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
    toast({ title: lang === 'en' ? 'Copied!' : 'הועתק!' });
  };

  const treatments = [
    { value: 'eyebrows', label: lang === 'en' ? 'Eyebrows' : 'גבות' },
    { value: 'lips', label: lang === 'en' ? 'Lips' : 'שפתיים' },
    { value: 'eyeliner', label: lang === 'en' ? 'Eyeliner' : 'אייליינר' },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="rounded-2xl p-5 bg-background border border-accent shadow-[0_2px_20px_hsl(38_55%_62%/0.08)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-serif font-semibold text-lg flex items-center gap-2">
              {lang === 'en' ? 'AI Magic' : 'קסם AI'} ✨
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                <Crown className="w-2.5 h-2.5" /> PRO
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              {lang === 'en' ? 'AI-powered tools for your social media' : 'כלי AI לרשתות החברתיות שלך'}
            </p>
          </div>
        </div>
      </div>

      {/* Tool 1: AI Story Writer */}
      <div className="rounded-2xl p-5 space-y-4 bg-background border border-border shadow-[0_2px_20px_hsl(38_55%_62%/0.05)]">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent" strokeWidth={1.5} />
          <h3 className="font-serif font-semibold text-sm">
            {lang === 'en' ? 'AI Story Writer' : 'כתבן AI לאינסטגרם'}
          </h3>
        </div>
          <p className="text-xs text-muted-foreground">
            {lang === 'en'
              ? 'Upload a treatment photo and get a professional Instagram caption with hashtags.'
              : 'העלי תמונת טיפול וקבלי כיתוב מקצועי לאינסטגרם עם האשטגים.'}
          </p>

          {/* Treatment selector */}
          <div className="flex gap-2 flex-wrap">
            {treatments.map((t) => (
              <button
                key={t.value}
                onClick={() => setStoryTreatment(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  storyTreatment === t.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-muted-foreground hover:border-accent/30'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Photo upload */}
          {storyPhoto ? (
            <div className="relative flex justify-center">
              <img src={storyPhoto} alt="Treatment" className="max-w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => { setStoryPhoto(null); setStoryFile(null); setCaption(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all border-border bg-muted/30">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{lang === 'en' ? 'Upload Treatment Photo' : 'העלי תמונת טיפול'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const base64 = await handleFileToBase64(file);
                    setStoryPhoto(base64);
                    setStoryFile(file);
                  } catch {
                    toast({ title: lang === 'en' ? 'File too large (max 4MB)' : 'הקובץ גדול מדי (מקס 4MB)', variant: 'destructive' });
                  }
                }}
              />
            </label>
          )}

          <Button
            onClick={generateCaption}
            disabled={captionLoading}
            className="w-full py-5 font-semibold text-white hover:opacity-90 btn-gold-cta"
          >
            {captionLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {lang === 'en' ? 'Writing...' : 'כותב...'}</>
            ) : (
              <><Wand2 className="w-4 h-4 mr-2" /> {lang === 'en' ? 'Generate Caption' : 'צרי כיתוב'}</>
            )}
          </Button>

          {/* Result */}
          {caption && (
            <div className="space-y-3">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#1a1a1a' }}>
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-white/90" dir={lang === 'he' ? 'rtl' : 'ltr'}>{caption}</pre>
              </div>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(caption);

                    if (storyFile && navigator.share && navigator.canShare) {
                      const shareFile = new File([storyFile], 'treatment.jpg', { type: storyFile.type });
                      if (navigator.canShare({ files: [shareFile] })) {
                        await navigator.share({
                          text: caption,
                          files: [shareFile],
                        });
                        return;
                      }
                    }

                    toast({
                      title: lang === 'en' ? 'Text copied! Save the image to upload.' : 'הטקסט הועתק! שמרי את התמונה להעלאה.',
                    });
                  } catch (err: any) {
                    if (err?.name !== 'AbortError') {
                      toast({
                        title: lang === 'en' ? 'Text copied! Save the image to upload.' : 'הטקסט הועתק! שמרי את התמונה להעלאה.',
                      });
                    }
                  }
                }}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-[0.97] btn-gold-cta"
              >
                <Share2 className="w-5 h-5" strokeWidth={1.5} />
                {lang === 'en' ? 'Share to Instagram' : 'שתפי לאינסטגרם'}
              </button>

              <button
                onClick={copyCaption}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors text-muted-foreground"
              >
                {captionCopied
                  ? <><CheckCircle className="w-3.5 h-3.5" /> {lang === 'en' ? 'Copied!' : 'הועתק!'}</>
                  : <><Copy className="w-3.5 h-3.5" /> {lang === 'en' ? 'Copy text only' : 'העתיקי טקסט בלבד'}</>
                }
              </button>
            </div>
          )}
      </div>

      {/* Tool 2: AI Photo Compare */}
      <div className="rounded-2xl p-5 space-y-4 bg-background border border-border shadow-[0_2px_20px_hsl(38_55%_62%/0.05)]">
        <div className="flex items-center gap-2">
          <ImagePlus className="w-4 h-4 text-accent" strokeWidth={1.5} />
          <h3 className="font-serif font-semibold text-sm">
            {lang === 'en' ? 'AI Photo Compare' : 'השוואת תמונות AI'}
          </h3>
        </div>
          <p className="text-xs text-muted-foreground">
            {lang === 'en'
              ? 'Upload Before & After photos. AI aligns them and adds GlowPush watermark.'
              : 'העלי תמונות לפני ואחרי. ה-AI מיישר ומוסיף לוגו GlowPush.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {/* Before */}
            {beforePhoto ? (
              <div className="relative">
                <img src={beforePhoto} alt="Before" className="w-full h-32 object-cover rounded-xl" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-background/80 backdrop-blur-sm">BEFORE</span>
                <button onClick={() => setBeforePhoto(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs text-muted-foreground hover:text-destructive">×</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all border-border bg-muted/30">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{lang === 'en' ? 'Before' : 'לפני'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try { setBeforePhoto(await handleFileToBase64(file)); } catch { toast({ title: 'File too large', variant: 'destructive' }); }
                }} />
              </label>
            )}

            {/* After */}
            {afterPhoto ? (
              <div className="relative">
                <img src={afterPhoto} alt="After" className="w-full h-32 object-cover rounded-xl" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-background/80 backdrop-blur-sm">AFTER</span>
                <button onClick={() => setAfterPhoto(null)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs text-muted-foreground hover:text-destructive">×</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all border-border bg-muted/30">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{lang === 'en' ? 'After' : 'אחרי'}</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try { setAfterPhoto(await handleFileToBase64(file)); } catch { toast({ title: 'File too large', variant: 'destructive' }); }
                }} />
              </label>
            )}
          </div>

          <Button
            onClick={generateCompare}
            disabled={compareLoading || !beforePhoto || !afterPhoto}
            className="w-full py-5 font-semibold text-white hover:opacity-90 btn-gold-cta"
          >
            {compareLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {lang === 'en' ? 'Creating...' : 'יוצר...'}</>
            ) : (
              <><ImagePlus className="w-4 h-4 mr-2" /> {lang === 'en' ? 'Generate Comparison' : 'צרי השוואה'}</>
            )}
          </Button>

          {/* Result */}
          {compareResult && (
            <div className="space-y-3">
              <img src={compareResult} alt="Before & After" className="w-full rounded-xl border border-accent/20 shadow-lg" />
              <div className="flex gap-2">
                <a
                  href={compareResult}
                  download="glowpush-before-after.jpg"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> {lang === 'en' ? 'Download' : 'הורדה'}
                  </Button>
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const blob = await fetch(compareResult).then(r => r.blob());
                      const file = new File([blob], 'glowpush-compare.png', { type: 'image/png' });
                      if (navigator.share && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'GlowPush Before & After' });
                      } else {
                        await navigator.clipboard.writeText(compareResult);
                        toast({ title: lang === 'en' ? 'Image URL copied!' : 'הקישור הועתק!' });
                      }
                    } catch {
                      toast({ title: lang === 'en' ? 'Share failed' : 'שגיאה בשיתוף', variant: 'destructive' });
                    }
                  }}
                >
                  {lang === 'en' ? 'Share' : 'שיתוף'}
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
