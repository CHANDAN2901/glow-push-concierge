import { Check, Crown, Sparkles, Star, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PricingPlan {
  id: string;
  slug: string;
  name_he: string;
  name_en: string;
  price_monthly: number;
  price_usd: number;
  is_highlighted: boolean;
  badge_he: string | null;
  badge_en: string | null;
  features_he: string[];
  features_en: string[];
  cta_he: string;
  cta_en: string;
  sort_order: number;
  total_promo_spots: number;
}

const iconMap: Record<string, React.ElementType> = {
  pro: Sparkles,
  elite: Star,
  'vip-3year': Crown,
};

/* ── Plan title renderer ── */
const PlanTitle = ({ slug, name }: { slug: string; name: string }) => {
  // Split "Glow Push Pro" → ["Glow Push", "Pro"] or "Glow Push Elite" → ["Glow Push", "Elite"]
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
      {/* mini progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
};

const Pricing = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [vipTaken, setVipTaken] = useState(0);

  useEffect(() => {
    // Fetch plans + count of active VIP users in parallel
    Promise.all([
      supabase.from('pricing_plans').select('*').order('sort_order'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'master'),
    ]).then(([plansRes, countRes]) => {
      setPlans((plansRes.data as unknown as PricingPlan[]) || []);
      setVipTaken(countRes.count ?? 0);
      setLoading(false);
    });
  }, []);

  if (loading) {
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

      {/* Cards – single column, centered */}
      <div className="mx-auto px-4 pb-20 flex flex-col items-center gap-8 max-w-lg">
        {plans.map((plan, idx) => {
          const Icon = iconMap[plan.slug] || Sparkles;
          const features = isHe ? plan.features_he : plan.features_en;
          const name = isHe ? plan.name_he : plan.name_en;
          const cta = isHe ? plan.cta_he : plan.cta_en;
          const badge = isHe ? plan.badge_he : plan.badge_en;
          const mobileOrder = plan.is_highlighted ? 2 : idx + 1;

          const isElite = plan.is_highlighted;

          return (
            <div
              key={plan.id}
              className={`w-full rounded-3xl p-8 md:p-10 flex flex-col relative animate-fade-up text-center ${isElite ? '' : 'bg-white'}`}
              style={{
                order: mobileOrder,
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
              {/* Badge for highlighted plan */}
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

              {/* Title – centered */}
              <div className={`flex items-center justify-center gap-2 ${isElite ? 'mt-4' : ''} mb-6`}>
                <PlanTitle slug={plan.slug} name={name} />
                <Icon className="w-5 h-5" style={{ color: '#D4AF37' }} />
              </div>

              {/* Price – centered */}
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
                {plan.slug === 'vip-3year' && (
                  <p className="text-xs mt-2" style={{ color: '#B8860B' }}>
                    {isHe ? '(שווה ערך ל-₪41 בחודש בלבד! חיסכון ענק)' : '(Huge savings! Equivalent to $11/mo)'}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10 flex-1">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center justify-center gap-3 text-sm" style={{ color: '#444' }}>
                    <Check className="w-4 h-4 shrink-0 order-first rtl:order-last" style={{ color: '#D4AF37' }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* FOMO counter */}
              {plan.slug === 'vip-3year' && plan.total_promo_spots > 0 && (
                <FomoBadge totalSpots={plan.total_promo_spots} takenSpots={vipTaken} isHe={isHe} />
              )}

              {/* CTA – outlined style like screenshot */}
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

      {/* Fine print */}
      <p className="text-center text-xs pb-10 px-4" style={{ color: '#bbb' }}>
        {isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}
      </p>
    </div>
  );
};

export default Pricing;
