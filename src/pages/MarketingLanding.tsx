import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';

import heroLogo from '@/assets/glowpush-hero-logo.png';

interface FaqItem {
  id: string;
  question_he: string;
  answer_he: string;
  question_en: string;
  answer_en: string;
}

type FaqCategory = 'client_app' | 'general' | 'photos';

const CATEGORIES: { key: FaqCategory; he: string; en: string }[] = [
  { key: 'client_app', he: 'אפליקציית הלקוחות', en: 'Client App' },
  { key: 'general', he: 'שימוש שוטף', en: 'General Usage' },
  { key: 'photos', he: 'תמונות וקולאז\'', en: 'Photos & Collage' },
];

// Client-side category assignment by keyword matching
const categorizeFaq = (q: string): FaqCategory => {
  const lower = q.toLowerCase();
  // Client app: app, download, connect, push, notifications, link
  if (/לקוח|client|אפליקציה|app|קישור|link|התחבר|connect|הורד|download|פוש|push|התראות|notification|הודעה|message/.test(lower))
    return 'client_app';
  // Photos: photo, collage, gallery, logo, before/after, תמונ, קולאז (with or without geresh)
  if (/תמונ|photo|קולאז|collage|גלריה|gallery|לוגו|logo|לפני ואחרי|before and after/.test(lower))
    return 'photos';
  // Everything else: general usage (tips, health declaration, languages, retention, referral, customize)
  return 'general';
};

const MarketingLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, setLang } = useI18n();
  const isHe = lang === 'he';
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('client_app');

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
      {/* Language toggle – gold circle badge */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setLang(isHe ? 'en' : 'he')}
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold tracking-wide backdrop-blur-sm transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
            color: '#5C4033',
            boxShadow: '0 3px 14px rgba(212,175,55,0.45)',
          }}
        >
          {isHe ? 'EN' : 'עב'}
        </button>
      </div>
      {/* Logo Section */}
      <div className="space-y-3">
        <img
          src={heroLogo}
          alt="Glow Push"
          className="object-contain mx-auto"
          style={{ maxHeight: '130px', filter: 'drop-shadow(0 2px 8px rgba(212,175,55,0.3))' }}
        />
        <p className="text-lg tracking-[0.25em] uppercase" style={{ color: '#999' }}>
          {isHe ? 'העוזרת הדיגיטלית הצמודה לאמני איפור קבוע' : 'The Digital Assistant for PMU Artists'}
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
          {isHe ? (
            <>מסע החלמה חכם ללקוחות האיפור הקבוע שלך –{' '}<br /><span className="font-bold">לקחת אותן יד ביד עד לתוצאה המושלמת.</span></>
          ) : (
            <>A smart healing journey for your PMU clients –{' '}<br /><span className="font-bold">guiding them hand-in-hand to the perfect result.</span></>
          )}
        </h2>
      </div>

      {/* Description Text */}
      <div className="max-w-sm space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: '#888' }}>
          <span className="font-bold" style={{ color: '#666' }}>Glow Push</span>{' '}
          {isHe
            ? 'המערכת המקצועית הראשונה ששולחת אוטומטית תזכורות, הנחיות טיפול ושלבי קילוף ישירות לוואטסאפ של הלקוחה – ממש כאילו את איתה 24/7.'
            : 'The first professional system that automatically sends reminders, care instructions and peeling stages directly to your client\'s WhatsApp — as if you\'re with her 24/7.'}
        </p>
        <p className="text-xs" style={{ color: '#aaa' }}>
          {isHe
            ? 'בנוסף: הצהרות בריאות דיגיטליות מותאמות לתקנון, כרטיס ביקור יוקרתי, וגלריית עבודות חכמה.'
            : 'Plus: digital health declarations, a luxury digital business card, and a smart portfolio gallery.'}
        </p>
      </div>

      {/* Features List – Asymmetrical Gold Lines */}
      <div className="max-w-md w-full space-y-8">
        {(isHe ? [
          'כרטיס דיגיטלי מהמם',
          'הצהרת בריאות מעוצבת',
          'סיכום טיפול ותיעוד ב-AI',
          'גלריה לפני ואחרי אצל כל לקוחה',
          'יומן תזכורות וימי הולדת',
          'ליווי החלמה אוטומטי',
        ] : [
          'Stunning Digital Card',
          'Styled Health Declaration',
          'AI Treatment Summary & Documentation',
          'Before & After Gallery per Client',
          'Reminders & Birthday Calendar',
          'Automated Healing Journey',
        ]).map((item, i) => (
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
          {isHe
            ? 'הכל כדי שנוכל לתת פוש לעסק, דברים שאין לנו זמן בשבילם והם הכי חשובים למיתוג יוקרה ושימור.'
            : 'Everything to give your business a push — the things you don\'t have time for that matter most for premium branding and client retention.'}
        </p>
      </div>

      {/* FAQ Section */}
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h3
            className="text-2xl font-medium"
            style={{
              fontFamily: "'Dancing Script', cursive",
              background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {isHe ? 'שאלות נפוצות' : 'Frequently Asked Questions'}
          </h3>
          <p className="text-xs text-muted-foreground">{isHe ? 'הכל מה שרצית לדעת' : 'Everything you need to know'}</p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-3 flex-wrap" role="tablist" aria-label={isHe ? 'סינון שאלות נפוצות' : 'FAQ category filters'}>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.key)}
                className="min-h-10 px-5 rounded-full text-sm font-bold border transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 45%, #B38728 100%)',
                  color: '#5C4033',
                  border: '1px solid rgba(191,149,63,0.5)',
                  boxShadow: '0 4px 14px -2px rgba(191,149,63,0.45)',
                } : {
                  background: 'transparent',
                  color: '#D4AF37',
                  border: '1.5px solid rgba(212,175,55,0.4)',
                }}
              >
                {isHe ? cat.he : cat.en}
              </button>
            );
          })}
        </div>

        <Accordion type="single" collapsible defaultValue="" className="w-full space-y-4">
          {faqs
            .filter((faq) => categorizeFaq(isHe ? faq.question_he : faq.question_en) === activeCategory)
            .map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className="border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group data-[state=open]:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.25)]"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(212,175,55,0.2)',
                boxShadow: '0 4px 20px -6px rgba(212,175,55,0.12), 0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <AccordionTrigger
                className="px-5 py-4 text-sm font-semibold hover:no-underline text-start transition-colors duration-200 [&[data-state=open]]:text-[#B8860B] [&>svg]:hidden"
                style={{ color: '#3a3a3a', fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="shrink-0 w-7 h-7 rounded-full border border-[rgba(212,175,55,0.4)] flex items-center justify-center transition-all duration-300 group-data-[state=open]:bg-gradient-to-br group-data-[state=open]:from-[#B8860B] group-data-[state=open]:to-[#D4AF37] group-data-[state=open]:border-transparent group-data-[state=open]:rotate-45">
                    <span className="text-sm font-light transition-all duration-300 group-data-[state=open]:text-white" style={{ color: '#D4AF37' }}>+</span>
                  </div>
                  <span className="flex-1">{isHe ? faq.question_he : faq.question_en}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 text-sm leading-relaxed" style={{ color: '#666' }}>
                <div className="pt-1 border-t border-[rgba(212,175,55,0.12)]" style={{ paddingTop: '12px', marginTop: '-4px' }}>
                  {isHe ? faq.answer_he : faq.answer_en}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {faqs.filter((faq) => categorizeFaq(isHe ? faq.question_he : faq.question_en) === activeCategory).length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            {isHe ? 'אין שאלות בקטגוריה זו' : 'No questions in this category'}
          </p>
        )}
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
        {user
          ? (isHe ? 'לקליניקה שלי →' : 'My Clinic →')
          : (isHe ? 'התנסות בחינם ללא התחייבות ←' : 'Try Free — No Commitment ←')}
      </Button>
    </div>
  );
};

export default MarketingLanding;
