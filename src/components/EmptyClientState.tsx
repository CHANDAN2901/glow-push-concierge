import { useI18n } from '@/lib/i18n';
import { UserPlus, ArrowUp } from 'lucide-react';

export default function EmptyClientState() {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-up">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, hsl(38 55% 62% / 0.12), hsl(40 50% 72% / 0.2))',
          border: '2px dashed hsl(38 55% 62% / 0.4)',
        }}
      >
        <UserPlus className="w-8 h-8" style={{ color: 'hsl(38, 55%, 62%)' }} />
      </div>

      <h3 className="text-lg font-serif font-bold text-foreground mb-2 text-center">
        {isHe ? 'עדיין אין לקוחות?' : 'No clients yet?'}
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs mb-5">
        {isHe
          ? 'לחצי על הפלוס הזהב למעלה כדי להתחיל! 👆'
          : 'Tap the golden plus button above to get started! 👆'}
      </p>

      <div className="flex items-center gap-2 animate-bounce">
        <ArrowUp className="w-5 h-5" style={{ color: 'hsl(38, 55%, 62%)' }} />
        <span className="text-xs font-semibold" style={{ color: 'hsl(38, 55%, 62%)' }}>
          {isHe ? 'לחצי כאן ➕' : 'Tap here ➕'}
        </span>
      </div>
    </div>
  );
}
