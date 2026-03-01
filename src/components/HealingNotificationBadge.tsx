import { useState } from 'react';
import { MessageCircle, Zap, Eye } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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

  const truncated = previewText && previewText.length > 200
    ? previewText.slice(0, 200) + '…'
    : previewText;

  if (hasAutomation) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent-foreground">
        <Zap className="w-3 h-3" />
        {isHe ? 'נשלח אוטומטית' : 'Auto-sent'}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5 relative">
      <div className="flex items-center gap-1.5">
        {truncated && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowPreview(p => !p); }}
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

      {showPreview && truncated && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowPreview(false); }}
          className="w-[260px] p-3 rounded-xl border border-border bg-card text-xs whitespace-pre-line shadow-lg text-card-foreground"
          dir={isHe ? 'rtl' : 'ltr'}
        >
          {truncated}
        </div>
      )}
    </div>
  );
}
