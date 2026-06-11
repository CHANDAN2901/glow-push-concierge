import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

// Polling cadence: fast for the first minute, then slower. Never stops —
// after SLOW_AFTER_ATTEMPTS we show the "still processing" state but keep
// checking so the page self-recovers when the webhook lands late.
const FAST_INTERVAL_MS = 2000;
const SLOW_INTERVAL_MS = 5000;
const FAST_ATTEMPTS = 30;          // ~1 min at 2s
const TIMEOUT_AFTER_ATTEMPTS = 78; // ~5 min total (30×2s + 48×5s)

// A charge is considered "this payment" if the webhook stamped it recently.
const RECENT_CHARGE_WINDOW_MS = 60 * 60 * 1000;

type Status = 'processing' | 'success' | 'timeout';

const PaymentSuccess = () => {
  const [params] = useSearchParams();
  const isAutopay = params.get('autopay') !== 'false';
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [status, setStatus] = useState<Status>('processing');

  // When Tranzila redirects the payment iframe here, this page boots inside
  // the iframe. PaymentIframeBreakout notifies the parent window, which
  // closes the modal and navigates — so here we only show a placeholder.
  const inIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!user || inIframe) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, last_charge_at')
        .eq('user_id', user.id)
        .maybeSingle();

      // Webhook always sets subscription_status (active/trial) + last_charge_at,
      // for every plan — no slug→tier mapping needed.
      const statusOk = data?.subscription_status === 'active' || data?.subscription_status === 'trial';
      const chargedRecently = data?.last_charge_at
        ? Date.now() - new Date(data.last_charge_at).getTime() < RECENT_CHARGE_WINDOW_MS
        : false;

      if (statusOk && chargedRecently) {
        if (cancelled) return;
        await qc.invalidateQueries({ queryKey: ['user-tier'] });
        await qc.invalidateQueries({ queryKey: ['tier-feature-keys'] });
        setStatus('success');
        return;
      }

      if (attempts >= TIMEOUT_AFTER_ATTEMPTS && !cancelled) {
        setStatus('timeout');
      }
      setTimeout(poll, attempts < FAST_ATTEMPTS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS);
    };

    poll();
    return () => { cancelled = true; };
  }, [user, inIframe, qc]);

  // Auto-return to the dashboard shortly after confirmation.
  useEffect(() => {
    if (status !== 'success') return;
    const id = setTimeout(() => navigate('/artist?tab=home'), 2500);
    return () => clearTimeout(id);
  }, [status, navigate]);

  if (inIframe) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fcf9f8' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#D4AF37' }} />
      </div>
    );
  }

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
              {isHe ? 'המנוי שלך פעיל. מעבירים אותך לאפליקציה...' : 'Your subscription is now active. Taking you to the app...'}
            </p>
            <p className="mt-2 text-xs" style={{ color: '#999' }}>
              {isAutopay
                ? (isHe ? '🔄 חיוב אוטומטי פעיל — יחודש כל חודש. ביטול בכל עת מהגדרות.' : '🔄 Autopay active — renews monthly. Cancel anytime from Settings.')
                : (isHe ? '💳 תשלום חד-פעמי. יש לחדש ידנית לפני תאריך הפקיעה.' : '💳 One-time payment. Renew manually before your access expires.')}
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
            <Clock className="w-14 h-14 mx-auto" style={{ color: '#D4AF37' }} />
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
