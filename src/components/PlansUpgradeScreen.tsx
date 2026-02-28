import { Check, Crown, Sparkles, ArrowRight, MessageCircle, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onBack: () => void;
  currentTier?: string;
}

const BASIC_FEATURES_HE = [
  'ניהול יומן ולקוחות מלא',
  'הצהרות בריאות דיגיטליות ללא הגבלה',
  'התראות push! אוטומטיות ללקוחה (ימים 1, 4, 10)',
  'שליחה ידנית לוואטסאפ בלחיצת כפתור',
];
const BASIC_FEATURES_EN = [
  'Full calendar & client management',
  'Unlimited digital health declarations',
  'Automatic push! notifications (Days 1, 4, 10)',
  'One-tap manual WhatsApp sending',
];

const PRO_FEATURES_HE = [
  'כל מה שיש ב-Basic',
  'אוטומציית וואטסאפ מלאה: ההודעות נשלחות לבד בלי שתצטרכי ללחוץ על כלום',
  'עד 200 הודעות בחודש (עם אפשרות להגדלה)',
  'תמיכת VIP אישית',
];
const PRO_FEATURES_EN = [
  'Everything in Basic',
  'Full WhatsApp automation: messages send automatically',
  'Up to 200 messages/month (expandable)',
  'Personal VIP support',
];

export default function PlansUpgradeScreen({ onBack, currentTier }: Props) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';

  const basicFeatures = isHe ? BASIC_FEATURES_HE : BASIC_FEATURES_EN;
  const proFeatures = isHe ? PRO_FEATURES_HE : PRO_FEATURES_EN;

  const handleUpgrade = () => {
    toast({ title: isHe ? 'מעבירים אותך לתשלום מאובטח... 🔒' : 'Redirecting to secure checkout... 🔒' });
    // Stripe/payment integration placeholder
  };

  return (
    <div className="space-y-6 animate-fade-up pb-10" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-accent/10 transition-all shrink-0"
        >
          <ArrowRight className={`w-5 h-5 text-foreground ${isHe ? '' : 'rotate-180'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">
            {isHe ? 'המסלול שלך להצלחה' : 'Your Path to Success'}
          </h1>
          <p className="text-xs text-foreground/60 mt-0.5">
            {isHe ? 'בחרי את החבילה המתאימה לך' : 'Choose the right plan for you'}
          </p>
        </div>
      </div>

      {/* ── Basic Plan Card ── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base">Glow Basic</h2>
            <p className="text-xs text-muted-foreground">
              {isHe ? 'כלול במנוי' : 'Included in Subscription'}
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {basicFeatures.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-accent" />
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">{f}</p>
            </div>
          ))}
        </div>

        {currentTier !== 'master' && (
          <div className="text-center pt-1">
            <span className="text-xs text-muted-foreground">
              {isHe ? 'החבילה הנוכחית שלך' : 'Your current plan'}
            </span>
          </div>
        )}
      </div>

      {/* ── Pro Plan Card ── */}
      <div
        className="rounded-2xl border-2 p-5 space-y-4 relative overflow-hidden"
        style={{
          borderColor: '#D4AF37',
          background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--pink)) 100%)',
          boxShadow: '0 6px 30px -6px rgba(212, 175, 55, 0.2)',
        }}
      >
        {/* Badge */}
        <div className="absolute top-0 left-0 right-0 flex justify-center">
          <span
            className="px-4 py-1 text-[11px] font-bold rounded-b-xl"
            style={{
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
              color: '#fff',
            }}
          >
            {isHe ? '⭐ הכי פופולרי' : '⭐ Most Popular'}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
          >
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base">Glow Automation Pro</h2>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span
                className="text-xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
              >
                49 ₪
              </span>
              <span className="text-xs text-foreground/50">
                {isHe ? 'לחודש' : '/month'}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {proFeatures.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
              >
                <Check className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm text-foreground font-medium leading-relaxed">{f}</p>
            </div>
          ))}
        </div>

        {/* WhatsApp automation visual */}
        <div
          className="rounded-xl p-3 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.2)' }}
        >
          <MessageCircle className="w-5 h-5 shrink-0" style={{ color: '#25d366' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">
              {isHe ? 'אוטומציה מלאה' : 'Full Automation'}
            </p>
            <p className="text-[10px] text-foreground/60">
              {isHe ? 'ההודעות נשלחות אוטומטית ללקוחות שלך' : 'Messages are sent automatically to your clients'}
            </p>
          </div>
          <Zap className="w-4 h-4 text-accent shrink-0" />
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          className="w-full py-4 rounded-2xl text-base font-bold border border-[#D4AF37]/30 transition-all active:scale-[0.97] hover:shadow-lg flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
            color: '#5C4033',
            boxShadow: '0 4px 20px -4px rgba(212, 175, 55, 0.4)',
          }}
        >
          <Crown className="w-5 h-5" />
          {isHe ? 'שדרגי עכשיו לאוטומציה מלאה' : 'Upgrade to Full Automation'}
        </button>
      </div>

      {/* Fine print */}
      <p className="text-center text-[10px] text-muted-foreground leading-relaxed px-4">
        {isHe
          ? 'ביטול בכל עת. תשלום מאובטח דרך Stripe. ללא התחייבות.'
          : 'Cancel anytime. Secure payment via Stripe. No commitment.'}
      </p>
    </div>
  );
}
