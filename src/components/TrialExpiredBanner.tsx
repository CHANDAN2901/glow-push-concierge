import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

interface TrialExpiredBannerProps {
  daysLeft: number;
}

export default function TrialExpiredBanner({ daysLeft }: TrialExpiredBannerProps) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem('gp-trial-banner-dismissed'));

  if (dismissed) return null;

  const dayWord = isHe
    ? daysLeft === 1 ? 'יום' : 'ימים'
    : daysLeft === 1 ? 'day' : 'days';

  return (
    <div
      className="sticky top-0 z-50 w-full flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
      }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-2 text-white text-sm font-medium min-w-0">
        <span className="text-lg shrink-0">⏰</span>
        <span className="truncate">
          {isHe
            ? `הניסיון שלך הסתיים. נותרו ${daysLeft} ${dayWord} לפני נעילת החשבון.`
            : `Your trial has ended. ${daysLeft} ${dayWord} left before your account is locked.`}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/pricing')}
          className="rounded-full px-3 py-1 text-xs font-bold transition-all active:scale-95"
          style={{ background: '#fff', color: '#8B6508' }}
        >
          {isHe ? 'בחרי תוכנית' : 'Choose a Plan'}
        </button>
        <button
          onClick={() => { sessionStorage.setItem('gp-trial-banner-dismissed', '1'); setDismissed(true); }}
          className="text-white/70 hover:text-white text-lg leading-none transition-colors"
          aria-label="Dismiss"
        >✕</button>
      </div>
    </div>
  );
}
