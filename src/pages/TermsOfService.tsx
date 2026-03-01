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
  <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />
);

const TermsOfService = () => {
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
          <h1 className="text-2xl font-serif tracking-wide" style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}>
            {isHe ? 'תנאי שימוש' : 'Terms of Service'}
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
              ? 'ברוכים הבאים ל-Glow Push. תנאי שימוש אלו ("התנאים") מסדירים את השימוש שלך באפליקציית Glow Push, באתר ובשירותים הקשורים (יחד, "השירות"). ביצירת חשבון ובשימוש בשירות, את ("משתמשת" או "מאפרת") מסכימה להיות מחויבת לתנאים אלו.'
              : 'Welcome to Glow Push. These Terms of Service ("Terms") govern your use of the Glow Push application, website, and related services (collectively, the "Service"). By creating an account and using the Service, you ("User" or "Artist") agree to be bound by these Terms.'}
          </p>

          <Divider />

          <Section title={isHe ? '1. תיאור השירות' : '1. Description of Service'}>
            <p>
              {isHe
                ? 'Glow Push מספקת פלטפורמה לניהול קליניקה דיגיטלית וטיפוח לאחר טיפול, המותאמת למאפרות איפור קבוע (PMU) ומיקרופיגמנטציה. השירות כולל תכונות כגון הצהרות בריאות דיגיטליות, רישום פיגמנטים, מיפוי לקוחות והודעות טיפוח אוטומטיות (יומן החלמה דיגיטלי).'
                : 'Glow Push provides a digital clinic management and aftercare platform tailored for Permanent Makeup (PMU) and micropigmentation artists. The Service includes features such as digital health declarations, pigment logging, client mapping, and automated aftercare messaging (Digital Recovery Journal).'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '2. אינו ספק שירותים רפואיים' : '2. Not a Medical Provider'}>
            <p>
              {isHe
                ? 'Glow Push היא פלטפורמה טכנולוגית ולא ספקית שירותי בריאות או רפואה. הצהרות הבריאות הדיגיטליות, תבניות הטיפוח ויומני ההחלמה המסופקים בשירות הם למטרות מידע וניהול בלבד. Glow Push אינה מספקת ייעוץ רפואי. המאפרת היא האחראית הבלעדית לאימות ההתאמה הרפואית של לקוחותיה לטיפולים ולמתן טיפול מקצועי מתאים.'
                : 'Glow Push is a technology platform, not a healthcare or medical provider. The digital health declarations, aftercare templates, and recovery journals provided within the Service are for informational and administrative purposes only. Glow Push does not provide medical advice. The PMU Artist is solely responsible for verifying their clients\' medical suitability for treatments and providing appropriate professional care.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '3. אחריות המשתמשת והגבלת אחריות' : '3. User Responsibilities & Liability'}>
            <p>{isHe ? 'כמאפרת המשתמשת ב-Glow Push, את מסכימה כי:' : 'As an Artist using Glow Push, you agree that:'}</p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>{isHe ? 'את מאפרת PMU מוסמכת/מורשית הפועלת בהתאם לחוקים ולתקנות הבריאות המקומיים.' : 'You are a certified/licensed PMU professional operating in compliance with your local laws and health regulations.'}</li>
              <li>{isHe ? 'את אחראית באופן בלעדי לקבלת הסכמה מדעת מחייבת מבחינה משפטית מלקוחותייך לפני כל פרוצדורה.' : 'You are solely responsible for obtaining legally binding, informed consent from your clients before any procedure.'}</li>
              <li>
                <strong>{isHe ? 'הגבלת אחריות:' : 'Limitation of Liability:'}</strong>{' '}
                {isHe
                  ? 'Glow Push, מייסדיה ושותפיה לא יישאו באחריות לכל נזק ישיר, עקיף או תוצאתי, כולל אך לא מוגבל לסיבוכים רפואיים, תגובות אלרגיות, פרוצדורות כושלות, או סכסוכים משפטיים הנובעים בינך לבין לקוחותייך. את מסכימה לשפות ולהגן על Glow Push מפני כל תביעה שתוגש על ידי לקוחותייך.'
                  : 'Glow Push, its founders, and affiliates shall not be held liable for any direct, indirect, or consequential damages, including but not limited to medical complications, allergic reactions, botched procedures, or legal disputes arising between you and your clients. You agree to indemnify and hold Glow Push harmless against any claims made by your clients.'}
              </li>
            </ul>
          </Section>

          <Divider />

          <Section title={isHe ? '4. מנויים ותשלומים' : '4. Subscriptions and Payments'}>
            <p>
              {isHe
                ? 'תהליך ההזמנה שלנו מתבצע באמצעות המשווק המקוון שלנו, Lemon Squeezy. Lemon Squeezy מטפלת בכל עיבוד התשלומים, חישוב המסים (כולל מע"מ) והנפקת חשבוניות בשמנו. ברכישת מנוי Glow Push, את מסכימה גם לתנאי השימוש ולמדיניות הפרטיות של Lemon Squeezy. מנויים מתחדשים אוטומטית אלא אם בוטלו לפני מחזור החיוב הבא.'
                : 'Our order process is conducted by our online reseller and Merchant of Record, Lemon Squeezy. Lemon Squeezy handles all payment processing, tax calculation (including VAT/Sales Tax), and invoicing on our behalf. By purchasing a Glow Push subscription, you also agree to Lemon Squeezy\'s terms of service and privacy policy. Subscriptions renew automatically unless canceled prior to the next billing cycle.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '5. בעלות על נתונים ופרטיות' : '5. Data Ownership and Privacy'}>
            <p>
              {isHe
                ? <>את שומרת על הבעלות על נתוני הלקוחות והתמונות שאת מעלה. עם זאת, את מעניקה ל-Glow Push רישיון לאחסן ולעבד נתונים אלה לצורך מתן השירות. את אחראית באופן מלא לוודא שאיסוף הנתונים שלך עומד בחוקי הפרטיות המקומיים (כגון GDPR, CCPA). לפרטים נוספים, ניתן לעיין ב-<Link to="/privacy" className="underline font-bold" style={{ color: '#D4AF37' }}>מדיניות הפרטיות</Link> שלנו.</>
                : <>You retain ownership of the client data and images you upload. However, you grant Glow Push a license to host and process this data to provide the Service. You are entirely responsible for ensuring your data collection complies with local privacy laws (e.g., GDPR, CCPA). For more details, please review our{' '}<Link to="/privacy" className="underline font-bold" style={{ color: '#D4AF37' }}>Privacy Policy</Link>.</>}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '6. זמינות השירות ואובדן נתונים' : '6. Service Availability and Data Loss'}>
            <p>
              {isHe
                ? 'למרות שאנו שואפים לזמינות של 100%, Glow Push אינה מתחייבת שהשירות יפעל ללא הפרעות או שגיאות. אנו לא אחראים לאובדן נתונים מקרי (כגון פגישות או רשומות לקוחות שנמחקו). מומלץ למשתמשות לשמור גיבויים עצמאיים של מידע עסקי קריטי.'
                : 'While we strive for 100% uptime, Glow Push does not guarantee that the Service will be uninterrupted or error-free. We are not responsible for accidental data loss (e.g., deleted appointments or client records). Users are encouraged to maintain independent backups of critical business information.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '7. סיום חשבון' : '7. Account Termination'}>
            <p>
              {isHe
                ? 'אנו שומרים לעצמנו את הזכות להשעות או לסיים את חשבונך אם תפרי תנאים אלו, תעסקי בפעילות בלתי חוקית, או תעשי שימוש לרעה בפלטפורמה (כגון שליחת ספאם ללקוחות באמצעות הודעות אוטומטיות).'
                : 'We reserve the right to suspend or terminate your account if you violate these Terms, engage in illegal activities, or misuse the platform (e.g., spamming clients with automated messages).'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '8. שינויים בתנאים' : '8. Changes to the Terms'}>
            <p>
              {isHe
                ? 'אנו עשויים לעדכן תנאים אלו מעת לעת. המשך השימוש בשירות לאחר כל שינוי מהווה את הסכמתך לתנאים החדשים.'
                : 'We may update these Terms from time to time. Continued use of the Service after any changes constitutes your acceptance of the new Terms.'}
            </p>
          </Section>

          <Divider />

          <Section title={isHe ? '9. צור קשר' : '9. Contact Us'}>
            <p>{isHe ? 'אם יש לך שאלות בנוגע לתנאים אלו, ניתן לפנות אלינו:' : 'If you have any questions about these Terms, please contact us at:'}</p>
            <p>
              <strong>{isHe ? 'דוא"ל:' : 'Email:'}</strong>{' '}
              <a href="mailto:support@glowpush.com" className="underline" style={{ color: '#D4AF37' }}>support@glowpush.com</a>
            </p>
            <p>
              <strong>{isHe ? 'אתר:' : 'Website:'}</strong>{' '}
              <a href="https://www.glowpush.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#D4AF37' }}>www.glowpush.com</a>
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

export default TermsOfService;
