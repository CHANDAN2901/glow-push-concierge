import { MessageCircle, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  if (!hasTemplate) return null;

  const truncated = previewText && previewText.length > 120
    ? previewText.slice(0, 120) + '…'
    : previewText;

  if (hasAutomation) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-accent/10 text-accent-foreground">
              <Zap className="w-3 h-3" />
              {isHe ? 'נשלח אוטומטית' : 'Auto-sent'}
            </div>
          </TooltipTrigger>
          {truncated && (
            <TooltipContent side="top" className="max-w-[260px] text-xs whitespace-pre-line text-right" dir={isHe ? 'rtl' : 'ltr'}>
              {truncated}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); onManualSend(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all active:scale-95 border border-accent/30 hover:bg-accent/10 text-accent-foreground"
          >
            <MessageCircle className="w-3 h-3" />
            {isHe ? 'שלחי בוואטסאפ' : 'Send via WhatsApp'}
          </button>
        </TooltipTrigger>
        {truncated && (
          <TooltipContent side="top" className="max-w-[260px] text-xs whitespace-pre-line text-right" dir={isHe ? 'rtl' : 'ltr'}>
            {truncated}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
