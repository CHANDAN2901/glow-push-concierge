import { useState } from 'react';
import { Crown, Sparkles, ArrowRight, MessageCircle, Zap, Receipt, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { usePricingPlans, type PricingPlan } from '@/hooks/usePricingPlans';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onBack: () => void;
  currentTier?: string;
  artistName?: string;
}

const iconMap: Record<string, React.ElementType> = {
  pro: Sparkles,
  elite: Crown,
  'vip-3year': Crown,
};

const tierLabelMap: Record<string, { he: string; en: string }> = {
  lite: { he: 'Pro – בסיסי', en: 'Pro – Basic' },
  professional: { he: 'Elite – מקצועי', en: 'Elite – Professional' },
  master: { he: 'VIP – מייסדות', en: 'VIP – Founders' },
};

export default function PlansUpgradeScreen({ onBack, currentTier, artistName }: Props) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const { data: plans = [], isLoading } = usePricingPlans();
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<'tranzilla' | 'lemonsqueezy'>('tranzilla');

  const displayName = artistName?.split(' ')[0] || (isHe ? 'יוצרת' : 'Creator');
  const tierLabel = tierLabelMap[currentTier || 'lite']?.[isHe ? 'he' : 'en'] || (isHe ? 'חינמי' : 'Free');

  const handleUpgrade = (plan: PricingPlan) => {
    if (plan.price_monthly === 0) {
      toast({ title: isHe ? 'תוכנית זו כלולה במנוי שלך' : 'This plan is already included' });
      return;
    }
    setPendingPlan(plan);
  };

  const handleTranzillaPayment = async (plan: PricingPlan) => {
    setPendingPlan(null);
    setIsLoadingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: { planSlug: plan.slug, amountIls: plan.price_monthly },
      });
      if (error || !data?.iframeUrl) {
        toast({ title: isHe ? 'שגיאה בפתיחת דף תשלום' : 'Failed to open payment page', variant: 'destructive' });
        return;
      }
      setPaymentIframeUrl(data.iframeUrl);
    } catch (err: any) {
      toast({ title: isHe ? 'שגיאה בלתי צפויה' : 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleLemonSqueezyPayment = async (plan: PricingPlan) => {
    setPendingPlan(null);
    setIsLoadingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-lemonsqueezy-checkout', {
        body: { planSlug: plan.slug },
      });
      if (error || !data?.checkoutUrl) {
        toast({ title: isHe ? 'שגיאה בפתיחת דף תשלום' : 'Failed to open payment page', variant: 'destructive' });
        return;
      }
      window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast({ title: isHe ? 'שגיאה בלתי צפויה' : 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleConfirmGateway = () => {
    if (!pendingPlan) return;
    if (selectedGateway === 'tranzilla') {
      handleTranzillaPayment(pendingPlan);
    } else {
      handleLemonSqueezyPayment(pendingPlan);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">טוען...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up pb-10" dir={isHe ? 'rtl' : 'ltr'}>

      {/* Payment Method Selector Modal */}
      {pendingPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
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
                onClick={() => setPendingPlan(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-3" dir={isHe ? 'rtl' : 'ltr'}>
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
                onClick={handleConfirmGateway}
                disabled={isLoadingPayment}
                className="w-full py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #8B6508, #D4AF37)', color: '#fff' }}
              >
                {isLoadingPayment
                  ? (isHe ? 'טוען...' : 'Loading...')
                  : (isHe ? 'המשך לתשלום ←' : 'Continue to Payment →')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tranzilla Payment Modal */}
      {paymentIframeUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: '#fff',
              boxShadow: '0 24px 80px -12px rgba(0,0,0,0.4)',
              border: '2px solid #D4AF37',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 50%, #8B6508 100%)' }}
            >
              <span className="text-white font-bold text-base">
                {isHe ? '🔒 תשלום מאובטח' : '🔒 Secure Payment'}
              </span>
              <button
                onClick={() => setPaymentIframeUrl(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/20"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Tranzilla iframe */}
            <iframe
              src={paymentIframeUrl}
              title={isHe ? 'תשלום מאובטח' : 'Secure Payment'}
              className="w-full"
              style={{ height: '480px', border: 'none' }}
              allow="payment"
            />

            <p className="text-center text-[10px] text-muted-foreground py-3 px-4">
              {isHe
                ? 'תשלום מאובטח על ידי Tranzila. פרטי הכרטיס אינם נשמרים אצלנו.'
                : 'Secure payment powered by Tranzila. Card details are not stored by us.'}
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-accent/10 transition-all shrink-0"
        >
          <ArrowRight className={`w-5 h-5 text-foreground ${isHe ? '' : 'rotate-180'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">
            {isHe ? 'המסלול שלך להצלחה' : 'Your Path to Success'}
          </h1>
          <p className="text-xs text-foreground/60 mt-0.5">
            {isHe ? 'בחרי את החבילה המתאימה לך' : 'Choose the right plan for you'}
          </p>
        </div>
      </div>

      {/* Personal Status Card */}
      <div
        className="rounded-2xl p-6 space-y-4 text-center"
        style={{
          border: '2px solid #D4AF37',
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(40 45% 96%) 100%)',
          boxShadow: '0 4px 24px -4px rgba(212, 175, 55, 0.15)',
        }}
      >
        <h2
          className="text-xl font-bold bg-clip-text text-transparent leading-relaxed"
          style={{ backgroundImage: 'linear-gradient(135deg, #5C400A 0%, #7A5C10 35%, #6B4F0E 50%, #8B6914 75%, #4A3308 100%)' }}
        >
          {isHe ? `היי ${displayName}, איזה כיף שאת איתנו! ✨` : `Hey ${displayName}, glad to have you! ✨`}
        </h2>

        <div className="space-y-1.5">
          <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            {isHe ? `חבילה נוכחית: ${tierLabel}` : `Current Plan: ${tierLabel}`}
          </p>
          <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
            {isHe ? 'בתוקף עד לתאריך: —' : 'Valid until: —'}
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all hover:brightness-105 active:scale-[0.97]"
          style={{
            border: '1.5px solid #D4AF37',
            background: 'transparent',
            color: '#B8860B',
          }}
          onClick={() => toast({ title: isHe ? 'היסטוריית תשלומים תהיה זמינה בקרוב' : 'Payment history coming soon' })}
        >
          <Receipt className="w-4 h-4" />
          {isHe ? 'היסטוריית תשלומים וקבלות' : 'Payment History & Receipts'}
        </button>
      </div>

      {/* Asymmetrical gold divider */}
      <div className="py-2">
        <div
          style={{
            height: '4px',
            width: '70%',
            marginLeft: 'auto',
            marginRight: 0,
            borderRadius: '2px',
            background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
            boxShadow: '0 0 10px rgba(212,175,55,0.3), 0 0 20px rgba(212,175,55,0.1)',
          }}
        />
      </div>

      {plans.map((plan) => {
        const Icon = iconMap[plan.slug] || Sparkles;
        const name = isHe ? plan.name_he : plan.name_en;
        const features = isHe ? plan.features_he : plan.features_en;
        const cta = isHe ? plan.cta_he : plan.cta_en;
        const isHighlighted = plan.is_highlighted;

        if (isHighlighted) {
          return (
            <HighlightedPlanCard
              key={plan.id}
              plan={plan}
              name={name}
              features={features}
              cta={cta}
              Icon={Icon}
              isHe={isHe}
              onUpgrade={handleUpgrade}
              isLoadingPayment={isLoadingPayment}
            />
          );
        }

        return (
          <StandardPlanCard
            key={plan.id}
            plan={plan}
            name={name}
            features={features}
            cta={cta}
            Icon={Icon}
            isHe={isHe}
            onUpgrade={handleUpgrade}
            isLoadingPayment={isLoadingPayment}
          />
        );
      })}

      {/* Fine print */}
      <p className="text-center text-[10px] text-muted-foreground leading-relaxed px-4">
        {isHe
          ? 'ביטול בכל עת. תשלום מאובטח דרך Tranzila. ללא התחייבות.'
          : 'Cancel anytime. Secure payment via Tranzila. No commitment.'}
      </p>
    </div>
  );
}

/* ── Highlighted Plan Card ── */
interface PlanCardProps {
  plan: PricingPlan;
  name: string;
  features: string[];
  cta: string;
  Icon: React.ElementType;
  isHe: boolean;
  onUpgrade: (plan: PricingPlan) => void;
  isLoadingPayment?: boolean;
}

function HighlightedPlanCard({ plan, name, features, cta, Icon, isHe, onUpgrade, isLoadingPayment }: PlanCardProps) {
  return (
    <div
      className="rounded-2xl border-2 p-5 space-y-4 relative overflow-hidden"
      style={{
        borderColor: '#D4AF37',
        background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--pink)) 100%)',
        boxShadow: '0 6px 30px -6px rgba(212, 175, 55, 0.2)',
      }}
    >
      {/* Launch Price Badge */}
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <span
          className="px-5 py-1.5 text-[11px] font-black rounded-b-xl tracking-wide"
          style={{
            background: 'linear-gradient(135deg, #FACC15 0%, #FDE68A 30%, #FCD34D 50%, #FACC15 75%, #EAB308 100%)',
            color: '#78350F',
            boxShadow: '0 4px 16px rgba(250, 204, 21, 0.5), 0 1px 4px rgba(0,0,0,0.1)',
            textShadow: '0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          {isHe ? '🔥 מחיר השקה מיוחד!' : '🔥 Special Launch Price!'}
        </span>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-base">{name}</h2>
          <div className="flex flex-col mt-0.5">
            {plan.original_price_monthly > 0 && (
              <span className="text-sm line-through" style={{ color: '#999' }}>
                ₪{Math.round(plan.original_price_monthly)} {isHe ? '/ חודש' : '/ month'}
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-2xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
              >
                ₪{plan.price_monthly}
              </span>
              <span className="text-xs text-foreground/50">
                {plan.slug === 'vip-3year'
                  ? (isHe ? '/ תשלום חד-פעמי' : '/ one-time')
                  : (isHe ? 'לחודש' : '/month')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
            />
            <p className="text-sm text-foreground font-medium leading-relaxed">{f}</p>
          </div>
        ))}
      </div>

      {/* WhatsApp automation visual */}
      <div
        className="rounded-xl p-3 flex items-center gap-3"
        style={{ backgroundColor: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.2)' }}
      >
        <MessageCircle className="w-5 h-5 shrink-0" style={{ color: '#25d366' }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">
            {isHe ? 'אוטומציה מלאה' : 'Full Automation'}
          </p>
          <p className="text-[10px] text-foreground/60">
            {isHe ? 'ההודעות נשלחות אוטומטית ללקוחות שלך' : 'Messages are sent automatically to your clients'}
          </p>
        </div>
        <Zap className="w-4 h-4 text-accent shrink-0" />
      </div>

      <p className="text-center text-xs font-medium" style={{ color: '#8B6508' }}>
        {isHe ? '🔒 המחיר ננעל לך לכל החיים! (כל עוד המנוי נשאר פעיל)' : '🔒 Price locked forever! (as long as your subscription stays active)'}
      </p>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={isLoadingPayment}
        className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.97] hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, #FACC15 0%, #FDE68A 30%, #FCD34D 50%, #FACC15 75%, #EAB308 100%)',
          color: '#78350F',
          border: '2px solid #EAB308',
          boxShadow: '0 6px 24px -4px rgba(250, 204, 21, 0.5), 0 2px 8px rgba(0,0,0,0.08)',
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <Crown className="w-5 h-5" />
        {isLoadingPayment ? (isHe ? 'טוען...' : 'Loading...') : cta}
      </button>
    </div>
  );
}

/* ── Standard Plan Card ── */
function StandardPlanCard({ plan, name, features, cta, Icon, isHe, onUpgrade, isLoadingPayment }: PlanCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-base">{name}</h2>
          {plan.price_monthly > 0 && (
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-bold text-foreground">
                ₪{plan.price_monthly}
              </span>
              <span className="text-xs text-foreground/50">
                {plan.slug === 'vip-3year'
                  ? (isHe ? '/ תשלום חד-פעמי' : '/ one-time')
                  : (isHe ? 'לחודש' : '/month')}
              </span>
            </div>
          )}
          {plan.price_monthly === 0 && (
            <p className="text-xs text-muted-foreground">
              {isHe ? 'כלול במנוי' : 'Included in Subscription'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div
              className="w-2 h-2 rounded-full shrink-0 mt-1.5"
              style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
            />
            <p className="text-sm text-foreground/80 leading-relaxed">{f}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onUpgrade(plan)}
        disabled={isLoadingPayment}
        className="w-full py-3 rounded-2xl text-sm font-bold border border-border transition-all active:scale-[0.97] hover:bg-accent/5 flex items-center justify-center gap-2 text-foreground disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoadingPayment ? (isHe ? 'טוען...' : 'Loading...') : cta}
      </button>
    </div>
  );
}
