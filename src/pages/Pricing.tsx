import { useState, useEffect } from 'react';
import { Crown, Sparkles, Star, Flame, Receipt } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { usePricingPlans, useVipTakenCount, type PricingPlan } from '@/hooks/usePricingPlans';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GOLD = '#C9B17E';
const GOLD_TEXT = '#B5A07A';
const GOLD_BORDER = 'rgba(201, 177, 126, 0.35)';
const TEXT_ON_GOLD = '#8A7656';
const TEXT_DARK = '#8A7656';
const GOLD_GRADIENT = 'linear-gradient(135deg, #D9C9A0, #B5A07A, #C9B17E)';
const GOLD_GRADIENT_WIDE = `linear-gradient(90deg, #B5A07A, #D9C9A0, #C9B17E, #D9C9A0, #B5A07A)`;

const iconMap: Record<string, React.ElementType> = {
  pro: Sparkles,
  elite: Star,
  'vip-3year': Crown,
};

const PlanTitle = ({ slug, name }: { slug: string; name: string }) => {
  const lastSpace = name.lastIndexOf(' ');
  const prefix = lastSpace > 0 ? name.slice(0, lastSpace) : '';
  const suffix = lastSpace > 0 ? name.slice(lastSpace + 1) : name;

  if (slug === 'elite' || slug === 'vip-3year') {
    return (
      <h2 className="text-xl font-medium" style={{ color: TEXT_DARK }}>
        <span className="font-light tracking-wide">{prefix} </span>
        <span
          className="font-serif font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: GOLD_GRADIENT }}
        >
          {suffix}
        </span>
      </h2>
    );
  }

  return (
    <h2 className="text-xl" style={{ color: TEXT_DARK }}>
      <span className="font-light tracking-wide">{prefix} </span>
      <span className="font-semibold">{suffix}</span>
    </h2>
  );
};

