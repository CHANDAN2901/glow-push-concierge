import { Check, Crown, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PricingPlan } from '@/hooks/usePricingPlans';

interface Props {
  plan: PricingPlan;
  isHe: boolean;
  vipTaken: number;
}

export default function PricingVipCard({ plan, isHe, vipTaken }: Props) {
  const features = isHe ? plan.features_he : plan.features_en;
  const remaining = Math.max(plan.total_promo_spots - vipTaken, 0);

  return (
    <div
      className="relative rounded-3xl flex flex-col animate-fade-up overflow-hidden hd-shimmer-border"
      style={{
        animationDelay: '200ms',
        animationFillMode: 'both',
      }}
    >
      {/* Golden halo border */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37 25%, #F9F295 50%, #D4AF37 75%, #B8860B)',
          padding: '3px',
        }}
      />
      {/* Outer glow */}
      <div
        className="absolute -inset-1 rounded-[1.75rem] pointer-events-none"
        style={{
          background: 'transparent',
          boxShadow: '0 0 40px rgba(212,175,55,0.3), 0 0 80px rgba(212,175,55,0.12)',
        }}
      />

      {/* Inner card */}
      <div
        className="relative rounded-[calc(1.5rem-3px)] p-7 md:p-8 flex flex-col flex-1 m-[3px]"
        style={{
          background: 'linear-gradient(180deg, #FFFEF8 0%, #FFFBEE 40%, #FFFDF5 100%)',
        }}
      >
        {/* Crown icon with radiance */}
        <div className="flex justify-center mt-2 mb-3 relative">
          <div
            className="absolute w-24 h-24 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)',
            }}
          />
          <div
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
              boxShadow: '0 4px 20px rgba(212,175,55,0.45)',
            }}
          >
            <Crown className="w-7 h-7 text-white drop-shadow-sm" />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-center font-serif text-xl font-bold tracking-wide mb-1 bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F9F295 60%, #D4AF37)',
          }}
        >
          {isHe ? 'Glow Push Founders / VIP' : 'Glow Push Founders / VIP'}
        </h2>

        {/* Price */}
        <div className="flex items-baseline justify-center gap-1 mb-5">
          <span
            className="text-4xl font-serif font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F9F295)',
            }}
          >
            {isHe ? `₪${plan.price_monthly.toLocaleString()}` : `$${plan.price_usd.toLocaleString()}`}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: '#B8860B' }}
          >
            {isHe ? '/תשלום חד-פעמי' : '/one-time'}
          </span>
        </div>

        {/* Features – gold tinted */}
        <ul className="space-y-3 mb-5 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm font-medium" style={{ color: '#7a6520' }}>
              <Check className="w-4.5 h-4.5 mt-0.5 shrink-0" style={{ color: '#D4AF37' }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Money-back guarantee */}
        <p
          className="text-center text-sm font-bold mb-5 bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 40%, #F9F295 60%, #D4AF37)',
          }}
        >
          {isHe ? '🛡️ כולל 14 ימי אחריות להחזר כספי' : '🛡️ Includes 14-Day Money-Back Guarantee'}
        </p>

        {/* FOMO bar */}
        {plan.total_promo_spots > 0 && (
          <div
            className="mb-5 rounded-xl px-4 py-3"
            style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              {remaining <= 10 && <Flame className="w-4 h-4 animate-pulse" style={{ color: '#E74C3C' }} />}
              <span
                className="text-xs font-bold"
                style={{ color: remaining <= 10 ? '#C0392B' : '#B8860B' }}
              >
                {isHe
                  ? `נשארו רק ${remaining} מקומות!`
                  : `Only ${remaining} spots left!`}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(212,175,55,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((vipTaken / plan.total_promo_spots) * 100, 100)}%`,
                  background: remaining <= 10
                    ? 'linear-gradient(90deg, #E74C3C, #C0392B)'
                    : 'linear-gradient(90deg, #D4AF37, #F9F295, #D4AF37)',
                }}
              />
            </div>
          </div>
        )}

        {/* CTA – filled gold */}
        <Link
          to="/auth"
          className="btn-metallic-gold w-full inline-flex items-center justify-center gap-2 py-3.5 text-sm font-bold"
        >
          <Crown className="w-4 h-4" />
          {isHe ? 'הבטיחי את מקומך כמייסדת' : 'Secure Your Founding Spot'}
        </Link>
      </div>
    </div>
  );
}
