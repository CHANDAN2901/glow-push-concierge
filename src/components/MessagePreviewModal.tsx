import { useState } from 'react';
import { X, Bell, MessageCircle, Wifi, Battery, Signal } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { STUDIO_NAME } from '@/lib/branding';
import { useI18n } from '@/lib/i18n';

type PreviewMode = 'push' | 'whatsapp';

interface MessagePreviewModalProps {
  open: boolean;
  onClose: () => void;
  messageText: string;
  onEditClick: () => void;
}

const GOLD = '#D4AF37';
const GOLD_DARK = '#B8860B';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)';
const GOLD_TEXT = '#5C4033';

function replaceplaceholders(text: string): string {
  return text
    .replace(/\{שם_לקוחה\}/g, 'שירה')
    .replace(/\{Client_Name\}/g, 'Shira')
    .replace(/\{קישור_לשאלון\}/g, 'glowpush.app/form/abc')
    .replace(/\{Form_Link\}/g, 'glowpush.app/form/abc')
    .replace(/\[ClientName\]/g, 'Shira')
    .replace(/\[CLIENT\]/g, 'Shira')
    .replace(/\[ArtistName\]/g, STUDIO_NAME)
    .replace(/\[ARTIST\]/g, STUDIO_NAME);
}

export default function MessagePreviewModal({ open, onClose, messageText, onEditClick }: MessagePreviewModalProps) {
  const [mode, setMode] = useState<PreviewMode>('push');
  const { lang } = useI18n();
  const isEn = lang === 'en';
  const preview = replaceplaceholders(messageText);
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[360px] p-0 bg-transparent border-none shadow-none [&>button]:hidden" onPointerDownOutside={onClose}>
        <div className="flex flex-col items-center gap-4 relative">
          {/* Close X button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-50 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
          >
            <X className="w-4 h-4" style={{ color: GOLD_DARK }} />
          </button>
          {/* Mode toggle */}
          <div className="flex gap-1 bg-card/90 backdrop-blur rounded-full p-1 border border-border shadow-lg">
            <button
              onClick={() => setMode('push')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                mode === 'push'
                  ? ''
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={mode === 'push' ? { background: GOLD_GRADIENT, color: GOLD_TEXT } : undefined}
            >
              <Bell className="w-3.5 h-3.5" />
              {isEn ? 'Push' : 'מראה פוש'}
            </button>
            <button
              onClick={() => setMode('whatsapp')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                mode === 'whatsapp'
                  ? 'bg-green-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {isEn ? 'WhatsApp' : 'מראה וואטסאפ'}
            </button>
          </div>

          {/* Phone frame */}
          <div className="w-[300px] rounded-[2.5rem] bg-black p-3 shadow-2xl">
            {/* Inner screen */}
            <div className="rounded-[2rem] overflow-hidden bg-[#f2f2f7] min-h-[480px] flex flex-col">
              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-black">
                <span>{timeStr}</span>
                <div className="w-24 h-6 bg-black rounded-full mx-auto" />
                <div className="flex items-center gap-1">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {mode === 'push' ? (
                <div className="flex-1 flex flex-col px-4 pt-8">
                  <div className="text-center mb-8">
                    <p className="text-5xl font-light text-black tracking-tight">{timeStr}</p>
                    <p className="text-xs text-black/50 mt-1">
                      {now.toLocaleDateString(isEn ? 'en-US' : 'he-IL', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-3.5 shadow-sm border border-white/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold"
                        style={{ background: GOLD_GRADIENT, color: GOLD_TEXT }}
                      >
                        GP
                      </div>
                      <span className="text-[11px] font-semibold text-black/80 uppercase tracking-wide">
                        {STUDIO_NAME}
                      </span>
                      <span className="text-[10px] text-black/40 mr-auto">{isEn ? 'now' : 'עכשיו'}</span>
                    </div>
                    <p className="text-[13px] text-black leading-relaxed whitespace-pre-line" dir={isEn ? 'ltr' : 'rtl'}>
                      {preview}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: GOLD_GRADIENT, color: GOLD_TEXT }}
                    >
                      GP
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{STUDIO_NAME} ✨</p>
                      <p className="text-[10px] opacity-70">Online</p>
                    </div>
                  </div>
                  <div
                    className="flex-1 px-3 py-4 flex flex-col justify-end"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23ddd\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'%23ece5dd\' width=\'200\' height=\'200\'/%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
                  >
                    <div className="max-w-[85%] mr-auto bg-white rounded-xl rounded-tr-sm px-3 py-2 shadow-sm">
                      <p className="text-[13px] text-black leading-relaxed whitespace-pre-line" dir={isEn ? 'ltr' : 'rtl'}>
                        {preview}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-black/40">{timeStr}</span>
                        <span className="text-[10px] text-blue-500">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full max-w-[300px]">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-card border border-border text-foreground transition-all hover:bg-muted"
            >
              {isEn ? 'Close' : 'סגור'}
            </button>
            <button
              onClick={() => { onClose(); onEditClick(); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                background: GOLD_GRADIENT,
                color: GOLD_TEXT,
                border: `1px solid ${GOLD}`,
              }}
            >
              {isEn ? 'Edit Text' : 'ערוך טקסט'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
