import { useState, useEffect } from 'react';
import { Crown, Sparkles, Star, Flame, Receipt, Gift, Camera, Coins, ArrowUp } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { usePricingPlans, useVipTakenCount, type PricingPlan } from '@/hooks/usePricingPlans';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const GOLD = '#D4A855';
const GOLD_LIGHT = '#E8C878';
const GOLD_BTN = '#C8A040';
const GOLD_TEXT = '#C49A3C';
const GOLD_BORDER = 'rgba(212, 168, 85, 0.3)';
const TEXT_DARK = '#7A5C1E';
const GOLD_GRADIENT = 'linear-gradient(135deg, #E8C878, #C8A040)';
const GOLD_GRADIENT_WIDE = 'linear-gradient(90deg, #C49A3C, #E8C878, #D4A855, #E8C878, #C49A3C)';
const CARD_SHADOW = '0 4px 20px rgba(180,120,100,0.15)';
const CARD_SHADOW_ELITE = '0 8px 32px rgba(180,120,100,0.2), 0 0 24px rgba(212,168,85,0.2)';

const iconMap: Record<string, React.ElementType> = {
  pro: Sparkles,
  elite: Star,
  'vip-3year': Crown,
};

const floatingIcons = [Gift, Camera, Coins, ArrowUp];

