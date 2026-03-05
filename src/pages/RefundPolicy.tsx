import { useI18n } from '@/lib/i18n';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ScrollText } from 'lucide-react';

const RefundPolicy = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowRight className="w-4 h-4" style={{ transform: isHe ? undefined : 'rotate(180deg)' }} />
          {isHe ? 'חזרה' : 'Back'}
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="w-6 h-6 text-accent" />
          <h1 className="text-2xl md:text-3xl font-serif font-light tracking-wider text-foreground">
            {isHe ? 'מדיניות ביטולים והחזרים' : 'Cancellation & Refund Policy'}
          </h1>
        </div>
        <div
          className="w-20 h-[2px] rounded-full mb-10"
          style={{ background: 'linear-gradient(90deg, hsl(38 55% 62%), hsl(40 50% 72%), transparent)' }}
        />

        {/* Scrollable content area */}
        <div
          className="rounded-2xl border border-border bg-card p-6 md:p-8 max-h-[65vh] overflow-y-auto"
          style={{ boxShadow: '0 4px 24px -6px hsla(0, 0%, 0%, 0.06)' }}
        >
          {isHe ? (
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed space-y-6" dir="rtl">
              <h2 className="text-lg font-bold text-foreground">1. תקופת ניסיון</h2>
              <p>כל המסלולים כוללים 14 ימי ניסיון חינם. ביטול תוך תקופת הניסיון יזכה בהחזר כספי מלא, ללא שאלות.</p>

              <h2 className="text-lg font-bold text-foreground">2. מנויים חודשיים (Pro / Elite)</h2>
              <p>ניתן לבטל את המנוי החודשי בכל עת, ישירות דרך הגדרות החשבון. לאחר הביטול, המנוי יישאר פעיל עד סוף תקופת החיוב הנוכחית. לא יבוצע חיוב נוסף.</p>

              <h2 className="text-lg font-bold text-foreground">3. מסלול מייסדות (VIP)</h2>
              <p>ביטול תוך 14 ימים מיום הרכישה — החזר כספי מלא.</p>
              <p>ביטול לאחר 14 ימים — התקופה בה השתמשת תחושב לפי התעריף החודשי של מסלול Elite (₪149/חודש). הסכום יופחת מהתשלום החד-פעמי והיתרה תוחזר.</p>

              <h2 className="text-lg font-bold text-foreground">4. אופן קבלת ההחזר</h2>
              <p>החזרים כספיים יבוצעו לאמצעי התשלום המקורי תוך 5-10 ימי עסקים מיום אישור הביטול.</p>

              <h2 className="text-lg font-bold text-foreground">5. יצירת קשר</h2>
              <p>לשאלות או בקשות ביטול, ניתן לפנות אלינו דרך מרכז העזרה באפליקציה או במייל.</p>

              <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                עדכון אחרון: מרץ 2026. GlowPush שומרת לעצמה את הזכות לעדכן מדיניות זו מעת לעת.
              </p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-foreground/90 leading-relaxed space-y-6">
              <h2 className="text-lg font-bold text-foreground">1. Trial Period</h2>
              <p>All plans include a 14-day free trial. Cancel within the trial period for a full refund, no questions asked.</p>

              <h2 className="text-lg font-bold text-foreground">2. Monthly Subscriptions (Pro / Elite)</h2>
              <p>You may cancel your monthly subscription at any time from your account settings. After cancellation, your subscription remains active until the end of the current billing period. No further charges will be made.</p>

              <h2 className="text-lg font-bold text-foreground">3. Founders Plan (VIP)</h2>
              <p>Cancellation within 14 days of purchase — full refund.</p>
              <p>Cancellation after 14 days — the period used will be recalculated at the Elite monthly rate ($39/month). This amount will be deducted from your one-time payment and the balance refunded.</p>

              <h2 className="text-lg font-bold text-foreground">4. Refund Method</h2>
              <p>Refunds are processed to the original payment method within 5-10 business days of cancellation approval.</p>

              <h2 className="text-lg font-bold text-foreground">5. Contact</h2>
              <p>For questions or cancellation requests, reach out via the in-app Help Center or email.</p>

              <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                Last updated: March 2026. GlowPush reserves the right to update this policy from time to time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
