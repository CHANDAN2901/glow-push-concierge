import { useState, useEffect, useMemo } from 'react';
import { Crown, Sparkles, Star, Flame, Receipt } from 'lucide-react';
import roseGoldTexture from '@/assets/rose-gold-metal-texture.jpg';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { usePricingPlans, useVipTakenCount } from '@/hooks/usePricingPlans';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import BackButton from '@/components/BackButton';
import { FEATURES } from '@/lib/subscriptionConfig';

const ROSE_GOLD = '#d8b4b4';
const ROSE_GOLD_DARK = 'hsl(14 29% 30%)';
const ROSE_GOLD_METALLIC = '#C9956C';
const GOLD = '#D4AF37';
const GOLD_TEXT = '#B8860B';
const GOLD_BORDER = 'rgba(216, 180, 180, 0.4)';
const TEXT_DARK = 'hsl(14 29% 30%)';
const GOLD_GRADIENT = 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)';
const GOLD_GRADIENT_WIDE = 'linear-gradient(90deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)';

const GLASS_BG = 'rgba(255, 255, 255, 0.55)';
const GLASS_BG_HIGHLIGHT = 'rgba(255, 255, 255, 0.65)';
const GLASS_BORDER = '1.5px solid rgba(216, 180, 180, 0.5)';
const GLASS_BORDER_HIGHLIGHT = '2px solid rgba(216, 180, 180, 0.7)';
const GLASS_SHADOW = '0 8px 32px rgba(216, 180, 180, 0.2), 0 2px 8px rgba(0,0,0,0.04)';
const GLASS_SHADOW_HIGHLIGHT = '0 12px 40px rgba(216, 180, 180, 0.3), 0 4px 16px rgba(201, 149, 108, 0.1)';

const iconMap: Record<string, React.ElementType> = {
  lite: Sparkles,
  pro: Sparkles,
  professional: Star,
  elite: Star,
  master: Crown,
  'vip-3year': Crown,
};

