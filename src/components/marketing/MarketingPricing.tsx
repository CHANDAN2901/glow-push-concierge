import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Props {
  isHe: boolean;
  user: User | null;
}

const MarketingPricing = ({ isHe, user }: Props) => {
  const features = isHe
    ? [
        'ניהול לקוחות ללא הגבלה',
        'הצהרות בריאות דיגיטליות',
        'גלריה אישית לכל לקוחה',
        'קולאז׳ לפני/אחרי עם AI',
        'מסע החלמה מותאם אישית',
        'תזכורות וואטסאפ אוטומטיות',
        'כרטיס דיגיטלי מקצועי',
        'תמיכה ועדכונים שוטפים',
      ]
    : [
        'Unlimited client management',
        'Digital health declarations',
        'Personal gallery per client',
        'AI-powered Before & After collage',
        'Custom healing journey tracker',
        'Automated WhatsApp reminders',
        'Professional digital card',
        'Ongoing support & updates',
      ];

  return (
    <section id="pricing" className="py-28 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-block bg-white rounded-xl px-8 py-5 shadow-md" style={{ borderRight: '6px solid', borderImage: 'linear-gradient(180deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%) 1' }}>
            <h2 className="text-3xl md:text-5xl font-serif font-light tracking-wider" style={{ color: '#1a1a1a' }}>
              {isHe ? 'מסלול אחד, הכל כלול' : 'One Plan, Everything Included'}
            </h2>
          </div>
          <p className="max-w-xl mx-auto leading-relaxed mt-6" style={{ color: '#666666' }}>
            {isHe
              ? 'ללא חבילות מבלבלות. מחיר אחד פשוט שכולל את הכל.'
              : 'No confusing tiers. One simple price that includes everything.'}
          </p>
        </div>

        {/* Single pricing card */}
        <div className="max-w-md mx-auto">
          <div
            className="relative bg-white rounded-3xl p-10 text-center"
            style={{
              border: '3px solid #D4AF37',
              boxShadow: '0 8px 40px -8px rgba(212, 175, 55, 0.25), 0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            {/* Badge */}
            <span
              className="absolute -top-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full text-sm font-black whitespace-nowrap tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #FACC15 0%, #FDE68A 30%, #FCD34D 50%, #FACC15 75%, #EAB308 100%)',
                color: '#78350F',
                boxShadow: '0 4px 16px rgba(250, 204, 21, 0.5), 0 1px 4px rgba(0,0,0,0.1)',
                textShadow: '0 1px 0 rgba(255,255,255,0.4)',
              }}
            >
              <Star className="w-3.5 h-3.5" />
              {isHe ? '🔥 מחיר השקה מיוחד!' : '🔥 Special Launch Price!'}
            </span>

            <h3 className="font-serif text-3xl font-medium tracking-wide mt-4 mb-2" style={{ color: '#333333' }}>
              GlowPush Premium
            </h3>

            <div className="flex items-baseline justify-center gap-1 mb-8">
              <span className="text-5xl font-serif font-bold" style={{ color: '#333333' }}>$29</span>
              <span style={{ color: '#999999' }}>{isHe ? '/חודש' : '/mo'}</span>
            </div>

            <ul className="space-y-3.5 mb-10 text-start">
              {features.map((feat, j) => (
                <li key={j} className="flex items-start gap-3 text-sm" style={{ color: '#555555' }}>
                  <Check className="w-4.5 h-4.5 mt-0.5 shrink-0 text-gold" />
                  {feat}
                </li>
              ))}
            </ul>

            <Link
              to={user ? '/artist' : '/auth'}
              className="btn-metallic-gold w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-base"
            >
              {isHe ? 'התחילי ניסיון חינם' : 'Start Free Trial'}
            </Link>

            <p className="text-xs mt-4" style={{ color: '#999999' }}>
              {isHe ? '14 יום ניסיון חינם · ביטול בכל עת' : '14-day free trial · Cancel anytime'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MarketingPricing;
