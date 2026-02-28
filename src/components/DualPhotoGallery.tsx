import { useState, useRef, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Download, Camera, Pencil, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ImageEditorDialog from './ImageEditorDialog';
import { addToClientGallery } from './ClientGallery';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

interface DualPhotoGalleryProps {
  clientId?: string;
}

export function DualPhotoGallery({ clientId }: DualPhotoGalleryProps) {
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const collageRef = useRef<HTMLDivElement>(null);
  const [savingCollage, setSavingCollage] = useState(false);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<'before' | 'after'>('before');
  const [editingSrc, setEditingSrc] = useState('');

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
      addToClientGallery(clientId, dataUrl, 'collage');
      window.dispatchEvent(new Event('client-gallery-updated'));
      toast({ title: 'הקולאז׳ נשמר בגלריה ✨' });
    } catch (err) {
      console.error('Save collage error:', err);
      toast({ title: 'שגיאה בשמירה', variant: 'destructive' });
    } finally {
      setSavingCollage(false);
    }
  }, [clientId]);

  const savePhotoToGallery = useCallback(async (which: 'before' | 'after') => {
    if (!clientId) return;
    const src = which === 'before' ? before : after;
    if (!src) return;
    const b64 = await toBase64(src);
    if (b64) {
      addToClientGallery(clientId, b64, 'photo');
      window.dispatchEvent(new Event('client-gallery-updated'));
      toast({ title: 'התמונה נשמרה בגלריה 📸' });
    }
  }, [before, after, clientId]);

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
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md z-20"
                  style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
                >
                  <Save className="w-3 h-3" style={{ color: GOLD_DARK }} />
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
                  className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md z-20"
                  style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
                >
                  <Save className="w-3 h-3" style={{ color: GOLD_DARK }} />
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

      {/* Collage preview + save to gallery */}
      {bothUploaded && (
        <div className="space-y-3">
          <div
            ref={collageRef}
            className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden shadow-md border-2"
            style={{ borderColor: GOLD }}
          >
            <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
              <img src={before} alt="Before" className="w-full h-full object-cover object-center" />
              <span className="absolute bottom-3 left-3 text-white text-sm font-bold tracking-wide"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>לפני</span>
            </div>
            <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              <img src={after} alt="After" className="w-full h-full object-cover object-center" />
              <span className="absolute bottom-3 right-3 text-white text-sm font-bold tracking-wide"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>אחרי ✨</span>
            </div>
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 z-10" style={{ backgroundColor: GOLD }} />
          </div>

          {/* Save collage to gallery - shiny gold button */}
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
                <Save className="w-4 h-4" />
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
