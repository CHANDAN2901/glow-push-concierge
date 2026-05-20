import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useGatewaySettings } from '@/hooks/useGatewaySettings';
import { useQuery } from '@tanstack/react-query';

const FEATURES = [
  { en: 'Client & calendar management', he: 'ניהול לקוחות ויומן' },
  { en: 'Healing timeline per client', he: 'ציר זמן ריפוי אישי לכל לקוחה' },
  { en: 'Digital health declaration', he: 'הצהרת בריאות דיגיטלית' },
  { en: 'AI Before & After collage', he: 'קולאז׳ לפני/אחרי עם AI' },
  { en: 'AI magic tools & captions', he: 'כלי AI לכיתובים ועריכה' },
  { en: 'Voice treatment notes', he: 'הערות קוליות לטיפול' },
  { en: 'Digital business card', he: 'כרטיס ביקור דיגיטלי' },
  { en: 'Portfolio gallery', he: 'גלריית פורטפוליו' },
  { en: 'Push notifications', he: 'התראות Push' },
  { en: 'WhatsApp automation', he: 'אוטומציית וואטסאפ' },
  { en: 'White label branding', he: 'מיתוג White Label' },
  { en: 'Referral system + bonus center', he: 'מערכת הפניות + מרכז בונוסים' },
];