const FomoBadge = ({ totalSpots, takenSpots, isHe }: { totalSpots: number; takenSpots: number; isHe: boolean }) => {
  if (totalSpots <= 0) return null;
  const remaining = Math.max(totalSpots - takenSpots, 0);
  const pct = Math.min((takenSpots / totalSpots) * 100, 100);
  const isUrgent = remaining <= 10;

  const textColor = isUrgent ? '#C0392B' : GOLD_TEXT;
  const barColor = isUrgent
    ? 'linear-gradient(90deg, #E74C3C, #C0392B)'
    : GOLD_GRADIENT;

  return (
    <div className="mb-4 rounded-xl px-4 py-3" style={{ background: `${GOLD}12`, border: `1px solid ${GOLD}33` }}>
      <div className="flex items-center gap-2 mb-2">
        {isUrgent && <Flame className="w-4 h-4 animate-pulse" style={{ color: '#E74C3C' }} />}
        <span className="text-sm font-bold" style={{ color: textColor }}>
          {isHe
            ? `נשארו רק ${remaining} מקומות אחרונים במחיר המייסדות!`
            : `Only ${remaining} founding-price spots left!`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${GOLD}22` }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
};

const tierLabelMap: Record<string, { he: string; en: string }> = {
  lite: { he: 'Pro – בסיסי', en: 'Pro – Basic' },
  professional: { he: 'Elite – מקצועי', en: 'Elite – Professional' },
  master: { he: 'VIP – מייסדות', en: 'VIP – Founders' },
};

const Pricing = () => {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const isHe = lang === 'he';
  const { toast } = useToast();
  const { data: plans = [], isLoading } = usePricingPlans();
  const { data: vipTaken = 0 } = useVipTakenCount();
  const { user } = useAuth();

  const [artistName, setArtistName] = useState('');
  const [currentTier, setCurrentTier] = useState('lite');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('full_name, subscription_tier')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setArtistName(data.full_name || '');
          setCurrentTier(data.subscription_tier || 'lite');
        }
      });
  }, [user]);

  const displayName = artistName?.split(' ')[0] || (isHe ? 'יוצרת' : 'Creator');
  const tierLabel = tierLabelMap[currentTier]?.[isHe ? 'he' : 'en'] || (isHe ? 'חינמי' : 'Free');

  const BG_GRADIENT = 'linear-gradient(160deg, #F5D5D5 0%, #F0D0D5 30%, #E8C0C8 60%, #E0B8C0 100%)';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_GRADIENT }}>
        <div className="animate-pulse font-serif" style={{ color: GOLD }}>טוען...</div>
      </div>
    );
  }

  const BOKEH_CIRCLES = [
    { size: 200, top: '5%', left: '8%', color: 'rgba(255,225,210,0.5)', blur: 70, delay: 0 },
    { size: 140, top: '20%', right: '3%', color: 'rgba(240,200,190,0.4)', blur: 60, delay: 1.5 },
    { size: 220, top: '45%', left: '55%', color: 'rgba(255,215,200,0.35)', blur: 80, delay: 0.8 },
    { size: 100, top: '65%', left: '12%', color: 'rgba(245,210,200,0.45)', blur: 65, delay: 2.2 },
    { size: 160, top: '80%', right: '15%', color: 'rgba(255,220,205,0.4)', blur: 70, delay: 1.2 },
    { size: 120, top: '35%', left: '78%', color: 'rgba(240,195,185,0.5)', blur: 60, delay: 3 },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden font-['fbahava',sans-serif]"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{ background: BG_GRADIENT }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(212,168,85,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(212,168,85,0.04) 0%, transparent 40%)',
        }}
      />
      {/* Bokeh floating circles */}
      {BOKEH_CIRCLES.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: (b as any).left,
            right: (b as any).right,
            background: b.color,
            filter: `blur(${b.blur}px)`,
            animation: `bokeh-float 7s ease-in-out ${b.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes bokeh-float {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-18px) scale(1.06); opacity: 1; }
          100% { transform: translateY(8px) scale(0.94); opacity: 0.6; }
        }
      `}</style>
      {/* Header */}
      <div className="pt-20 pb-10 text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
          <h1
            className="text-3xl md:text-5xl font-bold tracking-wider animate-fade-up"
            style={{ color: GOLD_TEXT, animationFillMode: 'both' }}
          >
            {isHe ? 'בחרי את המסלול שמתאים לקליניקה שלך' : 'Choose the Perfect Plan for Your Clinic'}
          </h1>
          <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
        </div>
        <p
          className="text-base md:text-lg max-w-xl mx-auto leading-relaxed animate-fade-up"
          style={{ color: '#7A6B5D', animationDelay: '120ms', animationFillMode: 'both' }}
        >
          {isHe ? 'הכלים הדיגיטליים המתקדמים ביותר למאפרות שמכוונות רחוק.' : 'Advanced digital tools for ambitious PMU artists.'}
        </p>
        <div
          className="w-20 h-[2px] mx-auto mt-6 rounded-full animate-fade-up"
          style={{ background: GOLD_GRADIENT_WIDE, animationDelay: '200ms', animationFillMode: 'both' }}
        />
      </div>

      {/* Personal Status Card */}
      {user && (
        <div className="mx-auto px-4 max-w-lg mb-8">
          <div
            className="rounded-2xl p-6 space-y-4 text-center backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.75)', border: `2px solid ${GOLD}`, boxShadow: `0 8px 32px -4px rgba(212,168,85,0.15), 0 0 0 1px rgba(212,168,85,0.1)` }}
          >
            <h2
              className="text-xl font-bold bg-clip-text text-transparent leading-relaxed"
              style={{ backgroundImage: GOLD_GRADIENT }}
            >
              {t('sub.greeting').replace('{name}', displayName)}
            </h2>
            <div className="space-y-1.5">
              <p className="text-sm font-medium" style={{ color: TEXT_DARK }}>
                {t('sub.currentPlan').replace('{plan}', tierLabel)}
              </p>
              <p className="text-sm font-medium" style={{ color: TEXT_DARK }}>
                {t('sub.validUntil')}
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:brightness-105 active:scale-[0.97]"
              style={{ border: `1.5px solid ${GOLD_BORDER}`, background: 'transparent', color: GOLD_TEXT }}
              onClick={() => navigate('/payment-history')}
            >
              <Receipt className="w-4 h-4" />
              {t('sub.paymentHistory')}
            </button>
          </div>

          {/* Gold divider */}
          <div className="pt-6">
            <div style={{ height: '1px', width: '60%', marginRight: 0, marginLeft: 'auto', background: GOLD_GRADIENT_WIDE }} />
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="mx-auto px-4 pb-20 flex flex-col items-center gap-8 max-w-lg">
        {plans.map((plan, idx) => {
          const Icon = iconMap[plan.slug] || Sparkles;
          const features = isHe ? plan.features_he : plan.features_en;
          const name = isHe ? plan.name_he : plan.name_en;
          const cta = isHe ? plan.cta_he : plan.cta_en;
          const badge = isHe ? plan.badge_he : plan.badge_en;
          const isElite = plan.is_highlighted;

          return (
            <div
              key={plan.id}
              className="w-full rounded-2xl p-8 md:p-10 flex flex-col relative animate-fade-up text-center backdrop-blur-xl"
              style={{
                border: isElite ? `2px solid ${GOLD}` : `1px solid ${GOLD_BORDER}`,
                background: isElite
                  ? 'rgba(255,253,245,0.85)'
                  : 'rgba(255,255,255,0.75)',
                boxShadow: isElite
                  ? `0 0 24px rgba(201,168,76,0.25), 0 8px 40px -8px rgba(212,168,85,0.2), inset 0 1px 0 rgba(255,255,255,0.6)`
                  : '0 4px 24px -4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
                borderRadius: '20px',
                animationDelay: `${200 + idx * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              {isElite && badge && (
                <span
                  className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1.5 px-6 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
                  style={{ background: GOLD_GRADIENT, color: '#FFFFFF', boxShadow: `0 2px 12px rgba(212,168,85,0.4)` }}
                >
                  {badge}
                </span>
              )}

              <div className={`flex items-center justify-center gap-2 ${isElite ? 'mt-4' : ''} mb-6`}>
                <PlanTitle slug={plan.slug} name={name} />
                <Icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>

              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span
                    className="text-5xl font-serif font-bold"
                    style={{
                      color: isElite ? undefined : TEXT_DARK,
                      backgroundImage: isElite ? GOLD_GRADIENT : undefined,
                      WebkitBackgroundClip: isElite ? 'text' : undefined,
                      WebkitTextFillColor: isElite ? 'transparent' : undefined,
                    }}
                  >
                    {isHe ? `₪${plan.price_monthly.toLocaleString()}` : `$${plan.price_usd.toLocaleString()}`}
                  </span>
                  <span className="text-sm" style={{ color: '#7A6B5D' }}>
                    {plan.slug === 'vip-3year' ? (isHe ? '/ תשלום חד-פעמי' : '/ one-time') : (isHe ? '/ חודש' : '/ month')}
                  </span>
                </div>
              </div>

              <ul className="space-y-0 mb-10 flex-1">
                {features.map((f, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-center gap-3 text-sm py-3" style={{ color: TEXT_DARK, fontWeight: 500 }}>
                      <span>{f}</span>
                    </div>
                    {i < features.length - 1 && (
                      <div style={{ height: '1px', width: '50%', margin: '0 auto', background: `${GOLD}44` }} />
                    )}
                  </li>
                ))}
              </ul>

              {plan.slug === 'vip-3year' && plan.total_promo_spots > 0 && (
                <FomoBadge totalSpots={plan.total_promo_spots} takenSpots={vipTaken} isHe={isHe} />
              )}

              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center py-4 rounded-full text-base font-bold transition-all duration-300 active:scale-[0.97] hover:shadow-xl hover:scale-[1.02] hover:brightness-110"
                style={{
                  background: `linear-gradient(135deg, #E8C878 0%, #D4A855 40%, #C49A3C 70%, #B8902E 100%)`,
                  color: '#FFFFFF',
                  boxShadow: '0 6px 20px rgba(212,168,85,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }}
              >
                {cta}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="text-center text-xs pb-10 px-4 space-y-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
        <p>{isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}</p>
        <Link to="/refund-policy" className="underline hover:opacity-80 transition-opacity" style={{ color: GOLD }}>
          {isHe ? 'מדיניות ביטולים והחזרים' : 'Cancellation & Refund Policy'}
        </Link>
      </div>

      {/* Gold divider before policy */}
      <div className="mx-auto max-w-lg px-4 pb-4">
        <div style={{ height: '1px', background: GOLD_GRADIENT_WIDE }} />
      </div>

      {/* Cancellation & Refund Policy */}
      <div className="mx-auto px-4 pb-20 max-w-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold tracking-wider mb-2" style={{ color: GOLD }}>
            {isHe ? 'מדיניות ביטולים והחזרים כספיים' : 'Cancellation & Refund Policy'}
          </h2>
          <div className="w-16 h-[2px] mx-auto mt-4 rounded-full" style={{ background: GOLD_GRADIENT_WIDE }} />
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="vip" className="border rounded-2xl overflow-hidden backdrop-blur-xl" style={{ borderColor: GOLD_BORDER, background: 'rgba(255,255,255,0.7)' }}>
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
              <span className="text-sm font-bold text-start" style={{ color: TEXT_DARK }}>
                {isHe ? 'מדיניות ביטול מיוחדת למסלול המייסדות (VIP)' : 'Special Cancellation Policy for Founders (VIP)'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#5C4A3A' }}>
                <p><strong style={{ color: GOLD_TEXT }}>14 ימי התנסות ללא סיכון:</strong>{' '}ביטול תוך 14 ימים מיום הרכישה יזכה אותך בהחזר כספי מלא.</p>
                <p><strong style={{ color: GOLD_TEXT }}>גמישות מלאה גם בהמשך:</strong>{' '}ניתן לבטל את המנוי בכל שלב, גם לאחר 14 הימים הראשונים.</p>
                <p><strong style={{ color: GOLD_TEXT }}>איך מחושב ההחזר?</strong>{' '}במקרה של ביטול לאחר תקופת הניסיון, התקופה שבה השתמשת במערכת תחושב מחדש לפי העלות החודשית הרגילה של מסלול Elite (149 ₪ לחודש). סכום זה יופחת מהתשלום החד-פעמי ששילמת, והיתרה תוחזר אלייך.</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="monthly" className="border rounded-2xl overflow-hidden backdrop-blur-xl" style={{ borderColor: GOLD_BORDER, background: 'rgba(255,255,255,0.7)' }}>
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
              <span className="text-sm font-bold text-start" style={{ color: TEXT_DARK }}>
                {isHe ? 'תנאי ביטול למסלולי Pro ו-Elite (מנוי חודשי)' : 'Cancellation Terms for Pro & Elite (Monthly)'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#5C4A3A' }}>
                <p><strong style={{ color: GOLD_TEXT }}>ביטול בכל רגע:</strong>{' '}ניתן לבטל את המנוי החודשי בכל עת, ישירות בלחיצת כפתור דרך הגדרות החשבון.</p>
                <p><strong style={{ color: GOLD_TEXT }}>ללא קנסות יציאה:</strong>{' '}לאחר הביטול, המנוי יישאר פעיל ותמשיכי ליהנות מהמערכת עד סוף תקופת החיוב הנוכחית (סוף החודש שעבורו כבר שילמת). לאחר מכן המנוי יסתיים ולא תחויבי שוב.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default Pricing;
