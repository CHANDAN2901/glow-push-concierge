import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import glowPushLogo from '@/assets/glowpush-logo.png';

const TermsOfService = () => {
  return (
    <div
      className="min-h-screen py-16 px-4"
      style={{ background: 'linear-gradient(165deg, hsl(0 0% 100%) 0%, hsl(38 60% 97%) 100%)' }}
    >
      <div className="max-w-2xl mx-auto" dir="rtl">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/">
            <img src={glowPushLogo} alt="Glow Push" className="h-14 mx-auto object-contain mb-4" />
          </Link>
          <h1
            className="text-2xl font-serif tracking-wide"
            style={{ color: 'hsl(0 0% 15%)', fontWeight: 300 }}
          >
            תנאי שימוש
          </h1>
          <p className="text-sm mt-2" style={{ color: 'hsl(0 0% 50%)' }}>
            תאריך עדכון אחרון: מרץ 2026
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 md:p-10 space-y-8"
          style={{
            background: '#FFFFFF',
            border: '1.5px solid hsl(38 40% 82%)',
            boxShadow: '0 8px 40px -12px hsla(38, 55%, 62%, 0.12)',
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
            ברוכים הבאים ל-Glow Push. השימוש באפליקציה כפוף לתנאים המפורטים להלן. עצם ההרשמה והשימוש במערכת מהווים הסכמה לתנאים אלו.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              1. מהות השירות
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              Glow Push היא פלטפורמת תוכנה כשירות (SaaS) המיועדת למאפרות מקצועיות ואמני איפור קבוע לצורך ניהול טפסי לקוחות, מעקב החלמה וניהול יומן.
            </p>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              2. היעדר אחריות רפואית ומקצועית (הגבלת אחריות)
            </h2>
            <ul className="text-sm leading-relaxed list-disc pr-5 space-y-2" style={{ color: 'hsl(0 0% 30%)' }}>
              <li>Glow Push היא כלי טכנולוגי וניהולי בלבד. המערכת אינה מספקת ייעוץ רפואי, אסתטי או מקצועי.</li>
              <li>אין ל-Glow Push שום אחריות על טיב הטיפול הניתן ללקוח הקצה, התגובה לפיגמנטים, תהליך ההחלמה, זיהומים, או כל נזק ישיר או עקיף שייגרם ללקוחה בעקבות הטיפול.</li>
              <li>האחריות המלאה והבלעדית על הטיפול, קריאת הצהרות הבריאות ואישורן, חלה על המשתמשת (המאפרת) בלבד.</li>
            </ul>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              3. מנויים, תשלומים ומדיניות ביטולים
            </h2>
            <ul className="text-sm leading-relaxed list-disc pr-5 space-y-2" style={{ color: 'hsl(0 0% 30%)' }}>
              <li>השירות ניתן במודל מנוי חודשי/שנתי. הסליקה מבוצעת באמצעות ספק חיצוני (Lemon Squeezy).</li>
              <li>המשתמשת רשאית לבטל את המנוי בכל עת דרך הגדרות החשבון. הביטול ייכנס לתוקף בסוף מחזור החיוב הנוכחי.</li>
              <li>לא יינתנו החזרים כספיים רטרואקטיביים על תקופת מנוי שנוצלה באופן חלקי, אלא אם נקבע אחרת על פי חוק.</li>
            </ul>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              4. חובות המשתמשת (המאפרת)
            </h2>
            <ul className="text-sm leading-relaxed list-disc pr-5 space-y-2" style={{ color: 'hsl(0 0% 30%)' }}>
              <li>המשתמשת מתחייבת להשתמש במערכת בהתאם לחוק, ולאסוף נתונים מלקוחות הקצה רק לאחר קבלת הסכמה מפורשת ומתועדת.</li>
              <li>חל איסור להשתמש בפלטפורמה להפצת תכנים פוגעניים או זדוניים. Glow Push שומרת לעצמה את הזכות להשעות חשבונות שיפרו תנאים אלו.</li>
            </ul>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              5. שינויים בשירות
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              אנו רשאים לעדכן, לשנות או להפסיק תכונות מסוימות באפליקציה מעת לעת, ונעשה מאמץ לעדכן את המשתמשים על שינויים מהותיים.
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm transition-colors font-serif"
            style={{ color: 'hsl(38 40% 45%)' }}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            חזרה לדף הראשי
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
