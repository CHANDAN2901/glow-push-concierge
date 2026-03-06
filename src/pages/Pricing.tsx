import { useState, useEffect } from 'react';
import { Crown, Sparkles, Star, Flame, Receipt } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { usePricingPlans, useVipTakenCount, type PricingPlan } from '@/hooks/usePricingPlans';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const iconMap: Record<string, React.ElementType> = {
  pro: Sparkles,
  elite: Star,
  'vip-3year': Crown,
};

/* ── Plan title renderer ── */
const PlanTitle = ({ slug, name }: { slug: string; name: string }) => {
  const lastSpace = name.lastIndexOf(' ');
  const prefix = lastSpace > 0 ? name.slice(0, lastSpace) : '';
  const suffix = lastSpace > 0 ? name.slice(lastSpace + 1) : name;

  if (slug === 'elite' || slug === 'vip-3year') {
    return (
      <h2 className="text-xl font-medium" style={{ color: '#333' }}>
        <span className="font-light tracking-wide">{prefix} </span>
        <span
          className="font-serif font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg, #D4AF37, #F1D592)' }}
        >
          {suffix}
        </span>
      </h2>
    );
  }

  return (
    <h2 className="text-xl" style={{ color: '#333333' }}>
      <span className="font-light tracking-wide">{prefix} </span>
      <span className="font-semibold">{suffix}</span>
    </h2>
  );
};

