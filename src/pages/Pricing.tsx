import { Check, Crown, Star, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { usePricingPlans, useVipTakenCount, type PricingPlan } from '@/hooks/usePricingPlans';
import PricingEliteCard from '@/components/pricing/PricingEliteCard';
import PricingVipCard from '@/components/pricing/PricingVipCard';

const Pricing = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const { data: plans = [], isLoading } = usePricingPlans();
  const { data: vipTaken = 0 } = useVipTakenCount();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF9E6 40%, #FFFDF5 100%)' }}>
        <div className="animate-pulse text-muted-foreground font-serif">טוען...</div>
      </div>
    );
  }

  const elitePlan = plans.find(p => p.slug === 'elite');
  const vipPlan = plans.find(p => p.slug === 'vip-3year');

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      dir={isHe ? 'rtl' : 'ltr'}
      style={{
        background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF9E6 30%, #FFFCF0 60%, #FFFDF5 100%)',
      }}
    >
      {/* Ambient gold light trails */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, rgba(212,175,55,0.4) 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <div className="relative pt-16 pb-8 text-center px-4">
        <div
          className="inline-block rounded-2xl px-8 py-4 mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(184,134,11,0.08), rgba(212,175,55,0.12), rgba(184,134,11,0.08))',
            border: '1px solid rgba(212,175,55,0.2)',
          }}
        >
          <h1
            className="text-2xl md:text-4xl font-serif font-light tracking-wider"
            style={{ color: '#2a2015' }}
          >
            {isHe ? 'חבילות ומחירים' : 'Packages & Pricing'}
          </h1>
        </div>
        <div
          className="w-16 h-[2px] mx-auto mt-4 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
        />
      </div>

      {/* Cards grid – side by side */}
      <div className="relative mx-auto px-4 pb-16 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {elitePlan && (
            <PricingEliteCard plan={elitePlan} isHe={isHe} />
          )}
          {vipPlan && (
            <PricingVipCard plan={vipPlan} isHe={isHe} vipTaken={vipTaken} />
          )}
        </div>
      </div>

      <p className="relative text-center text-xs pb-10 px-4" style={{ color: '#bbb' }}>
        {isHe ? 'כל המסלולים כוללים 14 יום ניסיון חינם · ביטול בכל עת' : 'All plans include a 14-day free trial · Cancel anytime'}
      </p>
    </div>
  );
};

export default Pricing;
