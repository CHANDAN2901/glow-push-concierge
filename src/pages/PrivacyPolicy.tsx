import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
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
  <div
    className="h-px w-full"
    style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }}
  />
);

const PrivacyPolicy = () => {
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
          <h1
            className="text-2xl font-serif tracking-wide"
            style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}
          >
            {isHe ? 'מדיניות פרטיות' : 'Privacy Policy'}
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
              ? 'ברוכים הבאים ל-Glow Push. אנו מחויבים להגן על פרטיותך. מדיניות זו מסבירה כיצד אנו אוספים ושומרים על המידע של אמני איפור קבוע ("משתמשים") ושל לקוחות הקצה שלהם ("לקוחות").'
              : 'Welcome to Glow Push ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled safely. This Privacy Policy outlines how we collect and protect the information of Permanent Makeup (PMU) Artists ("Users") and their end-clients ("Clients").'}
          </p>

          <Divider />

          <Section title={isHe ? '1. תפקידנו בעיבוד נתונים:' : '1. Our Role in Data Processing:'}>
            <p>
              {isHe
                ? 'תחת חוקי ה-GDPR, אנו משמשים כ"מעבדי נתונים". המאפרת היא "בקרת הנתונים" והיא האחראית לקבלת הסכמה מהלקוחות.'
                : 'Under the GDPR and similar laws, Glow Push acts as a Data Processor. The PMU Artist is the Data Controller, responsible for obtaining necessary client consents.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '2. מידע שאנו אוספים:' : '2. Information We Collect:'}>
            <p>
              {isHe
                ? 'ממשתמשים: פרטי חשבון וחיוב (מעובד בצורה מאובטחת דרך Lemon Squeezy). מלקוחות: שם, טלפון, תמונות פנים, תיעוד טיפולים והצהרות בריאות.'
                : 'From Artists: Account and billing details (processed securely via Lemon Squeezy). From Clients: Name, phone number, facial images, treatment logs, and medical declarations.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '3. שימוש במידע:' : '3. How We Use Information:'}>
            <p>
              {isHe
                ? 'לאחסון מערכת הניהול, אבטחת מידע רפואי, יצירת יומן החלמה דיגיטלי ושליחת הודעות אוטומטיות.'
                : 'To host the digital clinic system, secure health records, generate Digital Recovery Journals, and send automated SMS/WhatsApp aftercare notifications.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '4. שיתוף מידע:' : '4. Data Sharing:'}>
            <p>
              {isHe
                ? 'איננו מוכרים נתונים. המידע משותף רק עם ספקי צד-שלישי מאובטחים הנדרשים להפעלת האפליקציה.'
                : 'We do not sell data. We share information only with trusted, GDPR-compliant third-party APIs needed to operate the app.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '5. אבטחת מידע:' : '5. Data Security:'}>
            <p>
              {isHe
                ? 'אנו משתמשים בהצפנה ואבטחת RLS. כל מאפרת חשופה אך ורק לנתוני הלקוחות שלה.'
                : 'We use high-level encryption and Row Level Security (RLS). An Artist can only access their own Clients\' data.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '6. זכויות פרטיות:' : '6. Your Privacy Rights:'}>
            <p>
              {isHe
                ? 'למשתמשים יש את ה"זכות להישכח". מחיקת חשבון של מאפרת תמחק לצמיתות את כל נתוני הלקוחות המשויכים אליה מהשרתים שלנו.'
                : 'Users and Clients have the right to access, rectify, or request erasure of their data ("Right to be Forgotten"). Users can delete their accounts, which permanently erases associated Client data.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '7. צור קשר:' : '7. Contact Us:'}>
            <p>
              {isHe
                ? 'לכל שאלה בנושא פרטיות: hello@glowpush.app'
                : 'For privacy inquiries, email us at: hello@glowpush.app'}
            </p>
          </Section>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;

