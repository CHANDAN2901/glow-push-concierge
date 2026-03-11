import { useI18n } from '@/lib/i18n';
import { Link } from 'react-router-dom';
import { Bell, Eye, ShoppingBag, Sparkles, ArrowRight, Droplets, Leaf, Crown, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import glowPushLogo from '@/assets/glowpush-logo.png';

const Landing = () => {
  const { t, lang } = useI18n();
  const { isAdmin } = useAuth();

  const features = [
    {
      icon: Bell,
      emoji: '✨',
      title: lang === 'en' ? 'Smart Reminders' : 'תזכורות חכמות',
      desc: lang === 'en' ? 'So she never forgets a single application.' : 'כדי שלא תשכחי אף מריחה. ✨',
    },
    {
      icon: Eye,
      emoji: '👁️',
      title: lang === 'en' ? 'Visual Tracking' : 'מעקב ויזואלי',
      desc: lang === 'en' ? 'See the change happening day after day.' : 'לראות את השינוי קורה יום אחרי יום. 👁️',
    },
    {
      icon: ShoppingBag,
      emoji: '👑',
      title: lang === 'en' ? 'Recommended Store' : 'חנות המומלצים',
      desc: lang === 'en' ? 'The exact products for a faster recovery.' : 'המוצרים המדויקים להחלמה מהירה. 👑',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(165deg, hsl(350 50% 97%) 0%, hsl(350 50% 93%) 35%, hsl(350 45% 91%) 65%, hsl(0 0% 100%) 100%)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-gold-muted/40 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gold-muted/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold-muted/20 blur-[100px]" />

        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl pt-20 pb-16">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-gold-muted px-6 py-2.5 rounded-full mb-10 animate-fade-up opacity-0">
            <span className="text-sm font-medium text-accent tracking-wide">
              ✨ {lang === 'en' ? 'PMU Aftercare Revolution' : 'המהפכה בליווי אחרי טיפול'} ✨
            </span>
          </div>

          {/* Main Logo */}
          <div className="animate-fade-up opacity-0 delay-100 mb-8">
            <img
              src={glowPushLogo}
              alt="Glow Push"
              className="mx-auto w-64 md:w-80 lg:w-96 drop-shadow-lg"
            />
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl font-serif leading-relaxed mb-12 animate-fade-up opacity-0 delay-200 tracking-wide"
            style={{ color: '#4a3636' }}
          >
            {lang === 'en'
              ? 'Your close companion to perfect results ✨'
              : 'הליווי הצמוד שלך בדרך לתוצאה המושלמת ✨'}
          </p>

          {/* Gold Metallic Button */}
          <div className="flex flex-col items-center gap-5 animate-fade-up opacity-0 delay-300">
            <Link
              to="/client"
              className="inline-flex items-center justify-center gap-3 px-12 py-5 rounded-full text-lg font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)',
                color: '#5C4033',
                boxShadow: '0 6px 24px rgba(191, 149, 63, 0.35), inset 0 1px 0 rgba(252, 246, 186, 0.6)',
                letterSpacing: '0.03em',
              }}
            >
              {lang === 'en' ? 'Enter My Personal Area ✨' : 'כניסה לאזור האישי שלי ✨'}
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-sm text-muted-foreground max-w-md leading-relaxed mt-2">
              {lang === 'en'
                ? 'Save the message I sent you on WhatsApp so you can easily come back here anytime 💖'
                : 'שמרי את ההודעה ששלחתי לך בוואטסאפ, כדי שתוכלי לחזור לכאן בקלות תמיד 💖'}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-medium mb-4 tracking-wide">
              {lang === 'en' ? 'Everything You Need to Heal Beautifully' : 'כל מה שצריך להחלמה מושלמת'}
            </h2>
            <div className="w-16 h-0.5 bg-gold-gradient mx-auto mt-6" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {features.map((feature, i) => (
              <div
                key={i}
                className="bg-card p-10 rounded-2xl border border-border text-center hover:shadow-gold transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-full bg-gold-muted flex items-center justify-center mx-auto mb-6 group-hover:bg-gold-gradient transition-all duration-300">
                  <feature.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors" />
                </div>
                <h3 className="font-serif text-xl font-semibold mb-3">{feature.emoji} {feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 30-Day Timeline */}
      <section className="py-24 bg-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
              {lang === 'en' ? '30 Days of Guided Care' : '30 ימי ליווי צמודים'}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg mt-4">
              {lang === 'en'
                ? 'An interactive guide on her phone that knows exactly what she\'s going through every day.'
                : 'מדריך אינטראקטיבי בטלפון שיודע בדיוק מה היא עוברת בכל יום.'}
            </p>
            <div className="w-16 h-0.5 bg-gold-gradient mx-auto mt-6" />
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="relative mb-16">
              <div className="h-1 bg-border rounded-full" />
              <div className="absolute top-0 left-0 h-1 bg-gold-gradient rounded-full w-full" />
              <div className="absolute -top-2.5 left-0 w-6 h-6 rounded-full bg-gold-gradient border-4 border-background shadow-gold" />
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gold-gradient border-4 border-background shadow-gold" />
              <div className="absolute -top-2.5 right-0 w-6 h-6 rounded-full bg-gold-gradient border-4 border-background shadow-gold" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { day: 1, icon: Droplets, emoji: '✍️', titleEn: 'Immediate Soothing', titleHe: 'הרגעה מיידית', descEn: 'First 24-hour care instructions and what to expect.', descHe: 'הנחיות ל-24 השעות הראשונות ומה לצפות. ✍️' },
                { day: 4, icon: Leaf, emoji: '👄', titleEn: 'Peeling Phase', titleHe: 'שלב הקילופים', descEn: 'How to avoid touching and preserve pigment.', descHe: 'איך לא לגעת ולשמור על הפיגמנט. 👄' },
                { day: 30, icon: Crown, emoji: '👑', titleEn: 'Final Result', titleHe: 'התוצאה הסופית', descEn: 'The final look and long-term preservation tips.', descHe: 'התוצאה הסופית והנחיות לשימור. 👑' },
              ].map((m, i) => (
                <div key={i} className="text-center group">
                  <div className="w-16 h-16 rounded-full bg-gold-muted flex items-center justify-center mx-auto mb-4 group-hover:bg-gold-gradient transition-all duration-300">
                    <m.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors" />
                  </div>
                  <span className="text-sm font-semibold text-accent tracking-wide">
                    {lang === 'en' ? `DAY ${m.day}` : `יום ${m.day}`}
                  </span>
                  <h3 className="font-serif text-lg font-semibold mt-2 mb-2">
                    {lang === 'en' ? m.titleEn : m.titleHe}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lang === 'en' ? m.descEn : m.descHe}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 bg-gradient-to-br from-background to-gold-muted/30">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6 leading-tight">
            {lang === 'en'
              ? 'Your Perfect Results Await ✨'
              : 'התוצאה המושלמת שלך מחכה ✨'}
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            {lang === 'en'
              ? 'Follow your healing journey step by step with personalized daily guidance.'
              : 'עקבי אחרי מסע ההחלמה שלך צעד אחרי צעד עם הנחיות יומיות מותאמות אישית.'}
          </p>
          <Link
            to="/client"
            className="bg-gold-shimmer text-accent-foreground px-10 py-5 rounded-lg text-lg font-semibold inline-flex items-center gap-3 hover:shadow-gold transition-all"
          >
            {lang === 'en' ? 'Enter My Personal Area ✨' : 'כניסה לאזור האישי שלי ✨'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Artist Footer */}
      <footer className="border-t border-border py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="text-gold-gradient font-serif text-2xl font-bold">Glow Push</span>
            <p className="text-sm text-muted-foreground max-w-md">
              {lang === 'en'
                ? 'The premium digital aftercare platform for PMU artists who want to deliver a luxury client experience.'
                : 'הפלטפורמה הדיגיטלית המובילה למאפרות PMU שרוצות להעניק חוויית לקוח ברמה הגבוהה ביותר.'}
            </p>
            <div className="flex gap-6">
              <Link to="/artist" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2 px-4">
                {lang === 'en' ? 'System Management' : 'ניהול מערכת'}
              </Link>
              {isAdmin && (
                <Link to="/super-admin" className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors py-2 px-4">
                  Admin
                </Link>
              )}
            </div>
            <Link to="/legal" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              {lang === 'en' ? 'Terms & Policy' : 'תקנון ותנאי שימוש'}
            </Link>
            <p className="text-xs text-muted-foreground">
              © 2026 Glow Push. {lang === 'en' ? 'All rights reserved.' : 'כל הזכויות שמורות.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