/* ── FOMO badge sub-component ── */
const FomoBadge = ({ totalSpots, takenSpots, isHe }: { totalSpots: number; takenSpots: number; isHe: boolean }) => {
  if (totalSpots <= 0) return null;
  const remaining = Math.max(totalSpots - takenSpots, 0);
  const pct = Math.min((takenSpots / totalSpots) * 100, 100);
  const isUrgent = remaining <= 10;

  const textColor = isUrgent ? '#C0392B' : '#B8860B';
  const barColor = isUrgent
    ? 'linear-gradient(90deg, #E74C3C, #C0392B)'
    : 'linear-gradient(90deg, #D4AF37, #F9F295, #D4AF37)';

  return (
    <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
      <div className="flex items-center gap-2 mb-2">
        {isUrgent && <Flame className="w-4 h-4 animate-pulse" style={{ color: '#E74C3C' }} />}
        <span className="text-sm font-bold" style={{ color: textColor }}>
          {isHe
            ? `נשארו רק ${remaining} מקומות אחרונים במחיר המייסדות!`
            : `Only ${remaining} founding-price spots left!`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
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
  const { lang } = useI18n();
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
      <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] to-[#FFFFFF] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-serif">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] to-[#FFFFFF]" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="pt-20 pb-10 text-center px-4">
        <h1
          className="text-3xl md:text-5xl font-serif font-light tracking-wider mb-4 animate-fade-up"
          style={{ color: '#1a1a1a', animationFillMode: 'both' }}
        >
          {isHe ? 'בחרי את המסלול שמתאים לקליניקה שלך ✨' : 'Choose the Perfect Plan for Your Clinic ✨'}
        </h1>
        <p
          className="text-base md:text-lg max-w-xl mx-auto leading-relaxed animate-fade-up"
          style={{ color: '#888', animationDelay: '120ms', animationFillMode: 'both' }}
        >
          {isHe ? 'הכלים הדיגיטליים המתקדמים ביותר למאפרות שמכוונות רחוק.' : 'Advanced digital tools for ambitious PMU artists.'}
        </p>
        <div
          className="w-20 h-[2px] mx-auto mt-6 rounded-full animate-fade-up"
          style={{
            background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
            animationDelay: '200ms',
            animationFillMode: 'both',
          }}
        />
      </div>

      {/* Personal Status Card — only for logged-in users */}
      {user && (
        <div className="mx-auto px-4 max-w-lg mb-8">
          <div
            className="rounded-2xl p-6 space-y-4 text-center"
            style={{
              background: '#ffffff',
              border: '2px solid #D4AF37',
              boxShadow: '0 4px 24px -4px rgba(212, 175, 55, 0.15)',
            }}
          >
            <h2
              className="text-xl font-bold bg-clip-text text-transparent leading-relaxed"
              style={{ backgroundImage: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)' }}
            >
              {isHe ? `היי ${displayName}, איזה כיף שאת איתנו! ✨` : `Hey ${displayName}, glad to have you! ✨`}
            </h2>

            <div className="space-y-1.5">
              <p className="text-sm font-medium" style={{ color: '#000000' }}>
                {isHe ? `חבילה נוכחית: ${tierLabel}` : `Current Plan: ${tierLabel}`}
              </p>
              <p className="text-sm font-medium" style={{ color: '#000000' }}>
                {isHe ? 'בתוקף עד לתאריך: —' : 'Valid until: —'}
              </p>
            </div>

            <button
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all hover:brightness-105 active:scale-[0.97]"
              style={{
                border: '1.5px solid #D4AF37',
                background: '#ffffff',
                color: '#B8860B',
              }}
              onClick={() => window.location.href = '/payment-history'}
            >
              <Receipt className="w-4 h-4" />
              {isHe ? 'היסטוריית תשלומים וקבלות' : 'Payment History & Receipts'}
            </button>
          </div>

          {/* Asymmetrical gold divider */}
          <div className="pt-6">
            <div
              style={{
                height: '3px',
                width: '60%',
                marginRight: 0,
                marginLeft: 'auto',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
                boxShadow: '0 0 8px rgba(212,175,55,0.25)',
              }}
            />
          </div>
        </div>
      )}

      {/* Cards */}
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
              className={`w-full rounded-3xl p-8 md:p-10 flex flex-col relative animate-fade-up text-center ${isElite ? '' : 'bg-white'}`}
              style={{
                border: isElite ? '2px solid #D4AF37' : '1px solid rgba(212,175,55,0.25)',
                background: isElite
                  ? 'linear-gradient(180deg, #FFFDF5 0%, #FFF9E6 100%)'
                  : '#ffffff',
                boxShadow: isElite
                  ? '0 6px 36px -8px rgba(212,175,55,0.28)'
                  : '0 2px 16px -4px rgba(0,0,0,0.04)',
                animationDelay: `${200 + idx * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              {isElite && badge && (
                <span
                  className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1.5 px-6 py-1.5 rounded-full text-sm font-bold whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
                    color: '#5C4033',
                    boxShadow: '0 2px 12px rgba(212,175,55,0.4)',
                  }}
                >
                  {badge}
                </span>
              )}

              <div className={`flex items-center justify-center gap-2 ${isElite ? 'mt-4' : ''} mb-6`}>
                <PlanTitle slug={plan.slug} name={name} />
                <Icon className="w-5 h-5" style={{ color: '#D4AF37' }} />
              </div>

              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span
                    className="text-5xl font-serif font-bold"
                    style={{
                      color: isElite ? undefined : '#333',
                      backgroundImage: isElite ? 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F1D592)' : undefined,
                      WebkitBackgroundClip: isElite ? 'text' : undefined,
                      WebkitTextFillColor: isElite ? 'transparent' : undefined,
                    }}
                  >
                    {isHe ? `₪${plan.price_monthly.toLocaleString()}` : `$${plan.price_usd.toLocaleString()}`}
                  </span>
                  <span className="text-sm" style={{ color: '#999' }}>
                    {plan.slug === 'vip-3year' ? (isHe ? '/ תשלום חד-פעמי' : '/ one-time') : (isHe ? '/ חודש' : '/ month')}
                  </span>
                </div>
              </div>

              <ul className="space-y-0 mb-10 flex-1">
                {features.map((f, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-center gap-3 text-sm py-3" style={{ color: '#000000', fontWeight: 500 }}>
                      <span>{f}</span>
                    </div>
                    {i < features.length - 1 && (
                      <div
                        style={{
                          height: '3px',
                          width: '60%',
                          marginRight: 0,
                          marginLeft: 'auto',
                          borderRadius: '4px',
                          background: 'linear-gradient(135deg, #8B6508 0%, #D4AF37 35%, #996515 50%, #F3E5AB 75%, #5C400A 100%)',
                          boxShadow: '0 0 6px rgba(212,175,55,0.25)',
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>

              {plan.slug === 'vip-3year' && plan.total_promo_spots > 0 && (
                <FomoBadge totalSpots={plan.total_promo_spots} takenSpots={vipTaken} isHe={isHe} />
              )}

              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center py-4 rounded-2xl text-base font-bold transition-all duration-300 active:scale-[0.97] hover:shadow-md hover:scale-[1.01]"
                style={{
                  border: '2px solid #333',
                  color: '#333',
                  background: 'transparent',
                }}
              >
                {cta}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs pb-10 px-4 space-y-2" style={{ color: '#bbb' }}>
        <p>{isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}</p>
        <Link to="/refund-policy" className="underline hover:text-foreground transition-colors">
          {isHe ? 'מדיניות ביטולים והחזרים' : 'Cancellation & Refund Policy'}
        </Link>
      </div>

      {/* Cancellation & Refund Policy */}
      <div className="mx-auto px-4 pb-20 max-w-lg">
        <div className="text-center mb-8">
          <h2
            className="text-2xl md:text-3xl font-serif font-light tracking-wider mb-2"
            style={{ color: '#1a1a1a' }}
          >
            {isHe ? 'מדיניות ביטולים והחזרים כספיים' : 'Cancellation & Refund Policy'}
          </h2>
          <div
            className="w-16 h-[2px] mx-auto mt-4 rounded-full"
            style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)' }}
          />
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem value="vip" className="border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
              <span className="text-sm font-bold text-start" style={{ color: '#333' }}>
                {isHe ? 'מדיניות ביטול מיוחדת למסלול המייסדות (VIP)' : 'Special Cancellation Policy for Founders (VIP)'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#555' }}>
                <p>
                  <strong style={{ color: '#B8860B' }}>14 ימי התנסות ללא סיכון:</strong>{' '}
                  ביטול תוך 14 ימים מיום הרכישה יזכה אותך בהחזר כספי מלא.
                </p>
                <p>
                  <strong style={{ color: '#B8860B' }}>גמישות מלאה גם בהמשך:</strong>{' '}
                  ניתן לבטל את המנוי בכל שלב, גם לאחר 14 הימים הראשונים.
                </p>
                <p>
                  <strong style={{ color: '#B8860B' }}>איך מחושב ההחזר?</strong>{' '}
                  במקרה של ביטול לאחר תקופת הניסיון, התקופה שבה השתמשת במערכת תחושב מחדש לפי העלות החודשית הרגילה של מסלול Elite (149 ₪ לחודש). סכום זה יופחת מהתשלום החד-פעמי ששילמת, והיתרה תוחזר אלייך.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="monthly" className="border rounded-2xl overflow-hidden" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
              <span className="text-sm font-bold text-start" style={{ color: '#333' }}>
                {isHe ? 'תנאי ביטול למסלולי Pro ו-Elite (מנוי חודשי)' : 'Cancellation Terms for Pro & Elite (Monthly)'}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#555' }}>
                <p>
                  <strong style={{ color: '#B8860B' }}>ביטול בכל רגע:</strong>{' '}
                  ניתן לבטל את המנוי החודשי בכל עת, ישירות בלחיצת כפתור דרך הגדרות החשבון.
                </p>
                <p>
                  <strong style={{ color: '#B8860B' }}>ללא קנסות יציאה:</strong>{' '}
                  לאחר הביטול, המנוי יישאר פעיל ותמשיכי ליהנות מהמערכת עד סוף תקופת החיוב הנוכחית (סוף החודש שעבורו כבר שילמת). לאחר מכן המנוי יסתיים ולא תחויבי שוב.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default Pricing;
