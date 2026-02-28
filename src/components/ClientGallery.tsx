import { useState, useEffect, useCallback } from 'react';
import { X, Calendar as CalendarIcon, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';

export interface GalleryItem {
  id: string;
  imageBase64: string;
  date: string;
  type: 'photo' | 'collage';
}

const getKey = (clientId: string) => `gallery_${clientId}`;

export const loadClientGallery = (clientId: string): GalleryItem[] => {
  try {
    const saved = localStorage.getItem(getKey(clientId));
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

export const addToClientGallery = (clientId: string, imageBase64: string, type: 'photo' | 'collage' = 'photo'): void => {
  const items = loadClientGallery(clientId);
  const newItem: GalleryItem = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    imageBase64,
    date: new Date().toISOString(),
    type,
  };
  const updated = [newItem, ...items];
  try {
    localStorage.setItem(getKey(clientId), JSON.stringify(updated));
  } catch (e) {
    console.error('Gallery save error:', e);
  }
};

interface ClientGalleryProps {
  clientId: string;
}

const ClientGallery = ({ clientId }: ClientGalleryProps) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  const reload = useCallback(() => {
    setItems(loadClientGallery(clientId));
  }, [clientId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const handler = () => reload();
    window.addEventListener('client-gallery-updated', handler);
    return () => window.removeEventListener('client-gallery-updated', handler);
  }, [reload]);

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem(getKey(clientId), JSON.stringify(updated));
    if (selected?.id === id) setSelected(null);
  };

  const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: GOLD_DARK }} />
        <p className="text-xs font-serif" style={{ color: GOLD_DARK }}>
          עדיין אין תמונות בגלריה 📸
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2" dir="rtl">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="relative rounded-xl overflow-hidden shadow-sm border cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            style={{ borderColor: `${GOLD}40`, background: '#ffffff' }}
            onClick={() => setSelected(item)}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={item.imageBase64}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            {/* Type badge */}
            {item.type === 'collage' && (
              <span
                className="absolute top-1 right-1 text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10"
                style={{ background: GOLD_GRADIENT, color: '#5C4033' }}
              >
                קולאז׳
              </span>
            )}
            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
              className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center bg-white/80 hover:bg-white shadow-sm z-10"
            >
              <X className="w-2.5 h-2.5" style={{ color: GOLD_DARK }} />
            </button>
            {/* Date */}
            <div className="px-1.5 py-1 flex items-center gap-1">
              <CalendarIcon className="w-2.5 h-2.5 shrink-0" style={{ color: GOLD_DARK }} />
              <span className="text-[9px] font-serif font-semibold" style={{ color: '#333' }}>
                {format(new Date(item.date), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen preview */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border-2"
            style={{ borderColor: GOLD }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selected.imageBase64} alt="" className="w-full" />
            <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-white/90 backdrop-blur-sm flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" style={{ color: GOLD_DARK }} />
                <span className="text-sm font-serif font-semibold" style={{ color: '#333' }}>
                  {format(new Date(selected.date), 'dd/MM/yyyy')}
                </span>
                {selected.type === 'collage' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-2"
                    style={{ background: GOLD_GRADIENT, color: '#5C4033' }}>קולאז׳</span>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: '#ffffff', border: `2px solid ${GOLD}` }}
              >
                <X className="w-4 h-4" style={{ color: GOLD_DARK }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientGallery;
