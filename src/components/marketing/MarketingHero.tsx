import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface Props {
  isHe: boolean;
  user: User | null;
}

const MarketingHero = ({ isHe, user }: Props) => (
  <section className="relative min-h-[90vh] flex items-center bg-white">
    <div className="container mx-auto px-4 relative z-10 py-32 md:py-44">
      <div className="max-w-3xl mx-auto text-center">

        {/* Logo – shiny metallic gold */}
        <h1
          className="text-6xl md:text-8xl mb-4 animate-fade-up opacity-0"
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontWeight: 700,
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 20%, #F9F295 45%, #FFF8DC 55%, #D4AF37 75%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '2px 2px 0px rgba(184,134,11,0.4), 4px 4px 0px rgba(184,134,11,0.2), 6px 6px 12px rgba(0,0,0,0.15)',
            filter: 'drop-shadow(3px 3px 2px rgba(184,134,11,0.35))',
            letterSpacing: '0.04em',
          }}
        >
          Glow Push
        </h1>

        {/* Slogan */}
        <p
          className="text-lg md:text-xl font-light tracking-[0.25em] mb-16 animate-fade-up opacity-0 delay-100"
          style={{ color: '#888' }}
        >
          {isHe ? 'הפוש שמאחורי הגלואו' : 'The Push Behind The Glow'}
        </p>

        {/* Sub-headline in gold-bordered box */}
        <div
          className="relative inline-block rounded-2xl p-[4px] mb-6 animate-fade-up opacity-0 delay-150 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 25%, #F9F295 50%, #D4AF37 75%, #B8860B 100%)',
          }}
        >
          <div className="bg-white rounded-[14px] px-8 py-6 md:px-12 md:py-8">
            <p
              className="text-2xl md:text-3xl font-sans font-light tracking-wide leading-relaxed"
              style={{ color: '#1a1a1a' }}
            >
              {isHe ? (
                <>מסע החלמה דיגיטלי שלוקח את הלקוחה שלך <span className="text-gold-gradient font-semibold">יד ביד</span>.</>
              ) : (
                <>A Digital Recovery Journey That Holds Your Client's <span className="text-gold-gradient font-semibold">Hand</span>.</>
              )}
            </p>
          </div>
        </div>

        <p className="text-base md:text-lg font-light leading-relaxed mb-12 max-w-2xl mx-auto animate-fade-up opacity-0 delay-200" style={{ color: '#777' }}>
          {isHe
            ? 'המערכת הראשונה ששולחת אוטומטית תזכורות, הנחיות ושלבי קילוף ישירות לוואטסאפ של הלקוחה – ממש כאילו את איתה 24/7. ובנוסף: הצהרות בריאות חכמות, כרטיס ביקור דיגיטלי יוקרתי, וגלריית לקוחות.'
            : 'The first platform that automatically sends reminders and care instructions directly to your client\'s WhatsApp — as if you\'re with her 24/7. Plus: smart health declarations, luxury digital business card, and client gallery.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up opacity-0 delay-300">
          <Link
            to={user ? '/artist' : '/auth'}
            className="btn-metallic-gold inline-flex items-center gap-2 px-10 py-4 text-base shadow-lg"
          >
            {isHe ? 'התחילי עכשיו' : 'Start Now'}
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-10 py-4 text-base font-semibold rounded-full border-2 border-gold bg-white transition-all hover:shadow-gold"
            style={{ color: '#4a3636' }}
          >
            {isHe ? 'פרטים ומחירים' : 'See Pricing'}
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default MarketingHero;
