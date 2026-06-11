import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';

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
        <XCircle className="w-16 h-16 mx-auto" style={{ color: '#C0392B' }} />
        <h1
          className="mt-6 text-2xl font-serif font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: GOLD_GRADIENT }}
        >
          {isHe ? 'התשלום לא הושלם' : "Payment didn't go through"}
        </h1>
        <p className="mt-3 text-sm" style={{ color: '#666' }}>
          {isHe
            ? 'לא בוצע חיוב. אפשר לנסות שוב או לבחור אמצעי תשלום אחר.'
            : 'You were not charged. You can try again or choose a different payment method.'}
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="mt-8 px-8 py-3 rounded-full text-sm font-bold text-white transition-transform hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(145deg, #f3d078, #D4AF37)',
            boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
          }}
        >
          {isHe ? 'נסה שוב' : 'Try again'}
        </button>
        <button
          onClick={() => navigate('/artist?tab=home')}
          className="mt-3 ml-3 px-6 py-2.5 rounded-full text-sm font-bold"
          style={{ color: '#8B6508', border: '1px solid rgba(212,175,55,0.4)' }}
        >
          {isHe ? 'חזור לאפליקציה' : 'Back to app'}
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;
