import { useState } from 'react';
import { Crown, Bell, MessageCircle, Zap, Check, Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Props {
  hasWhatsAppAutomation: boolean;
  userTier: 'lite' | 'professional' | 'master';
  onRequestUpgrade?: () => void;
}

export default function NotificationUpgradeSection({ hasWhatsAppAutomation, userTier, onRequestUpgrade }: Props) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';

  const features = isHe
    ? [
        'הודעות וואטסאפ אוטומטיות ביום 1, 4, 10',
        'עד 200 הודעות בחודש',
        'ללא צורך בלחיצה ידנית — הכל אוטומטי',
        'תזכורות טאצ׳ אפ ביום 30',
        'סטטיסטיקות שליחה ופתיחה',
      ]
    : [
        'Automated WhatsApp messages on Day 1, 4, 10',
        'Up to 200 messages per month',
        'No manual clicks needed — fully automated',
        'Touch-up reminders on Day 30',
        'Send & open statistics',
      ];

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
      {/* Decorative shimmer line */}
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
            {isHe ? 'רוצה שהודעות הוואטסאפ יישלחו ללקוחות שלך באופן אוטומטי לחלוטין? שדרגי למסלול VIP.' : 'Want WhatsApp messages sent to your clients fully automatically? Upgrade to VIP.'}
          </p>
        </div>
      </div>

      {/* Current mode indicator */}
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

      {/* Benefits list */}
      <div className="space-y-2.5 mb-5">
        {features.map((text, i) => (
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

      {/* CTA */}
      <button
        onClick={() => {
          if (onRequestUpgrade) onRequestUpgrade();
          else navigate('/pricing');
        }}
        className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg btn-jewel-gold"
      >
        <Crown className="w-4 h-4" />
        {isHe ? 'שדרגי עכשיו ב-49 ₪ לחודש' : 'Upgrade Now — ₪49/month'}
      </button>

      <p className="text-center text-[10px] text-muted-foreground mt-2">
        {isHe ? 'ביטול בכל עת · ללא התחייבות · מעבר למכסה, ניתן לרכוש חבילות נוספות' : 'Cancel anytime · No commitment · Extra packages available beyond quota'}
      </p>
    </div>
  );
}
