import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';

interface TrialExpiredBannerProps {
  daysLeft: number;
}

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)';

export default function TrialExpiredBanner({ daysLeft }: TrialExpiredBannerProps) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';

  const dayWord = isHe
    ? daysLeft === 1 ? 'יום' : 'ימים'
    : daysLeft === 1 ? 'day' : 'days';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center gap-5"
        style={{
          background: '#fff',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(212,175,55,0.2)',
        }}
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'rgba(212,175,55,0.12)' }}
        >
          ⏰
        </div>

        {/* Title */}
        <div>
          <h2
            className="text-xl font-bold bg-clip-text text-transparent mb-2"
            style={{ backgroundImage: GOLD_GRADIENT }}
          >
            {isHe ? 'תקופת הניסיון הסתיימה' : 'Your Trial Has Ended'}
          </h2>
          <p className="text-sm" style={{ color: '#6b5b45' }}>
            {isHe
              ? `נותרו לך ${daysLeft} ${dayWord} לפני נעילת החשבון. בחרי תוכנית כדי לשמור על הגישה.`
              : `You have ${daysLeft} ${dayWord} before your account is locked. Choose a plan to keep your access.`}
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/pricing')}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-base transition-all hover:opacity-90 active:scale-95"
          style={{
            background: GOLD_GRADIENT,
            boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
          }}
        >
          {isHe ? '🌟 בחרי תוכנית עכשיו' : '🌟 Choose a Plan Now'}
        </button>

        {/* Skip */}
        <button
          onClick={() => {
            // Allow dismissal only once per session — not persistent across logins
            sessionStorage.setItem('gp-trial-banner-dismissed', '1');
            // Force re-render by dispatching storage event
            window.dispatchEvent(new Event('trial-banner-dismiss'));
          }}
          className="text-xs underline-offset-2 underline transition-colors"
          style={{ color: '#bba97a' }}
        >
          {isHe ? `המשיכי בינתיים (${daysLeft} ${dayWord} נותרו)` : `Continue for now (${daysLeft} ${dayWord} left)`}
        </button>
      </div>
    </div>
  );
}