const PlanTitle = ({ slug, name }: { slug: string; name: string }) => {
  const lastSpace = name.lastIndexOf(' ');
  const prefix = lastSpace > 0 ? name.slice(0, lastSpace) : '';
  const suffix = lastSpace > 0 ? name.slice(lastSpace + 1) : name;

  if (slug === 'elite' || slug === 'vip-3year') {
    return (
      <h2 className="text-xl font-medium" style={{ color: TEXT_DARK }}>
        <span className="font-light tracking-wide">{prefix} </span>
        <span
          className="font-bold bg-clip-text text-transparent"
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

const BOKEH_CIRCLES = [
  { size: 220, top: '3%', left: '5%', color: '#F0C0B8' },
  { size: 150, top: '15%', left: '75%', color: '#E8B0A8' },
  { size: 250, top: '35%', left: '50%', color: '#FFD0C8' },
  { size: 100, top: '55%', left: '10%', color: 'rgba(255,220,210,0.5)' },
  { size: 180, top: '65%', left: '80%', color: '#F0C0B8' },
  { size: 120, top: '80%', left: '30%', color: '#E8B0A8' },
  { size: 80, top: '25%', left: '25%', color: '#FFD0C8' },
  { size: 160, top: '90%', left: '65%', color: 'rgba(255,220,210,0.5)' },
];

const SPARKLE_DOTS = [
  { top: '12%', left: '18%', delay: 0 },
  { top: '8%', left: '72%', delay: 1.2 },
  { top: '30%', left: '90%', delay: 0.6 },
  { top: '48%', left: '8%', delay: 2 },
  { top: '62%', left: '85%', delay: 1.5 },
  { top: '75%', left: '22%', delay: 0.3 },
  { top: '88%', left: '55%', delay: 2.5 },
  { top: '42%', left: '42%', delay: 1.8 },
];

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#D4A5A0' }}>
        <div className="animate-pulse" style={{ color: GOLD }}>טוען...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden font-['fbahava',sans-serif]"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        background: 'radial-gradient(ellipse at 30% 20%, #E0B8B2 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, #DAAAA4 0%, transparent 50%), #D4A5A0',
      }}
    >
      {/* Bokeh circles */}
      {BOKEH_CIRCLES.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: b.color,
            filter: 'blur(50px)',
            animation: `bokeh-float 8s ease-in-out ${i * 0.8}s infinite alternate`,
          }}
        />
      ))}

      {/* Golden sparkle dots */}
      {SPARKLE_DOTS.map((s, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute pointer-events-none"
          style={{
            top: s.top,
            left: s.left,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: GOLD_LIGHT,
            boxShadow: `0 0 6px ${GOLD_LIGHT}, 0 0 12px rgba(232,200,120,0.3)`,
            animation: `sparkle-pulse 3s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}

      {/* Gold sparkle icons in corners */}
      <div className="absolute top-6 left-6 pointer-events-none" style={{ color: GOLD, opacity: 0.3 }}>✦</div>
      <div className="absolute top-6 right-6 pointer-events-none" style={{ color: GOLD, opacity: 0.3 }}>✦</div>
      <div className="absolute bottom-6 left-6 pointer-events-none" style={{ color: GOLD, opacity: 0.2 }}>✦</div>
      <div className="absolute bottom-6 right-6 pointer-events-none" style={{ color: GOLD, opacity: 0.2 }}>✦</div>

      <style>{`
        @keyframes bokeh-float {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-20px) scale(1.08); opacity: 1; }
          100% { transform: translateY(10px) scale(0.92); opacity: 0.5; }
        }
        @keyframes sparkle-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>

      {/* Header */}
      <div className="pt-20 pb-10 text-center px-4 relative z-10">
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
        <div className="mx-auto px-4 max-w-lg mb-8 relative z-10">
          <div
            className="rounded-[20px] p-6 space-y-4 text-center"
            style={{
              background: '#FFFFFF',
              border: `1px solid ${GOLD_BORDER}`,
              boxShadow: CARD_SHADOW,
            }}
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
            <div style={{ height: '1px', width: '60%', marginRight: 0, marginLeft: 'auto', background: `rgba(212,168,85,0.4)` }} />
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="mx-auto px-4 pb-20 flex flex-col items-center gap-8 max-w-lg relative z-10">
        {plans.map((plan, idx) => {
          const Icon = iconMap[plan.slug] || Sparkles;
          const features = isHe ? plan.features_he : plan.features_en;
          const name = isHe ? plan.name_he : plan.name_en;
          const cta = isHe ? plan.cta_he : plan.cta_en;
          const badge = isHe ? plan.badge_he : plan.badge_en;
          const isElite = plan.is_highlighted;
          const FloatingIcon = floatingIcons[idx % floatingIcons.length];

          return (
            <div
              key={plan.id}
              className="w-full p-8 md:p-10 flex flex-col relative animate-fade-up text-center"
              style={{
                border: isElite ? `2px solid ${GOLD}` : `1px solid ${GOLD_BORDER}`,
                background: '#FFFFFF',
                boxShadow: isElite ? CARD_SHADOW_ELITE : CARD_SHADOW,
                borderRadius: '20px',
                animationDelay: `${200 + idx * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              {/* Floating gold icon badge */}
              <div
                className="absolute -top-3 -end-3 flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: GOLD_GRADIENT,
                  boxShadow: '0 4px 12px rgba(200,160,64,0.35)',
                }}
              >
                <FloatingIcon className="w-5 h-5 text-white" />
              </div>

              {isElite && badge && (
                <span
                  className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1.5 px-6 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
                  style={{ background: GOLD_GRADIENT, color: '#FFFFFF', boxShadow: '0 2px 12px rgba(212,168,85,0.4)' }}
                >
                  {badge}
                </span>
              )}

              <div className={`flex items-center justify-center gap-2 ${isElite ? 'mt-4' : ''} mb-6`}>
                <PlanTitle slug={plan.slug} name={name} />
                <Icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>

              {/* Price pill badge */}
              <div className="mb-8">
                <div className="inline-flex items-baseline gap-1.5 px-6 py-2 rounded-full" style={{ background: GOLD_GRADIENT }}>
                  <span className="text-3xl font-bold text-white">
                    {isHe ? `₪${plan.price_monthly.toLocaleString()}` : `$${plan.price_usd.toLocaleString()}`}
                  </span>
                  <span className="text-sm text-white/80">
                    {plan.slug === 'vip-3year' ? (isHe ? '/ תשלום חד-פעמי' : '/ one-time') : (isHe ? '/ חודש' : '/ month')}
                  </span>
                </div>
              </div>

              <ul className="space-y-0 mb-10 flex-1">
                {features.map((f, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-center gap-3 text-sm py-3" style={{ color: TEXT_DARK, fontWeight: 500 }}>
                      <span style={{ color: GOLD_BTN }}>✓</span>
                      <span>{f}</span>
                    </div>
                    {i < features.length - 1 && (
                      <div style={{ height: '1px', width: '50%', margin: '0 auto', background: 'rgba(212,168,85,0.4)' }} />
                    )}
                  </li>
                ))}
              </ul>

              {plan.slug === 'vip-3year' && plan.total_promo_spots > 0 && (
                <FomoBadge totalSpots={plan.total_promo_spots} takenSpots={vipTaken} isHe={isHe} />
              )}

              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center py-4 text-base font-bold transition-all duration-300 active:scale-[0.97] hover:shadow-xl hover:scale-[1.02] hover:brightness-110"
                style={{
                  background: GOLD_GRADIENT,
                  color: '#FFFFFF',
                  borderRadius: '50px',
                  boxShadow: '0 6px 20px rgba(200,160,64,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.12)',
                }}
              >
                {cta}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="text-center text-xs pb-10 px-4 space-y-2 relative z-10" style={{ color: 'rgba(255,255,255,0.7)' }}>
        <p>{isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}</p>
        <Link to="/refund-policy" className="underline hover:opacity-80 transition-opacity" style={{ color: GOLD }}>
          {isHe ? 'מדיניות ביטולים והחזרים' : 'Cancellation & Refund Policy'}
        </Link>
      </div>

      {/* Gold divider before policy */}
      <div className="mx-auto max-w-lg px-4 pb-4 relative z-10">
        <div style={{ height: '1px', background: 'rgba(212,168,85,0.4)' }} />
      </div>

      {/* Cancellation & Refund Policy */}
      <div className="mx-auto px-4 pb-20 max-w-lg relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wider mb-2" style={{ color: GOLD }}>
            {isHe ? 'מדיניות ביטולים והחזרים כספיים' : 'Cancellation & Refund Policy'}
          </h2>
          <div className="w-16 h-[2px] mx-auto mt-4 rounded-full" style={{ background: GOLD_GRADIENT_WIDE }} />
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="vip" className="border overflow-hidden" style={{ borderColor: GOLD_BORDER, background: '#FFFFFF', borderRadius: '20px', boxShadow: CARD_SHADOW }}>
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

          <AccordionItem value="monthly" className="border overflow-hidden" style={{ borderColor: GOLD_BORDER, background: '#FFFFFF', borderRadius: '20px', boxShadow: CARD_SHADOW }}>
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
