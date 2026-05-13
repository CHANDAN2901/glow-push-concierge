import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

const PLAN_TO_TIER: Record<string, string> = {
  pro: 'lite',
  starter: 'lite',
  professional: 'professional',
  elite: 'professional',
  master: 'master',
  'vip-3year': 'master',
};

type Status = 'processing' | 'success' | 'timeout';

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const planSlug = params.get('plan') || '';
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [status, setStatus] = useState<Status>('processing');

  const expectedTier = PLAN_TO_TIER[planSlug];

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~40s

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('user_id', user.id)
        .maybeSingle();

      const tier = data?.subscription_tier;
      const matched = expectedTier ? tier === expectedTier : tier && tier !== 'lite';

      if (matched) {
        if (cancelled) return;
        await qc.invalidateQueries({ queryKey: ['user-tier'] });
        await qc.invalidateQueries({ queryKey: ['tier-feature-keys'] });
        setStatus('success');
        return;
      }

      if (attempts >= maxAttempts) {
        if (!cancelled) setStatus('timeout');
        return;
      }
      setTimeout(poll, 2000);
    };

    poll();
    return () => { cancelled = true; };
  }, [user, expectedTier, qc]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#fcf9f8' }}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      <div
        className="max-w-md w-full bg-white rounded-3xl p-10 text-center"
        style={{
          boxShadow: '0 10px 40px -10px rgba(212,175,55,0.25)',
          border: '1px solid rgba(212,175,55,0.2)',
        }}
      >
        {status === 'processing' && (
          <>
            <Loader2 className="w-14 h-14 mx-auto animate-spin" style={{ color: '#D4AF37' }} />
            <h1
              className="mt-6 text-2xl font-serif font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: GOLD_GRADIENT }}
            >
              {isHe ? 'מעבד את התשלום...' : 'Processing your payment...'}
            </h1>
            <p className="mt-3 text-sm" style={{ color: '#666' }}>
              {isHe
                ? 'עוד רגע המנוי שלך יופעל אוטומטית'
                : 'Your subscription is being activated automatically'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: '#D4AF37' }} />
            <h1
              className="mt-6 text-2xl font-serif font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: GOLD_GRADIENT }}
            >
              {isHe ? 'התשלום התקבל!' : 'Payment confirmed!'}
            </h1>
            <p className="mt-3 text-sm" style={{ color: '#666' }}>
              {isHe ? 'המנוי שלך פעיל. תהנה!' : 'Your subscription is now active. Enjoy!'}
            </p>
            <button
              onClick={() => navigate('/artist?tab=home')}
              className="mt-8 px-8 py-3 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(145deg, #f3d078, #D4AF37)',
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
              }}
            >
              {isHe ? 'המשך לאפליקציה' : 'Continue to app'}
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <Loader2 className="w-14 h-14 mx-auto" style={{ color: '#D4AF37' }} />
            <h1
              className="mt-6 text-2xl font-serif font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: GOLD_GRADIENT }}
            >
              {isHe ? 'התשלום בעיבוד' : 'Payment is being processed'}
            </h1>
            <p className="mt-3 text-sm" style={{ color: '#666' }}>
              {isHe
                ? 'התשלום שלך התקבל. המנוי יופעל בקרוב. אם זה לא קורה תוך כמה דקות, פנה לתמיכה.'
                : 'Your payment was received. The subscription will be activated shortly. If this takes more than a few minutes, please contact support.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{
                background: 'linear-gradient(145deg, #f3d078, #D4AF37)',
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
              }}
            >
              {isHe ? 'רענן' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/artist?tab=home')}
              className="mt-3 ml-3 px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ color: '#8B6508', border: '1px solid rgba(212,175,55,0.4)' }}
            >
              {isHe ? 'חזור לאפליקציה' : 'Back to app'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