export default function TrialPaymentGate() {
  const { lang } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHe = lang === 'he';

  const { resolvedGateway, isIsrael } = useGatewaySettings();
  const [selectedGateway, setSelectedGateway] = useState<'tranzilla' | 'lemonsqueezy'>('tranzilla');
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  const { data: trialAmountIl = 1 } = useQuery<number>({
    queryKey: ['app_settings', 'trial_amount_il'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'trial_amount_il').maybeSingle();
      return Number(data?.value ?? 1);
    },
    staleTime: 5 * 60 * 1000,
  });
  const { data: trialAmountGlobal = 2 } = useQuery<number>({
    queryKey: ['app_settings', 'trial_amount_global'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'trial_amount_global').maybeSingle();
      return Number(data?.value ?? 2);
    },
    staleTime: 5 * 60 * 1000,
  });
  const trialAmount = isIsrael ? trialAmountIl : trialAmountGlobal;

  const handleTranzilla = async () => {
    setShowGatewayModal(false);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: { planSlug: 'glow-trial', amountIls: trialAmount, lang: isIsrael ? 'il' : 'en', autoPayEnabled: false, isIsrael },
      });
      if (error || !data?.iframeUrl) {
        toast({ title: isHe ? 'שגיאה בפתיחת דף תשלום' : 'Failed to open payment page', variant: 'destructive' });
        return;
      }
      setPaymentIframeUrl(data.iframeUrl);
    } catch {
      toast({ title: isHe ? 'שגיאה בלתי צפויה' : 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLemonSqueezy = async () => {
    setShowGatewayModal(false);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lemonsqueezy-checkout', {
        body: { planSlug: 'glow-trial', autoPayEnabled: false },
      });
      if (error || !data?.checkoutUrl) {
        toast({ title: isHe ? 'שגיאה בפתיחת דף תשלום' : 'Failed to open payment page', variant: 'destructive' });
        return;
      }
      if (typeof (window as any).LemonSqueezy !== 'undefined') {
        (window as any).LemonSqueezy.Url.Open(data.checkoutUrl);
      } else {
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast({ title: isHe ? 'שגיאה בלתי צפויה' : 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedGateway === 'tranzilla') handleTranzilla();
    else handleLemonSqueezy();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(160deg, #fdf8f0 0%, #fff9f0 50%, #fdf0e8 100%)' }}
    >
      {/* Tranzilla iframe modal */}
      {paymentIframeUrl && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div
            className="flex items-center justify-between px-5 py-4 shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)' }}
          >
            <span className="text-white font-bold text-base">
              {isHe ? '🔒 תשלום מאובטח' : '🔒 Secure Payment'}
            </span>
            <button
              onClick={() => setPaymentIframeUrl(null)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white text-xl font-bold"
            >✕</button>
          </div>
          <iframe
            src={paymentIframeUrl}
            title={isHe ? 'תשלום מאובטח' : 'Secure Payment'}
            className="w-full flex-1"
            style={{ border: 'none', background: '#fff' }}
            allow="payment"
            onLoad={(e) => {
              try {
                const href = (e.target as HTMLIFrameElement).contentWindow?.location?.href || '';
                if (href.includes('/payment-success')) {
                  setPaymentIframeUrl(null);
                  navigate(href.replace(window.location.origin, ''));
                }
              } catch {
                // cross-origin frame — ignore
              }
            }}
          />
          <div className="shrink-0 bg-white text-center text-[11px] text-gray-400 py-2 px-4">
            {isHe ? 'תשלום מאובטח על ידי Tranzila.' : 'Secure payment powered by Tranzila.'}
          </div>
        </div>
      )}

      {/* Gateway selector modal */}
      {showGatewayModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 24px 80px -12px rgba(0,0,0,0.4)', border: '2px solid rgba(212,175,55,0.4)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)' }}
            >
              <span className="text-white font-bold text-base">
                {isHe ? '💳 בחרי אמצעי תשלום' : '💳 Choose Payment Method'}
              </span>
              <button
                onClick={() => setShowGatewayModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-all text-white text-lg font-bold"
              >✕</button>
            </div>

            <div className="p-5 space-y-3" dir={isHe ? 'rtl' : 'ltr'}>
              {/* Tranzilla */}
              <label
                className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all"
                style={{
                  border: selectedGateway === 'tranzilla' ? '2px solid #D4AF37' : '1.5px solid rgba(0,0,0,0.1)',
                  background: selectedGateway === 'tranzilla' ? 'rgba(212,175,55,0.08)' : 'rgba(0,0,0,0.02)',
                }}
                onClick={() => setSelectedGateway('tranzilla')}
              >
                <input type="radio" name="gw" value="tranzilla" checked={selectedGateway === 'tranzilla'} onChange={() => setSelectedGateway('tranzilla')} className="accent-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#5a3e1b' }}>Tranzilla</p>
                  <p className="text-xs text-gray-500">{isHe ? 'כרטיס אשראי ישראלי' : 'Israeli credit card'}</p>
                </div>
                <span className="text-xl">🏦</span>
              </label>

              {/* LemonSqueezy */}
              <label
                className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-all"
                style={{
                  border: selectedGateway === 'lemonsqueezy' ? '2px solid #D4AF37' : '1.5px solid rgba(0,0,0,0.1)',
                  background: selectedGateway === 'lemonsqueezy' ? 'rgba(212,175,55,0.08)' : 'rgba(0,0,0,0.02)',
                }}
                onClick={() => setSelectedGateway('lemonsqueezy')}
              >
                <input type="radio" name="gw" value="lemonsqueezy" checked={selectedGateway === 'lemonsqueezy'} onChange={() => setSelectedGateway('lemonsqueezy')} className="accent-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#5a3e1b' }}>Lemon Squeezy</p>
                  <p className="text-xs text-gray-500">{isHe ? 'כרטיס בינלאומי / PayPal' : 'International card / PayPal'}</p>
                </div>
                <span className="text-xl">🍋</span>
              </label>

              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #8B6508, #D4AF37)', color: '#fff', marginTop: '4px' }}
              >
                {isLoading
                  ? (isHe ? 'טוען...' : 'Loading...')
                  : (isHe ? 'המשך לתשלום ←' : 'Continue to Payment →')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout link — top corner */}
      {user && (
        <button
          onClick={handleLogout}
          className="absolute top-4 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          style={{ [isHe ? 'left' : 'right']: '16px' }}
        >
          {isHe ? 'התנתקי' : 'Log out'}
        </button>
      )}

      {/* Main content */}
      <div className="w-full max-w-md mx-auto px-5 pt-14 pb-10 flex flex-col items-center gap-6">
        {/* Logo / badge */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
        >
          ✨
        </div>

        {/* Headline */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold" style={{ color: '#5a3e1b' }}>
            {isHe ? 'נסי את Glow Push — 30 יום' : 'Try Glow Push — 30 Days'}
          </h1>
          <p className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isHe ? `רק ₪${trialAmount}` : `Only ₪${trialAmount}`}
          </p>
          <p className="text-sm text-gray-500">
            {isHe ? 'גישה מלאה לכל הפיצ׳רים. ללא חיוב אוטומטי.' : 'Full access to every feature. No auto-charge.'}
          </p>
        </div>

        {/* Feature list */}
        <div
          className="w-full rounded-2xl p-4 space-y-2"
          style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: '#5a3e1b' }}>
              <span className="text-base shrink-0" style={{ color: '#D4AF37' }}>✓</span>
              <span>{isHe ? f.he : f.en}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            if (resolvedGateway === 'both') setShowGatewayModal(true);
            else if (resolvedGateway === 'tranzilla') handleTranzilla();
            else handleLemonSqueezy();
          }}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl font-extrabold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)', color: '#fff', fontSize: '1rem' }}
        >
          {isHe ? '🚀 התחילי ניסיון עכשיו' : '🚀 Start My Trial Now'}
        </button>

        <p className="text-[11px] text-gray-400 text-center">
          {isHe
            ? 'לאחר הניסיון תוכלי לבחור תוכנית. אין חיוב אוטומטי.'
            : 'After the trial you choose a plan. No automatic charge.'}
        </p>
      </div>
    </div>
  );
}
