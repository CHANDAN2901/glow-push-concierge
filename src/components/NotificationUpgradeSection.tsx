import { Crown, Bell, Zap, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { usePricingPlans } from '@/hooks/usePricingPlans';

interface Props {
  hasWhatsAppAutomation: boolean;
  userTier: 'lite' | 'professional' | 'master';
  onRequestUpgrade?: () => void;
}

export default function NotificationUpgradeSection({ hasWhatsAppAutomation, userTier, onRequestUpgrade }: Props) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';
  const { data: plans = [] } = usePricingPlans();

  // Find the highlighted (elite) plan dynamically for the CTA price
  const elitePlan = plans.find(p => p.is_highlighted) || plans[0];
  const ctaPrice = elitePlan
    ? (isHe ? `${elitePlan.price_monthly} ₪ לחודש` : `₪${elitePlan.price_monthly}/month`)
    : '';

  // Use features from the elite plan if available, fallback to empty
  const features = elitePlan
    ? (isHe ? elitePlan.features_he : elitePlan.features_en)
    : [];

  if (hasWhatsAppAutomation) {
    return (
      <div className="bg-card rounded-3xl border border-accent/20 p-5 shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)]">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-accent">
              {isHe ? 'אוטומציה מלאה פעילה ✅' : 'Full Automation Active ✅'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isHe ? 'הודעות וואטסאפ נשלחות אוטומטית ללקוחותייך' : 'WhatsApp messages are sent automatically to your clients'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-accent/30 p-5 shadow-[0_6px_32px_-8px_hsl(0_0%_0%/0.1)] overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gold-shimmer" />

      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
        >
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-lg text-foreground">
            {isHe ? 'שדרוג לאוטומציה מלאה' : 'Upgrade to Full Automation'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {elitePlan
              ? (isHe ? `שדרגי ל${isHe ? elitePlan.name_he : elitePlan.name_en}` : `Upgrade to ${elitePlan.name_en}`)
              : (isHe ? 'שדרגי עכשיו' : 'Upgrade now')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border mb-4">
        <Bell className="w-4 h-4 text-accent" />
        <div className="flex-1">
          <p className="text-xs font-medium text-foreground">
            {isHe ? 'המצב הנוכחי שלך' : 'Your Current Mode'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {isHe ? '🔔 התראות Push אוטומטיות + וואטסאפ ידני' : '🔔 Auto Push Notifications + Manual WhatsApp'}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mb-5">
        {features.slice(0, 5).map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: 'hsl(38 55% 62% / 0.18)' }}
            >
              <Check className="w-3 h-3 text-accent" />
            </div>
            <p className="text-sm leading-snug text-foreground/80">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          console.log('[NotificationUpgrade] Plan used for CTA:', elitePlan);
          if (onRequestUpgrade) onRequestUpgrade();
          else navigate('/pricing');
        }}
        className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg btn-jewel-gold"
      >
        <Crown className="w-4 h-4" />
        {isHe ? `שדרגי עכשיו ב-${ctaPrice}` : `Upgrade Now — ${ctaPrice}`}
      </button>

      <p className="text-center text-[10px] text-muted-foreground mt-2">
        {isHe ? 'ביטול בכל עת · ללא התחייבות · מעבר למכסה, ניתן לרכוש חבילות נוספות' : 'Cancel anytime · No commitment · Extra packages available beyond quota'}
      </p>
    </div>
  );
}
