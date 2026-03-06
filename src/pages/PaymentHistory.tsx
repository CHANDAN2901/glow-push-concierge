import { ExternalLink } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useI18n } from '@/lib/i18n';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

const receipts = [
  { date: '01/03/2026', plan: 'Glow Pro', amount: '₪199', invoiceUrl: '#' },
  { date: '01/02/2026', plan: 'Glow Pro', amount: '₪199', invoiceUrl: '#' },
  { date: '01/01/2026', plan: 'Glow Basic', amount: '₪99', invoiceUrl: '#' },
];

const PaymentHistory = () => {
  const { t, lang } = useI18n();
  const isHe = lang === 'he';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] to-[#FFFFFF] pb-20" dir={isHe ? 'rtl' : 'ltr'}>
      <header
        className="sticky top-0 w-full z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '3px solid',
          borderImage: `linear-gradient(to ${isHe ? 'left' : 'right'}, #D4AF37 40%, rgba(212, 175, 55, 0.1) 90%) 1`,
        }}
      >
        <div className="text-sm" style={{ color: '#333' }}>{t('payment.header')}</div>
        <BackButton />
      </header>

      <div className="pt-8 pb-6 text-center px-4">
        <h1
          className="text-2xl md:text-3xl font-serif font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: GOLD_GRADIENT }}
        >
          {t('payment.title')}
        </h1>
        <div
          className="w-20 h-[2px] mx-auto mt-4 rounded-full"
          style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)' }}
        />
      </div>

      <div className="mx-auto px-4 max-w-lg flex flex-col gap-4">
        {receipts.map((r, idx) => (
          <div key={idx}>
            <div
              className="rounded-2xl p-5 bg-white flex items-center justify-between"
              style={{ boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
            >
              <div className="space-y-1.5">
                <p className="text-sm font-bold" style={{ color: '#000' }}>{r.date}</p>
                <p className="text-sm font-medium" style={{ color: '#000' }}>{r.plan}</p>
                <span
                  className="inline-block text-xs font-bold px-3 py-0.5 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.1)', color: '#8B6508' }}
                >
                  {t('payment.paid')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className="text-xl font-serif font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: GOLD_GRADIENT }}
                >
                  {r.amount}
                </span>
                <a
                  href={r.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95"
                  style={{
                    background: 'linear-gradient(145deg, #f3d078, #D4AF37)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
                    border: 'none',
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('payment.viewInvoice')}
                </a>
              </div>
            </div>

            {idx < receipts.length - 1 && (
              <div className="py-3">
                <div
                  style={{
                    height: '3px',
                    width: '60%',
                    [isHe ? 'marginRight' : 'marginLeft']: 0,
                    [isHe ? 'marginLeft' : 'marginRight']: 'auto',
                    borderRadius: '4px',
                    background: GOLD_GRADIENT,
                    boxShadow: '0 0 6px rgba(212,175,55,0.25)',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentHistory;
