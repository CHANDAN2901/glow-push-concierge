import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import glowPushLogo from '@/assets/glowpush-logo.png';

const PrivacyPolicy = () => {
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
            מדיניות פרטיות
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
            אנו ב-Glow Push מחויבים להגן על הפרטיות של המשתמשים שלנו (מאפרות מקצועיות ואמני איפור קבוע - "המשתמשים") ושל לקוחות הקצה שלהם ("לקוחות הקצה"). מדיניות זו מסבירה איזה מידע אנו אוספים, כיצד אנו משתמשים בו וכיצד אנו שומרים עליו.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              1. המידע שאנו אוספים
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              אנו אוספים מידע בשתי רמות עיקריות:
            </p>
            <ul className="text-sm leading-relaxed list-disc pr-5 space-y-2" style={{ color: 'hsl(0 0% 30%)' }}>
              <li>מידע על המשתמשים (המאפרות): שם, כתובת דוא"ל, ונתוני מינוי. נתוני התשלום מעובדים באופן מאובטח על ידי ספק צד שלישי (Lemon Squeezy) ואינם נשמרים בשרתינו.</li>
              <li>מידע על לקוחות הקצה: פרטי קשר, היסטוריית טיפולים, תמונות (Healing Journal), והצהרות בריאות דיגיטליות (אשר עשויות לכלול מידע רגיש כגון אלרגיות ומצב רפואי).</li>
            </ul>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              2. השימוש במידע
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              המידע נאסף ומשמש אך ורק למטרות הבאות:
            </p>
            <ul className="text-sm leading-relaxed list-disc pr-5 space-y-2" style={{ color: 'hsl(0 0% 30%)' }}>
              <li>מתן השירותים של אפליקציית Glow Push (ניהול תיק לקוח, מעקב החלמה, והתראות).</li>
              <li>אנו לא מוכרים, משכירים או משתפים את המידע האישי או הרפואי של לקוחות הקצה עם צדדים שלישיים למטרות שיווקיות.</li>
            </ul>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              3. אבטחת מידע ואחסון
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              הנתונים מאוחסנים על גבי תשתיות ענן מאובטחות ומוצפנות. על אף אמצעי האבטחה המחמירים שאנו נוקטים, אין מערכת חסינה לחלוטין, והמשתמשים מזינים את המידע באחריותם.
            </p>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              4. תפקידנו – ספק פלטפורמה בלבד
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              Glow Push פועלת כ"מעבדת מידע" (Data Processor) בלבד. המשתמשת (המאפרת) היא "בעלת השליטה במידע" (Data Controller). באחריותה המלאה של המאפרת לקבל את ההסכמה המפורשת מלקוחות הקצה שלה לאיסוף הצהרות הבריאות ולשימוש באפליקציה.
            </p>
          </section>

          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(38 40% 82%), transparent)' }} />

          <section className="space-y-3">
            <h2 className="text-lg font-serif font-medium tracking-wide" style={{ color: '#5C4033' }}>
              5. שירותי צד שלישי וזכויות
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'hsl(0 0% 30%)' }}>
              אנו נעזרים בשירותים חיצוניים (כמו שירותי סליקה ודיוור). הודעות הנשלחות מהמערכת יישאו את השם Glow Push. למשתמשים וללקוחות הקצה יש זכות לבקש לעיין במידע, לתקן אותו או לדרוש את מחיקתו (הזכות להישכח).
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

export default PrivacyPolicy;
