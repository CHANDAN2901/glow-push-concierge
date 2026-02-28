import { Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PricingPlan } from '@/hooks/usePricingPlans';

interface Props {
  plan: PricingPlan;
  isHe: boolean;
}

export default function PricingEliteCard({ plan, isHe }: Props) {
  const features = isHe ? plan.features_he : plan.features_en;
  const badge = isHe ? plan.badge_he : plan.badge_en;
  const cta = isHe ? plan.cta_he : plan.cta_en;

  return (
    <div
      className="relative rounded-3xl p-7 md:p-8 flex flex-col animate-fade-up"
      style={{
        background: 'linear-gradient(180deg, #FFFDF5 0%, #FFF8E1 100%)',
        border: '2px solid rgba(212,175,55,0.3)',
        boxShadow: '0 4px 24px -6px rgba(212,175,55,0.15), 0 1px 6px rgba(0,0,0,0.03)',
        animationDelay: '100ms',
        animationFillMode: 'both',
      }}
    >
      {/* Badge */}
      {badge && (
        <span
          className="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
          style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
            color: '#5C4033',
            boxShadow: '0 2px 10px rgba(212,175,55,0.35)',
          }}
        >
          <Star className="w-3 h-3" />
          {badge}
        </span>
      )}

      {/* Icon */}
      <div className="flex justify-center mt-4 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #D4AF37, #F9F295, #D4AF37)', boxShadow: '0 2px 12px rgba(212,175,55,0.3)' }}
        >
          <Star className="w-6 h-6" style={{ color: '#5C4033' }} />
        </div>
      </div>

      <h2 className="text-center font-serif text-xl font-medium tracking-wide mb-1" style={{ color: '#2a2015' }}>
        {isHe ? plan.name_he : plan.name_en}
      </h2>

      {/* Price */}
      <div className="flex items-baseline justify-center gap-1 mb-6">
        <span className="text-4xl font-serif font-bold" style={{ color: '#333' }}>
          {isHe ? `₪${plan.price_monthly}` : `$${plan.price_usd}`}
        </span>
        <span className="text-sm" style={{ color: '#999' }}>
          {isHe ? '/חודש' : '/month'}
        </span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#444' }}>
            <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D4AF37' }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        to="/auth"
        className="w-full inline-flex items-center justify-center py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] hover:shadow-md"
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
}
