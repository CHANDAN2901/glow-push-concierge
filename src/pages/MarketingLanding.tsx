import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Globe } from 'lucide-react';

interface FaqItem {
  id: string;
  question_he: string;
  answer_he: string;
  question_en: string;
  answer_en: string;
}

const MarketingLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const isHe = lang === 'he';
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question_he, answer_he, question_en, answer_en')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => { if (data) setFaqs(data); });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 text-center space-y-8" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Language toggle */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setLang(isHe ? 'en' : 'he')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/80 backdrop-blur-sm transition-all hover:opacity-80 active:scale-95"
          style={{ color: 'hsl(30 10% 45%)', border: '1px solid hsl(38 30% 82%)' }}
        >
          <Globe className="w-3.5 h-3.5" />
          {isHe ? 'EN' : 'HE'}
        </button>
      </div>
      {/* Logo Section */}
      <div className="space-y-2">
        <h1
          className="text-5xl italic"
          style={{
            fontFamily: "'Dancing Script', cursive",
            background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(184, 134, 11, 0.3))',
          }}
        >
          Glow Push
        </h1>
        <p className="text-lg tracking-[0.25em] uppercase" style={{ color: '#999' }}>
          העוזרת הדיגיטלית הצמודה לאמני איפור קבוע
        </p>
      </div>

      {/* Hero Box */}
      <div
        className="rounded-2xl p-10 max-w-md"
        style={{
          border: '3px solid transparent',
          backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: '0 6px 24px rgba(212, 175, 55, 0.18)',
        }}
      >
        <h2 className="text-2xl font-medium text-center" style={{ color: '#333', lineHeight: '2.2' }}>
          מסע החלמה חכם ללקוחות האיפור הקבוע שלך –{' '}
          <br />
          <span className="font-bold">לקחת אותן יד ביד עד לתוצאה המושלמת.</span>
        </h2>
      </div>

      {/* Description Text */}
      <div className="max-w-sm space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: '#888' }}>
          <span className="font-bold" style={{ color: '#666' }}>Glow Push</span> המערכת המקצועית הראשונה ששולחת אוטומטית תזכורות, הנחיות טיפול ושלבי קילוף ישירות לוואטסאפ של הלקוחה – ממש כאילו את איתה 24/7.
        </p>
        <p className="text-xs" style={{ color: '#aaa' }}>
          בנוסף: הצהרות בריאות דיגיטליות מותאמות לתקנון, כרטיס ביקור יוקרתי, וגלריית עבודות חכמה.
        </p>
      </div>

      {/* Features List – Asymmetrical Gold Lines */}
      <div className="max-w-md w-full space-y-8">
        {[
          'כרטיס דיגיטלי מהמם',
          'הצהרת בריאות מעוצבת',
          'סיכום טיפול ותיעוד ב-AI',
          'גלריה לפני ואחרי אצל כל לקוחה',
          'יומן תזכורות וימי הולדת',
          'ליווי החלמה אוטומטי',
        ].map((item, i) => (
          <div key={i} className="group flex flex-col items-center gap-2 cursor-default">
            {/* Top line – short, from right */}
            <div className="w-full flex justify-end">
              <span
                className="block h-[1px] w-[35%] transition-all duration-500 group-hover:w-[45%] group-hover:shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                style={{ background: 'linear-gradient(to left, #D4AF37, #F9F295, transparent)' }}
              />
            </div>

            <span
              className="text-base font-medium tracking-wide transition-colors duration-300 group-hover:text-[#B8860B]"
              style={{ color: '#444' }}
            >
              {item}
            </span>

            {/* Bottom line – longer, from left */}
            <div className="w-full flex justify-start">
              <span
                className="block h-[1px] w-[55%] transition-all duration-500 group-hover:w-[65%] group-hover:shadow-[0_0_8px_rgba(212,175,55,0.5)]"
                style={{ background: 'linear-gradient(to right, #D4AF37, #F9F295, transparent)' }}
              />
            </div>
          </div>
        ))}

        <p
          className="text-sm leading-relaxed pt-6 text-center font-medium"
          style={{ color: '#888' }}
        >
          הכל כדי שנוכל לתת פוש לעסק, דברים שאין לנו זמן בשבילם והם הכי חשובים למיתוג יוקרה ושימור.
        </p>
      </div>

      {/* FAQ Section */}
      <div className="max-w-lg w-full space-y-4">
        <h3
          className="text-2xl font-medium text-center mb-6"
          style={{
            fontFamily: "'Dancing Script', cursive",
            background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          שאלות נפוצות
        </h3>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border-0 mb-3 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.04), rgba(184,134,11,0.06))',
                border: '1px solid rgba(212,175,55,0.15)',
              }}
            >
              <AccordionTrigger
                className="px-5 py-4 text-sm font-medium hover:no-underline text-right [&>svg]:text-[#D4AF37]"
                style={{ color: '#444' }}
              >
                {faq.question_he}
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 text-sm leading-relaxed" style={{ color: '#777' }}>
                {faq.answer_he}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Call to Action Button */}
      <Button
        onClick={() => navigate(user ? '/artist' : '/auth?mode=signup')}
        className="font-semibold py-6 px-12 rounded-full text-lg border-0 tracking-wide"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37)',
          color: '#5C4033',
          boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
        }}
      >
        {user ? 'לקליניקה שלי →' : 'התנסות בחינם ללא התחייבות ←'}
      </Button>
    </div>
  );
};

export default MarketingLanding;