const PlanTitle = ({ slug, name }: { slug: string; name: string }) => {
  const lastSpace = name.lastIndexOf(' ');
  const prefix = lastSpace > 0 ? name.slice(0, lastSpace) : '';
  const suffix = lastSpace > 0 ? name.slice(lastSpace + 1) : name;

  if (slug === 'elite' || slug === 'vip-3year') {
    return (
      <h2 className="text-xl font-bold" style={{ color: TEXT_DARK, fontFamily: "'FB Ahava', 'Assistant', sans-serif" }}>
        <span className="font-light tracking-wide">{prefix} </span>
        <span
          className="font-bold bg-clip-text text-transparent"
          style={{ backgroundImage: `linear-gradient(135deg, #d8b4b4, #c9a0a0, #d8b4b4)` }}
        >
          {suffix}
        </span>
      </h2>
    );
  }

  return (
    <h2 className="text-xl font-bold" style={{ color: TEXT_DARK, fontFamily: "'FB Ahava', 'Assistant', sans-serif" }}>
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

  const textColor = isUrgent ? '#C0392B' : ROSE_GOLD_METALLIC;
  const barColor = isUrgent
    ? 'linear-gradient(90deg, #E74C3C, #C0392B)'
    : `linear-gradient(90deg, ${ROSE_GOLD}, ${ROSE_GOLD_METALLIC})`;

  return (
    <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(216, 180, 180, 0.1)', border: '1px solid rgba(216, 180, 180, 0.3)' }}>
      <div className="flex items-center gap-2 mb-2">
        {isUrgent && <Flame className="w-4 h-4 animate-pulse" style={{ color: '#E74C3C' }} />}
        <span className="text-sm font-bold" style={{ color: textColor }}>
          {isHe
            ? `נשארו רק ${remaining} מקומות אחרונים במחיר המייסדות!`
            : `Only ${remaining} founding-price spots left!`}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(216, 180, 180, 0.2)' }}>
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
  const { data: dbPlans = [] } = usePricingPlans();
  const { data: vipTaken = 0 } = useVipTakenCount();
  const { user } = useAuth();

  // Fully DB-driven plan cards from pricing_plans table
  const plans = useMemo(() => {
    return dbPlans.map((db) => {
      // Resolve feature keys to human-readable names from central config
      const resolvedFeatures = (db.feature_keys || []).map(key => {
        const feat = FEATURES.find(f => f.id === key);
        return feat ? { name: feat.name, desc: feat.desc } : null;
      }).filter(Boolean) as { name: { en: string; he: string }; desc: { en: string; he: string } }[];

      return {
        slug: db.slug,
        name: { en: db.name_en, he: db.name_he },
        price: { ils: db.price_monthly, usd: db.price_usd },
        isHighlighted: db.is_highlighted,
        badge: db.badge_en || db.badge_he ? { en: db.badge_en || '', he: db.badge_he || '' } : null,
        stripe_price_id: db.stripe_price_id,
        total_promo_spots: db.total_promo_spots,
        cta: { en: db.cta_en, he: db.cta_he },
        // DB display features for marketing copy
        displayFeatures: db.features_en.length > 0 ? { en: db.features_en, he: db.features_he } : null,
        // Resolved feature descriptions from config as fallback
        configFeatures: resolvedFeatures,
      };
    });
  }, [dbPlans]);

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

  const BOKEH_CIRCLES = [
    { size: 200, top: '5%', left: '8%', color: 'rgba(216,180,180,0.3)', blur: 70, delay: 0 },
    { size: 140, top: '20%', right: '3%', color: 'rgba(201,149,108,0.2)', blur: 60, delay: 1.5 },
    { size: 220, top: '45%', left: '55%', color: 'rgba(216,180,180,0.25)', blur: 80, delay: 0.8 },
    { size: 100, top: '65%', left: '12%', color: 'rgba(201,149,108,0.25)', blur: 65, delay: 2.2 },
    { size: 160, top: '80%', right: '15%', color: 'rgba(216,180,180,0.3)', blur: 70, delay: 1.2 },
    { size: 120, top: '35%', left: '78%', color: 'rgba(201,149,108,0.2)', blur: 60, delay: 3 },
  ];

  return (
    <div
      className="min-h-screen relative overflow-hidden font-['fbahava',sans-serif]"
      dir={isHe ? 'rtl' : 'ltr'}
    >
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
        @keyframes gold-glint {
          0%, 100% { background-position: -200% center; }
          50% { background-position: 200% center; }
        }
        @keyframes metallic-shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>

      {/* Spacer for fixed header */}
      <div className="pt-16" />

      {/* Personal Status Card */}
      {user && (
        <div className="mx-auto px-4 max-w-lg pb-8">
          <div
            className="p-6 space-y-4 text-center"
            style={{
              border: 'none',
              outline: 'none',
              background: 'radial-gradient(ellipse 90% 80% at 50% 45%, rgba(255,255,255,0.45) 0%, rgba(255,240,243,0.25) 40%, rgba(232,160,176,0.08) 70%, transparent 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '48px',
              boxShadow: '0 0 50px rgba(232, 160, 176, 0.18), 0 0 100px rgba(216, 180, 180, 0.1)',
            }}
          >
            <h2
              className="text-xl font-bold leading-relaxed"
              style={{ color: TEXT_DARK, fontFamily: "'FB Ahava', 'Assistant', sans-serif" }}
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
              style={{ border: `1.5px solid ${ROSE_GOLD}`, background: 'transparent', color: ROSE_GOLD_METALLIC }}
              onClick={() => navigate('/payment-history')}
            >
              <Receipt className="w-4 h-4" />
              {t('sub.paymentHistory')}
            </button>
          </div>
        </div>
       )}

      {/* Gold glint divider */}
      <div className="flex justify-center py-6">
        <div
          style={{
            width: '55%',
            height: '2px',
            borderRadius: '1px',
            background: 'linear-gradient(90deg, transparent 0%, #B8860B 20%, #D4AF37 35%, #F9F295 50%, #D4AF37 65%, #B8860B 80%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'gold-glint 4s ease-in-out infinite',
            boxShadow: '0 0 8px rgba(212, 175, 55, 0.4), 0 0 16px rgba(212, 175, 55, 0.15)',
          }}
        />
      </div>

      {/* Header */}
      <div className="pb-6 px-4 flex justify-center">
        <div
          className="p-8 md:p-10 text-center max-w-lg w-full relative overflow-hidden"
          style={{
            border: 'none',
            outline: 'none',
            background: 'radial-gradient(ellipse 90% 80% at 50% 45%, rgba(255,255,255,0.45) 0%, rgba(255,240,243,0.25) 40%, rgba(232,160,176,0.08) 70%, transparent 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '48px',
            boxShadow: '0 0 55px rgba(232, 160, 176, 0.2), 0 0 110px rgba(216, 180, 180, 0.1)',
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="w-5 h-5" style={{ color: ROSE_GOLD_METALLIC }} />
              <h1
                className="text-2xl md:text-4xl font-bold tracking-wider animate-fade-up"
                style={{ color: TEXT_DARK, fontFamily: "'FB Ahava', 'Assistant', sans-serif", animationFillMode: 'both' }}
              >
                {isHe ? 'בחרי את המסלול שמתאים לקליניקה שלך' : 'Choose the Perfect Plan for Your Clinic'}
              </h1>
              <Sparkles className="w-5 h-5" style={{ color: ROSE_GOLD_METALLIC }} />
            </div>
            <p
              className="text-base md:text-lg max-w-xl mx-auto leading-relaxed animate-fade-up"
              style={{ color: TEXT_DARK, animationDelay: '120ms', animationFillMode: 'both', opacity: 0.8 }}
            >
              {isHe ? 'הכלים הדיגיטליים המתקדמים ביותר למאפרות שמכוונות רחוק.' : 'Advanced digital tools for ambitious PMU artists.'}
            </p>
            <div
              className="w-20 h-[2px] mx-auto mt-6 rounded-full animate-fade-up"
              style={{ background: `linear-gradient(90deg, transparent, ${ROSE_GOLD_METALLIC}, transparent)`, animationDelay: '200ms', animationFillMode: 'both' }}
            />
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto px-4 pb-20 flex flex-col items-center max-w-lg">
        {plans.map((plan, idx) => {
          const Icon = iconMap[plan.slug] || Sparkles;
          // Prefer DB display features (richer marketing copy), fallback to config descriptions
          const features = plan.displayFeatures
            ? (isHe ? plan.displayFeatures.he : plan.displayFeatures.en)
            : plan.configFeatures.map(f => isHe ? f.desc.he : f.desc.en);
          const name = isHe ? plan.name.he : plan.name.en;
          const cta = isHe ? plan.cta.he : plan.cta.en;
          const badge = plan.badge ? (isHe ? plan.badge.he : plan.badge.en) : null;
          const isElite = plan.isHighlighted;

          return (
            <>
              {idx > 0 && (
                <div className="flex justify-center py-6 w-full">
                  <div style={{width:'45%',height:'2px',borderRadius:'1px',background:'linear-gradient(90deg, transparent 0%, #B8860B 20%, #D4AF37 35%, #F9F295 50%, #D4AF37 65%, #B8860B 80%, transparent 100%)',backgroundSize:'200% 100%',animation:'gold-glint 4s ease-in-out infinite',boxShadow:'0 0 8px rgba(212,175,55,0.4), 0 0 16px rgba(212,175,55,0.15)'}} />
                </div>
              )}
              <div
                key={plan.slug}
                className="w-full p-8 md:p-10 flex flex-col relative animate-fade-up text-center"
                style={{
                border: 'none',
                outline: 'none',
                background: 'radial-gradient(ellipse 90% 80% at 50% 45%, rgba(255,255,255,0.45) 0%, rgba(255,240,243,0.25) 40%, rgba(232,160,176,0.08) 70%, transparent 100%)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: '48px',
                boxShadow: isElite
                  ? '0 0 60px rgba(232, 160, 176, 0.22), 0 0 120px rgba(216, 180, 180, 0.12)'
                  : '0 0 50px rgba(232, 160, 176, 0.16), 0 0 100px rgba(216, 180, 180, 0.08)',
                animationDelay: `${200 + idx * 100}ms`,
                animationFillMode: 'both',
              }}
            >
              {/* Sparkle decorations */}
              <Sparkles
                className="absolute top-4 start-4 w-4 h-4 opacity-40"
                style={{ color: ROSE_GOLD_METALLIC }}
              />
              <Sparkles
                className="absolute bottom-4 end-4 w-4 h-4 opacity-30"
                style={{ color: ROSE_GOLD_METALLIC }}
              />

              {/* Launch Price Badge */}
              <div
                className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-sm font-black whitespace-nowrap tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #FACC15 0%, #FDE68A 30%, #FCD34D 50%, #FACC15 75%, #EAB308 100%)',
                  color: '#78350F',
                  boxShadow: '0 4px 16px rgba(250, 204, 21, 0.5), 0 1px 4px rgba(0,0,0,0.1)',
                  textShadow: '0 1px 0 rgba(255,255,255,0.4)',
                }}
              >
                🔥 {isHe ? 'מחיר השקה מיוחד!' : 'Special Launch Price!'}
              </div>

              <div className={`flex items-center justify-center gap-2 ${isElite ? 'mt-4' : ''} mb-6`}>
                <PlanTitle slug={plan.slug} name={name} />
                <Icon className="w-5 h-5" style={{ color: '#d8b4b4' }} />
              </div>

              <div className="mb-8">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span
                    className="text-5xl font-serif font-bold"
                    style={{
                      backgroundImage: `url(${roseGoldTexture})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 2px 8px rgba(216, 180, 180, 0.5)) drop-shadow(0 0 4px rgba(201, 160, 160, 0.3))',
                    }}
                  >
                    {isHe ? `₪${plan.price.ils.toLocaleString()}` : `$${plan.price.usd.toLocaleString()}`}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(75, 60, 50, 0.6)' }}>
                    {isHe ? '/ חודש' : '/ month'}
                  </span>
                </div>
              </div>

              <ul className="space-y-0 mb-10 flex-1">
                {features.map((f, i) => (
                  <li key={i}>
                    <div className="flex items-center justify-center gap-3 text-sm py-3" style={{ color: '#4a3636', fontWeight: 500 }}>
                      <span>{f}</span>
                    </div>
                    {i < features.length - 1 && (
                      <div style={{ height: '1px', width: '50%', margin: '0 auto', background: 'rgba(216, 180, 180, 0.2)' }} />
                    )}
                  </li>
                ))}
              </ul>

              {plan.slug === 'master' && plan.total_promo_spots > 0 && (
                <FomoBadge totalSpots={plan.total_promo_spots} takenSpots={vipTaken} isHe={isHe} />
              )}

              {/* Pill CTA button */}
              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center py-4 text-base font-bold transition-all duration-300 active:scale-[0.97] hover:shadow-xl hover:scale-[1.02] hover:translate-y-[-2px]"
                style={{
                  background: 'linear-gradient(145deg, #E8A0B0 0%, #D4838F 100%)',
                  color: '#FFFFFF',
                  borderRadius: '50px',
                  boxShadow: '0 8px 24px rgba(212, 131, 143, 0.35), 0 0 16px rgba(216, 180, 180, 0.25)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {cta}
              </Link>
              </div>
            </>
          );
        })}
      </div>

      {/* Footer links */}
      <div className="mx-auto px-4 pb-6 max-w-lg">
        <div
          className="rounded-2xl p-5 text-center backdrop-blur-xl"
          style={{
            background: GLASS_BG,
            border: GLASS_BORDER,
            boxShadow: GLASS_SHADOW,
          }}
        >
          <p className="text-sm font-medium mb-2" style={{ color: TEXT_DARK }}>
            {isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}
          </p>
          <Link to="/refund-policy" className="text-sm underline hover:opacity-80 transition-opacity font-semibold" style={{ color: ROSE_GOLD_METALLIC }}>
            {isHe ? 'מדיניות ביטולים והחזרים' : 'Cancellation & Refund Policy'}
          </Link>
        </div>
      </div>

      {/* Cancellation & Refund Policy */}
      <div className="mx-auto px-4 pb-20 max-w-lg">
        <div
          className="rounded-2xl p-6 md:p-8 backdrop-blur-xl"
          style={{
            background: GLASS_BG,
            border: GLASS_BORDER,
            boxShadow: GLASS_SHADOW,
          }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold tracking-wider mb-2" style={{ color: TEXT_DARK, fontFamily: "'FB Ahava', 'Assistant', sans-serif" }}>
              {isHe ? 'מדיניות ביטולים והחזרים כספיים' : 'Cancellation & Refund Policy'}
            </h2>
            <div className="w-16 h-[2px] mx-auto mt-3 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${ROSE_GOLD_METALLIC}, transparent)` }} />
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="vip" className="border rounded-xl overflow-hidden backdrop-blur-md" style={{ borderColor: 'rgba(216, 180, 180, 0.3)', background: 'rgba(255,255,255,0.5)' }}>
              <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
                <span className="text-sm font-bold text-start" style={{ color: TEXT_DARK }}>
                  {isHe ? 'מדיניות ביטול מיוחדת למסלול המייסדות (VIP)' : 'Special Cancellation Policy for Founders (VIP)'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: TEXT_DARK }}>
                  <p><strong style={{ color: ROSE_GOLD_METALLIC }}>{isHe ? '14 ימי התנסות ללא סיכון:' : '14-Day Risk-Free Trial:'}</strong>{' '}{isHe ? 'ביטול תוך 14 ימים מיום הרכישה יזכה אותך בהחזר כספי מלא.' : 'Canceling within 14 days of purchase entitles you to a full refund.'}</p>
                  <p><strong style={{ color: ROSE_GOLD_METALLIC }}>{isHe ? 'גמישות מלאה גם בהמשך:' : 'Full Flexibility:'}</strong>{' '}{isHe ? 'ניתן לבטל את המנוי בכל שלב, גם לאחר 14 הימים הראשונים.' : 'You can cancel your subscription at any time, even after the initial 14 days.'}</p>
                  <p><strong style={{ color: ROSE_GOLD_METALLIC }}>{isHe ? 'איך מחושב ההחזר?' : 'How is the refund calculated?'}</strong>{' '}{isHe ? 'במקרה של ביטול לאחר תקופת הניסיון, התקופה שבה השתמשת במערכת תחושב מחדש לפי העלות החודשית הרגילה של מסלול Elite (149 ₪ לחודש). סכום זה יופחת מהתשלום החד-פעמי ששילמת, והיתרה תוחזר אלייך.' : 'If you cancel after the trial period, your usage will be recalculated based on the regular Elite plan monthly rate (149 ILS/month). This amount will be deducted from your one-time payment, and the remaining balance will be refunded to you.'}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="monthly" className="border rounded-xl overflow-hidden backdrop-blur-md" style={{ borderColor: 'rgba(216, 180, 180, 0.3)', background: 'rgba(255,255,255,0.5)' }}>
              <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3">
                <span className="text-sm font-bold text-start" style={{ color: TEXT_DARK }}>
                  {isHe ? 'תנאי ביטול למסלולי Pro ו-Elite (מנוי חודשי)' : 'Cancellation Terms for Pro & Elite (Monthly)'}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5">
                <div className="space-y-4 text-sm leading-relaxed" style={{ color: TEXT_DARK }}>
                  <p><strong style={{ color: ROSE_GOLD_METALLIC }}>ביטול בכל רגע:</strong>{' '}ניתן לבטל את המנוי החודשי בכל עת, ישירות בלחיצת כפתור דרך הגדרות החשבון.</p>
                  <p><strong style={{ color: ROSE_GOLD_METALLIC }}>ללא קנסות יציאה:</strong>{' '}לאחר הביטול, המנוי יישאר פעיל ותמשיכי ליהנות מהמערכת עד סוף תקופת החיוב הנוכחית (סוף החודש שעבורו כבר שילמת). לאחר מכן המנוי יסתיים ולא תחויבי שוב.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
