import { FileDown } from 'lucide-react';
import BackButton from '@/components/BackButton';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

const receipts = [
  { date: '01/03/2026', plan: 'Glow Pro', amount: '₪199', status: 'שולם' },
  { date: '01/02/2026', plan: 'Glow Pro', amount: '₪199', status: 'שולם' },
  { date: '01/01/2026', plan: 'Glow Basic', amount: '₪99', status: 'שולם' },
];

const PaymentHistory = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] to-[#FFFFFF] pb-20" dir="rtl">
    <div className="px-4 pt-6">
      <BackButton />
    </div>

    <div className="pt-8 pb-6 text-center px-4">
      <h1
        className="text-2xl md:text-3xl font-serif font-bold bg-clip-text text-transparent"
        style={{ backgroundImage: GOLD_GRADIENT }}
      >
        היסטוריית תשלומים וקבלות
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
                {r.status}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span
                className="text-xl font-serif font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: GOLD_GRADIENT }}
              >
                {r.amount}
              </span>
              <button className="p-2 rounded-xl transition-all hover:scale-105 active:scale-95" title="הורדת קבלה">
                <FileDown className="w-5 h-5" style={{ color: '#D4AF37' }} />
              </button>
            </div>
          </div>

          {idx < receipts.length - 1 && (
            <div className="py-3">
              <div
                style={{
                  height: '3px',
                  width: '60%',
                  marginRight: 0,
                  marginLeft: 'auto',
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

export default PaymentHistory;
