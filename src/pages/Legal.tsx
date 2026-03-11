import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import BackButton from '@/components/BackButton';
import glowPushLogo from '@/assets/glowpush-logo.png';

const Legal = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(38 60% 97%) 100%)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/">
            <img src={glowPushLogo} alt="Glow Push" className="h-14 mx-auto object-contain mb-4" />
          </Link>
          <h1
            className="text-2xl font-serif tracking-wide"
            style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}
          >
            {isHe ? 'תקנון, תנאי שימוש ומדיניות ביטולים' : 'Terms, Conditions & Cancellation Policy'}
          </h1>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 md:p-10 space-y-10"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid hsl(38 40% 82%)',
            boxShadow: '0 8px 40px -12px hsla(38, 55%, 62%, 0.12)',
          }}
          dir={isHe ? 'rtl' : 'ltr'}
        >
          {/* Section 1 – Terms */}
          <section className="space-y-3">
            <h2
              className="text-lg font-serif font-medium tracking-wide"
              style={{ color: '#4a3636' }}
            >
              {isHe ? '📜 תנאי שימוש' : '📜 Terms of Service'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              {isHe
                ? 'המערכת מספקת כלי ניהול למאפרות. השימוש מבוסס על מנוי מתחדש. המידע בטוח ושייך למשתמשת. המערכת אינה מספקת ייעוץ רפואי והאחריות על הטיפול חלה על המאפרת.'
                : 'The system provides management tools for PMU artists. Usage is based on a recurring subscription. Data is secure and belongs to the user. The system does not provide medical advice; responsibility for treatment lies with the artist.'}
            </p>
          </section>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          {/* Section 2 – Cancellation & Refunds */}
          <section className="space-y-3">
            <h2
              className="text-lg font-serif font-medium tracking-wide"
              style={{ color: '#4a3636' }}
            >
              {isHe ? '🔄 מדיניות ביטולים' : '🔄 Cancellation & Refunds'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              {isHe
                ? 'ניתן לבטל את המנוי בכל עת דרך הגדרות החשבון. הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי. לא יינתנו החזרים על חלקי חודש.'
                : 'You can cancel your subscription at any time through account settings. Cancellation takes effect at the end of the current billing cycle. No refunds are given for partial months.'}
            </p>
          </section>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          {/* Section 3 – Contact */}
          <section className="space-y-3">
            <h2
              className="text-lg font-serif font-medium tracking-wide"
              style={{ color: '#5C4033' }}
            >
              {isHe ? '📧 יצירת קשר' : '📧 Contact Us'}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              {isHe
                ? 'ניתן לפנות אלינו בכל עת בכתובת: support@glowpush.com או בוואטסאפ.'
                : 'You can reach us anytime at: support@glowpush.com or via WhatsApp.'}
            </p>
          </section>
        </div>

        {/* Back button */}
        <div className="text-center mt-8">
          <BackButton
            onClick={() => navigate('/')}
            label={isHe ? 'חזרה לדף הראשי' : 'Back to home'}
          />
        </div>
      </div>
    </div>
  );
};

export default Legal;
