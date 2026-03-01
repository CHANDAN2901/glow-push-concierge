import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';
import glowPushLogo from '@/assets/glowpush-logo.png';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
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
            {isHe ? 'עדכון אחרון: 28 בפברואר 2026' : 'Last Updated: February 28, 2026'}
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
              ? 'ברוכים הבאים ל-Glow Push ("אנחנו", "שלנו" או "אותנו"). אנו מחויבים להגנה על פרטיותך ולוודא שהנתונים האישיים שלך מטופלים בצורה בטוחה ואחראית. מדיניות פרטיות זו מפרטת כיצד אנו אוספים, משתמשים ומגינים על המידע של מאפרות ה-PMU המשתמשות בפלטפורמה שלנו ("משתמשות") ושל לקוחותיהן ("לקוחות").'
              : 'Welcome to Glow Push ("we," "our," or "us"). We are committed to protecting your privacy and ensuring that your personal data is handled safely and responsibly. This Privacy Policy outlines how we collect, use, and protect the information of the Permanent Makeup (PMU) Artists who use our platform ("Users") and their end-clients ("Clients").'}
          </p>

          <Divider />

          <Section title={isHe ? '1. תפקידנו בעיבוד נתונים' : '1. Our Role in Data Processing'}>
            <p>
              {isHe
                ? 'על פי תקנת הגנת הנתונים הכללית (GDPR) וחוקי פרטיות דומים, Glow Push פועלת כ-מעבד נתונים. המאפרת (המשתמשת שלנו) היא בעלת השליטה בנתונים. משמעות הדבר היא שהמאפרת אחראית לקבלת ההסכמות הנדרשות מלקוחותיה לאיסוף ואחסון הצהרות רפואיות, תמונות פנים ופרטי קשר בפלטפורמה שלנו.'
                : 'Under the General Data Protection Regulation (GDPR) and similar privacy laws, Glow Push acts as a Data Processor. The PMU Artist (our User) is the Data Controller. This means the Artist is responsible for obtaining the necessary consents from their Clients to collect and store medical declarations, facial images, and contact information on our platform.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '2. מידע שאנו אוספים' : '2. Information We Collect'}>
            <p>
              {isHe
                ? 'ממשתמשות (מאפרות): פרטי חשבון (שם, דוא"ל, פרטי עסק), פרטי חיוב (מעובדים באופן מאובטח דרך ספקי צד שלישי כמו Lemon Squeezy), ונתוני שימוש באפליקציה.'
                : 'From Users (Artists): Account information (name, email, business details), billing information (processed securely via third-party providers like Lemon Squeezy), and app usage data.'}
            </p>
            <p>
              {isHe
                ? 'מלקוחות (באמצעות המאפרות): שם, פרטי קשר (מספר טלפון להודעות SMS/WhatsApp), תמונות פנים (מיפוי לפני/אחרי ותמונות טיפול), יומני טיפול (נוסחאות פיגמנט, תצורות מחטים), ומידע רפואי רגיש הנדרש להצהרות בריאות דיגיטליות (כגון אלרגיות, מצבים רפואיים).'
                : 'From Clients (via Artists): Name, contact details (phone number for SMS/WhatsApp notifications), facial images (before/after mapping and treatment photos), treatment logs (pigment formulas, needle configurations), and sensitive medical information required for Digital Health Declarations (e.g., allergies, medical conditions).'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '3. כיצד אנו משתמשים במידע' : '3. How We Use the Information'}>
            <p>{isHe ? 'אנו משתמשים בנתונים אך ורק לצורך מתן שירות Glow Push. זה כולל:' : 'We strictly use the data to provide the Glow Push service. This includes:'}</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>{isHe ? 'אירוח מערכת ניהול הקליניקה הדיגיטלית.' : 'Hosting the digital clinic management system.'}</li>
              <li>{isHe ? 'אחסון ואבטחת הצהרות בריאות דיגיטליות ורשומות קליניות.' : 'Storing and securing Digital Health Declarations and clinical notes.'}</li>
              <li>{isHe ? 'יצירת יומן ההחלמה הדיגיטלי ללקוחות.' : 'Generating the Digital Recovery Journal for Clients.'}</li>
              <li>{isHe ? 'שליחת הנחיות טיפוח אוטומטיות ותזכורות באמצעות ממשקי תקשורת של צד שלישי (כגון SMS, WhatsApp) בשם המאפרת.' : 'Sending automated aftercare instructions and reminders via third-party communication APIs (e.g., SMS, WhatsApp) on behalf of the Artist.'}</li>
            </ul>
          </Section>

          <Divider />

          <Section title={isHe ? '4. שיתוף נתונים ושירותי צד שלישי' : '4. Data Sharing and Third-Party Services'}>
            <p>
              {isHe
                ? 'אנו לא מוכרים, משכירים או סוחרים בנתונים אישיים. אנו משתפים מידע רק עם ספקי שירות צד שלישי מהימנים הנדרשים להפעלת האפליקציה (כגון מסדי נתונים מאובטחים בענן, ממשקי שליחת הודעות אוטומטיות). כל ספקי צד שלישי נבדקים בקפדנות לעמידה בתקני GDPR ו-CCPA.'
                : 'We do not sell, rent, or trade personal data. We only share information with trusted third-party service providers necessary to operate the app (e.g., secure cloud hosting databases, automated messaging APIs). All third-party providers are strictly vetted for GDPR and CCPA compliance.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '5. אבטחת מידע' : '5. Data Security'}>
            <p>
              {isHe
                ? 'אנו מיישמים אמצעי אבטחה ברמה גבוהה, כולל אבטחה ברמת שורה (RLS) על מסדי הנתונים שלנו והצפנה, כדי להבטיח שגורמים לא מורשים לא יוכלו לגשת לנתונים רפואיים רגישים או לרשומות לקוחות. מאפרת יכולה לגשת רק לנתוני הלקוחות שלה.'
                : 'We implement high-level security measures, including Row Level Security (RLS) on our databases and encryption, to ensure that unauthorized parties cannot access sensitive medical data or client records. An Artist can only access the data of their own Clients.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '6. זכויות הפרטיות שלך (GDPR ו-CCPA)' : '6. Your Privacy Rights (GDPR & CCPA)'}>
            <p>{isHe ? 'בהתאם למיקומך, לך וללקוחותייך יש את הזכויות הבאות:' : 'Depending on your location, you and your Clients have the following rights:'}</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>{isHe ? 'הזכות לגישה: ניתן לבקש עותק של הנתונים האישיים שאנו מחזיקים.' : 'The Right to Access: You can request a copy of the personal data we hold.'}</li>
              <li>{isHe ? 'הזכות לתיקון: ניתן לתקן נתונים שגויים או חלקיים.' : 'The Right to Rectification: You can correct inaccurate or incomplete data.'}</li>
              <li>{isHe ? 'הזכות למחיקה ("הזכות להישכח"): משתמשות יכולות למחוק את חשבונן ישירות מהגדרות האפליקציה, מה שימחק לצמיתות את כל נתוני הלקוחות, התמונות ורשומות הבריאות המשויכים מהשרתים שלנו.' : 'The Right to Erasure ("Right to be Forgotten"): Users can delete their accounts directly within the app\'s settings, which will permanently erase all associated Client data, images, and health records from our servers.'}</li>
              <li>{isHe ? 'הזכות לביטול הסכמה: לקוחות יכולים לבטל את קבלת הודעות SMS/WhatsApp אוטומטיות בכל עת.' : 'The Right to Opt-Out: Clients may opt out of receiving automated SMS/WhatsApp notifications at any time.'}</li>
            </ul>
          </Section>

          <Divider />

          <Section title={isHe ? '7. שמירת נתונים' : '7. Data Retention'}>
            <p>
              {isHe
                ? 'אנו שומרים על נתוני לקוחות והצהרות בריאות כל עוד למאפרת יש חשבון Glow Push פעיל, או כנדרש על פי חוקי אחריות רפואית מקומיים, אלא אם כן הוגשה בקשת מחיקה.'
                : 'We retain Client data and health declarations as long as the Artist maintains an active Glow Push account, or as required by local medical liability laws, unless a deletion request is initiated.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '8. צור קשר' : '8. Contact Us'}>
            <p>
              {isHe
                ? 'אם יש לך שאלות או בקשות בנוגע למדיניות פרטיות זו או לנתונים שלך, ניתן לפנות אלינו:'
                : 'If you have any questions or requests regarding this Privacy Policy or your data, please contact us at:'}
            </p>
            <p>
              <strong>{isHe ? 'דוא"ל:' : 'Email:'}</strong>{' '}
              <a href="mailto:hello@glowpush.app" className="underline" style={{ color: '#D4AF37' }}>
                hello@glowpush.app
              </a>
            </p>
            <p>
              <strong>{isHe ? 'אתר:' : 'Website:'}</strong>{' '}
              <a href="https://www.glowpush.app" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#D4AF37' }}>
                www.glowpush.app
              </a>
            </p>
          </Section>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors font-serif"
            style={{ color: 'hsl(38 40% 45%)' }}
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            {isHe ? 'חזרה לדף הראשי' : 'Back to home'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
