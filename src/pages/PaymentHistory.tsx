import { useEffect, useState } from 'react';
import { ExternalLink, Receipt } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GOLD_GRADIENT = 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)';

const PLAN_DISPLAY: Record<string, { en: string; he: string }> = {
  'glow-trial': { en: 'Glow Push Trial', he: 'ניסיון Glow Push' },
  'pro':        { en: 'Glow Push Pro',   he: 'Glow Push Pro'   },
  'elite':      { en: 'Glow Push Elite', he: 'Glow Push Elite' },
  'vip-3year':  { en: 'Glow Push VIP',   he: 'Glow Push VIP'   },
};

interface PaymentRecord {
  date: string;
  planSlug: string;
  amountIls: number | null;
  confirmation: string | null;
  lsOrderId: string | null;
  invoiceUrl: string | null;
}

const PaymentHistory = () => {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const isHe = lang === 'he';

  const [record, setRecord] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const generateInvoice = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await supabase.functions.invoke('backfill-morning-invoice');
      if (res.data?.url) {
        setRecord((r) => (r ? { ...r, invoiceUrl: res.data.url } : r));
      }
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('profiles')
      .select('last_charge_at, tranzilla_plan_slug, tranzilla_amount_agorot, last_charge_confirmation, ls_order_id, morning_invoice_url')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.last_charge_at) {
          setRecord({
            date: data.last_charge_at,
            planSlug: data.tranzilla_plan_slug ?? 'pro',
            amountIls: data.tranzilla_amount_agorot != null ? data.tranzilla_amount_agorot / 100 : null,
            confirmation: data.last_charge_confirmation ?? null,
            lsOrderId: data.ls_order_id ?? null,
            invoiceUrl: data.morning_invoice_url ?? null,
          });
        }
        setLoading(false);
      });
  }, [user]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(isHe ? 'he-IL' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const planName = (slug: string) =>
    (PLAN_DISPLAY[slug] ?? { en: slug, he: slug })[isHe ? 'he' : 'en'];

  return (
    <div className="min-h-screen pb-20 pt-14" style={{ background: '#fcf9f8' }} dir={isHe ? 'rtl' : 'ltr'}>

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
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: '#999' }}>
            {isHe ? 'טוען...' : 'Loading...'}
          </div>
        ) : !record ? (
          <div className="text-center py-16 flex flex-col items-center gap-3">
            <Receipt className="w-10 h-10" style={{ color: '#D4AF37', opacity: 0.5 }} />
            <p className="text-sm font-medium" style={{ color: '#999' }}>
              {isHe ? 'אין היסטוריית תשלומים עדיין' : 'No payment history yet'}
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl p-5 bg-white flex items-center justify-between"
            style={{ boxShadow: '0 2px 12px -4px rgba(0,0,0,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
          >
            <div className="space-y-1.5">
              <p className="text-sm font-bold" style={{ color: '#000' }}>{formatDate(record.date)}</p>
              <p className="text-sm font-medium" style={{ color: '#000' }}>{planName(record.planSlug)}</p>
              {record.confirmation && (
                <p className="text-xs" style={{ color: '#999' }}>
                  {isHe ? 'אישור:' : 'Ref:'} {record.confirmation}
                </p>
              )}
              <span
                className="inline-block text-xs font-bold px-3 py-0.5 rounded-full"
                style={{ background: 'rgba(212,175,55,0.1)', color: '#8B6508' }}
              >
                {t('payment.paid')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {record.amountIls != null && (
                <span
                  className="text-xl font-serif font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: GOLD_GRADIENT }}
                >
                  ₪{record.amountIls}
                </span>
              )}
              {(record.invoiceUrl || record.lsOrderId) ? (
                <a
                  href={record.invoiceUrl || `https://app.lemonsqueezy.com/my-orders/${record.lsOrderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95"
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
              ) : (
                <button
                  onClick={generateInvoice}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(145deg, #f3d078, #D4AF37)',
                    color: '#fff',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
                    border: 'none',
                  }}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  {generating ? (isHe ? 'מפיק...' : 'Generating...') : (isHe ? 'הפק חשבונית' : 'Generate Invoice')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;
