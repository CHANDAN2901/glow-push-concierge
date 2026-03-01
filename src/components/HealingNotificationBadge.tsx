import { Bell, MessageCircle, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  clientName: string;
  day: number;
  hasAutomation: boolean;
  hasTemplate?: boolean;
  onManualSend: () => void;
}

export default function HealingNotificationBadge({ clientName, day, hasAutomation, hasTemplate, onManualSend }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  // Only show if there's a matching template for this day
  if (!hasTemplate) return null;

  if (hasAutomation) {
    // Premium: show auto-sent indicator
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
        style={{ backgroundColor: 'rgba(212, 175, 55, 0.12)', color: '#B8860B' }}
      >
        <Zap className="w-3 h-3" />
        {isHe ? 'נשלח אוטומטית' : 'Auto-sent'}
      </div>
    );
  }

  // Standard: show manual WhatsApp trigger
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onManualSend(); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all active:scale-95 border border-accent/30 hover:bg-accent/10"
      style={{ color: '#B8860B' }}
    >
      <MessageCircle className="w-3 h-3" />
      {isHe ? 'שלחי בוואטסאפ' : 'Send via WhatsApp'}
    </button>
  );
}
