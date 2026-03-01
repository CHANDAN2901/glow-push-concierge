import { useState } from 'react';
import { MessageCircle, Zap, Eye, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  clientName: string;
  day: number;
  hasAutomation: boolean;
  hasTemplate?: boolean;
  previewText?: string | null;
  onManualSend: () => void;
}

export default function HealingNotificationBadge({ clientName, day, hasAutomation, hasTemplate, previewText, onManualSend }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [showPreview, setShowPreview] = useState(false);

  if (!hasTemplate) return null;

  if (hasAutomation) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent-foreground">
        <Zap className="w-3 h-3" />
        {isHe ? 'נשלח אוטומטית' : 'Auto-sent'}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {previewText && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
            className="flex items-center justify-center w-7 h-7 rounded-full border border-border hover:bg-muted transition-colors"
            aria-label={isHe ? 'תצוגה מקדימה' : 'Preview'}
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onManualSend(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 border-2 border-accent bg-accent/5 hover:bg-accent/15 text-foreground"
        >
          <MessageCircle className="w-3 h-3" />
          {isHe ? 'שלחי בוואטסאפ' : 'Send via WhatsApp'}
        </button>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent
          className="max-w-sm rounded-2xl border-2 border-accent/40 bg-card p-0 shadow-xl"
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-accent" />
              {isHe ? 'תצוגה מקדימה של ההודעה' : 'Message Preview'}
            </DialogTitle>
          </div>

          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
              {previewText}
            </p>
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={() => setShowPreview(false)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              {isHe ? 'סגירה' : 'Close'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
