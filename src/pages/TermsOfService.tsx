import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import BackButton from '@/components/BackButton';
import glowPushLogo from '@/assets/glowpush-logo.png';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#4a3636' }}>
      {title}
    </h2>
    <div className="text-sm leading-relaxed space-y-3" style={{ color: 'hsl(0 0% 30%)' }}>
      {children}
    </div>
  </section>
);

const Divider = () => (
  <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />
);

const TermsOfService = () => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(38 60% 97%) 100%)' }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <Link to="/">
            <img src={glowPushLogo} alt="Glow Push" className="h-14 mx-auto object-contain mb-4" />
          </Link>
          <h1 className="text-2xl font-serif tracking-wide" style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}>
            {isHe ? 'תנאי שימוש' : 'Terms of Service'}
          </h1>
          <p className="text-xs mt-2" style={{ color: 'hsl(0 0% 55%)' }}>
            {isHe ? 'עודכן לאחרונה: 1 במרץ, 2026' : 'Last Updated: March 1, 2026'}
          </p>
        </div>

        <div
          className="rounded-3xl p-8 md:p-10 space-y-8"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid hsl(38 40% 82%)',
            boxShadow: '0 8px 40px -12px hsla(38, 55%, 62%, 0.12)',
          }}
          dir={isHe ? 'rtl' : 'ltr'}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
            {isHe
              ? 'ברוכים הבאים ל-Glow Push. השימוש במערכת מהווה הסכמה לתנאים אלו.'
              : 'Welcome to Glow Push. By using our digital clinic management platform, you agree to these Terms.'}
          </p>

          <Divider />

          <Section title={isHe ? '1. איננו ספק רפואי:' : '1. Not a Medical Provider:'}>
            <p>
              {isHe
                ? 'Glow Push היא פלטפורמה טכנולוגית ואינה מספקת ייעוץ רפואי. האחריות הבלעדית לבדיקת הכשירות הרפואית של הלקוחה והטיפול בה חלה על המאפרת בלבד.'
                : 'Glow Push is a technology platform. We do not provide medical advice. PMU Artists are solely responsible for verifying their clients\' medical suitability and providing appropriate care.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '2. אחריות המשתמש והגבלת אחריות:' : '2. User Responsibilities & Liability:'}>
            <p>
              {isHe
                ? 'Glow Push ומייסדיה לא יישאו בשום אחריות לסיבוכים רפואיים, תגובות אלרגיות, תוצאות טיפול או סכסוכים משפטיים בין המאפרת ללקוחה.'
                : 'Artists must operate in compliance with local laws. Glow Push and its founders shall NOT be held liable for any medical complications, allergic reactions, botched procedures, or legal disputes between Artists and Clients.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '3. מנויים ותשלומים:' : '3. Subscriptions:'}>
            <p>
              {isHe
                ? 'התשלומים והמיסים מנוהלים ונסלקים על ידי חברת Lemon Squeezy.'
                : 'Payments are processed by our Merchant of Record, Lemon Squeezy, which handles billing and taxes.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '4. בעלות על הנתונים:' : '4. Data Ownership:'}>
            <p>
              {isHe
                ? 'הנתונים שייכים למאפרת, אשר מעניקה לנו רישיון לאחסן אותם עבורה במערכת.'
                : 'Artists own their client data but grant Glow Push a license to host it.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '5. סיום התקשרות:' : '5. Account Termination:'}>
            <p>
              {isHe
                ? 'אנו שומרים את הזכות להשעות חשבונות שיפרו תנאים אלו או יעשו שימוש לרעה במערכת ההודעות.'
                : 'We reserve the right to suspend accounts that violate these Terms or misuse the automated messaging features.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '6. צור קשר:' : '6. Contact Us:'}>
            <p>{isHe ? 'hello@glowpush.app' : 'hello@glowpush.app'}</p>
          </Section>
        </div>

      </div>
    </div>
  );
};

export default TermsOfService;

