import { useState, useEffect } from 'react';
import { Search, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FaqCategory = 'client_app' | 'general' | 'photos';

const CATEGORIES: { key: FaqCategory; tKey: string }[] = [
  { key: 'client_app', tKey: 'faq.cat.client_app' },
  { key: 'general', tKey: 'faq.cat.general' },
  { key: 'photos', tKey: 'faq.cat.photos' },
];

const categorizeFaq = (q: string): FaqCategory => {
  const lower = q.toLowerCase();
  if (lower.includes('לקוח') || lower.includes('client') || lower.includes('אפליקציה') || lower.includes('app') || lower.includes('קישור') || lower.includes('link') || lower.includes('התחבר') || lower.includes('connect') || lower.includes('הורד') || lower.includes('download') || lower.includes('פוש') || lower.includes('push') || lower.includes('התראות') || lower.includes('notification'))
    return 'client_app';
  if (lower.includes('תמונ') || lower.includes('photo') || lower.includes('קולאז') || lower.includes('collage') || lower.includes('גלריה') || lower.includes('gallery') || lower.includes('לוגו') || lower.includes('logo'))
    return 'photos';
  return 'general';
};

interface FaqItem {
  q: string;
  a: string;
  cat?: string;
}

const FALLBACK_FAQ: Record<'he' | 'en', FaqItem[]> = {
  he: [
    { q: 'האם הלקוחה צריכה להוריד אפליקציה שתופסת מקום בטלפון?', a: 'ממש לא! Glow Push עובדת בטכנולוגיית רשת. הלקוחה מקבלת ממך לינק אישי בוואטסאפ. כשהיא תפתח אותו, המערכת תציע לה לשמור את האפליקציה על מסך הבית כדי לקבל התראות פוש (Push), ללא צורך בהורדה מחנות האפליקציות.' },
    { q: 'איך הלקוחה שלי מתחברת לאפליקציה כדי לקבל התראות?', a: 'ברגע שאת מוסיפה לקוחה, נשלח אליה קישור אישי בוואטסאפ. כשהיא תפתח אותו, המערכת תציע לה לשמור את Glow Push כאפליקציה על מסך הבית שלה. ברגע שהיא מאשרת, היא תוכל לקבל ממך התראות פוש (Push) על כל שלב קריטי בהחלמה, וליצור קולאז׳ים אישיים בקלות.' },
    { q: 'האם אני יכולה לשנות את הטיפים של Glow Push?', a: 'בוודאי! בהגדרות "ניהול תכני החלמה" את יכולה לערוך כל טקסט, טיפ או שלב כדי שיתאימו בדיוק לשיטת העבודה שלך.' },
    { q: 'איך אני שומרת קולאז׳ לטלפון שלי?', a: 'בתוך גלריית הלקוחה, לחצי על "צור קולאז׳". לאחר שהקולאז׳ מוכן, לחצי על כפתור "שמור לגלריה" והתמונה תרד ישירות למכשיר שלך.' },
    { q: 'האם הלקוחה רואה את כל התמונות שאני מעלה?', a: 'כן, הגלריה מסונכרנת. כל תמונה שתעלי לתיק הלקוחה תופיע גם אצלה, כדי שהיא תוכל לעקוב אחרי ההתקדמות שלה.' },
    { q: 'מה קורה אם לקוחה מחקה בטעות את ההודעה ואיבדה את הקישור שלה?', a: 'פשוט מאוד. היכנסי לכרטיס הלקוחה שלה באזור הניהול, ולחצי על כפתור "שלחי קישור התחברות". הלינק יישלח אליה שוב מיד.' },
    { q: 'איך עובד מנגנון "חברה מביאה חברה"?', a: 'במסך הראשי יש לך כפתור ייעודי. לחיצה עליו תייצר לך קישור אישי שאותו תוכלי לשלוח לחברות למקצוע. ברגע שחברה נרשמת דרך הקישור שלך, המערכת תזהה זאת אוטומטית ושתיכן תתוגמלו בהטבה!' },
    { q: 'מי יכול לראות את תמונות ההחלמה של הלקוחות שלי?', a: 'הפרטיות היא מעל הכל. התמונות מאובטחות וגלויות אך ורק לך (המאפרת) וללקוחה עצמה. אף לקוחה אחרת לא יכולה לראות גלריה שאינה שלה.' },
    { q: 'איך הלוגו שלי מופיע על הקולאז׳ים?', a: 'בהגדרות הפרופיל שלך תוכלי להעלות את לוגו הקליניקה. ברגע שהוא מוזן למערכת, Glow Push "תטביע" אותו אוטומטית ובצורה יוקרתית על כל קולאז׳ שתייצרי דרך האפליקציה.' },
  ],
  en: [
    { q: 'Does the client need to download an app that takes up phone storage?', a: 'Not at all! Glow Push runs on web technology. Your client receives a personal link via WhatsApp. When she opens it, the system will offer to save the app to her home screen to receive push notifications — no app store download needed.' },
    { q: 'How does my client connect to the app to receive notifications?', a: 'Once you add a client, a personal link is sent to her via WhatsApp. When she opens it, the system offers to save Glow Push as an app on her home screen. Once she approves, she can receive push notifications about every critical healing stage and easily create personal collages.' },
    { q: 'Can I customize the Glow Push tips?', a: 'Absolutely! In the "Healing Content Management" settings, you can edit every text, tip, or step to match your exact workflow.' },
    { q: 'How do I save a collage to my phone?', a: 'Inside the client gallery, tap "Create Collage." Once the collage is ready, tap the "Save to Gallery" button and the image will download directly to your device.' },
    { q: 'Can the client see all the photos I upload?', a: 'Yes, the gallery is synced. Every photo you upload to the client's file will also appear on her end, so she can track her progress.' },
    { q: 'What happens if a client accidentally deletes the message and loses her link?', a: 'Very simple. Go to her client card in the management area and tap the "Send Login Link" button. The link will be sent to her again immediately.' },
    { q: 'How does the "Refer a Friend" feature work?', a: 'On the main screen you have a dedicated button. Tapping it generates a personal link you can share with fellow professionals. Once a friend signs up through your link, the system detects it automatically and both of you receive a reward!' },
    { q: 'Who can see my clients\u2019 healing photos?', a: 'Privacy comes first. Photos are secured and visible only to you (the artist) and the client herself. No other client can view a gallery that isn\u2019t hers.' },
    { q: 'How does my logo appear on collages?', a: 'In your profile settings you can upload your clinic logo. Once it\u2019s in the system, Glow Push will automatically stamp it elegantly on every collage you create through the app.' },
  ],
};

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const { lang, t } = useI18n();
  const isHe = lang === 'he';
  const [dbFaqs, setDbFaqs] = useState<FaqItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('client_app');

  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data && data.length > 0) {
        setDbFaqs(
          data.map((f) => ({
            q: isHe ? f.question_he : (f.question_en || f.question_he),
            a: isHe ? f.answer_he : (f.answer_en || f.answer_he),
            cat: f.category,
          }))
        );
      }
      setLoaded(true);
    };
    fetchFaqs();
  }, [isHe]);

  const faqItems: FaqItem[] = dbFaqs.length > 0 ? dbFaqs : FALLBACK_FAQ[lang];

  const filtered = faqItems
    .filter((item) => (item.cat ? item.cat === activeCategory : categorizeFaq(item.q) === activeCategory))
    .filter(
      (item) =>
        !search || item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="min-h-screen bg-background" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08))',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 4px 20px -4px rgba(212,175,55,0.2)',
            }}
          >
            <HelpCircle className="w-7 h-7" style={{ color: '#D4AF37' }} />
          </div>
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('faq.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('faq.subtitle')}
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-300 active:scale-95"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #B8860B, #D4AF37)',
                  color: '#fff',
                  boxShadow: '0 4px 16px -4px rgba(212,175,55,0.45)',
                } : {
                  background: 'transparent',
                  color: '#D4AF37',
                  border: '1.5px solid rgba(212,175,55,0.4)',
                }}
              >
                {t(cat.tKey)}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute ${isHe ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4 h-4`} style={{ color: '#D4AF37' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('faq.search')}
            className={`w-full ${isHe ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 rounded-2xl text-sm outline-none transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(212,175,55,0.3)]`}
            style={{
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(212,175,55,0.2)',
              boxShadow: '0 2px 12px -4px rgba(212,175,55,0.1)',
            }}
          />
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-4">
          {filtered.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 group data-[state=open]:shadow-[0_8px_32px_-8px_rgba(212,175,55,0.25)]"
              style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(212,175,55,0.2)',
                boxShadow: '0 4px 20px -6px rgba(212,175,55,0.12), 0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <AccordionTrigger
                className="px-5 py-4.5 text-sm font-semibold hover:no-underline text-start transition-colors duration-200 [&[data-state=open]]:text-[#B8860B] [&>svg]:hidden"
                style={{ color: '#3a3a3a', fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <div className="flex items-center gap-3.5 w-full">
                  <div className="relative shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 overflow-hidden group-data-[state=open]:rotate-45" style={{ borderColor: 'rgba(212,175,55,0.4)' }}>
                    <div className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-data-[state=open]:opacity-100" style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)' }} />
                    <span className="relative z-10 text-base font-light leading-none transition-all duration-300 group-data-[state=open]:text-white" style={{ color: '#D4AF37' }}>+</span>
                  </div>
                  <span className="flex-1 leading-relaxed">{item.q}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 text-sm leading-relaxed" style={{ color: '#666' }}>
                <div className="pt-3 border-t" style={{ borderColor: 'rgba(212,175,55,0.12)' }}>
                  {item.a}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {`${t('faq.noResults')} "${search}"`}
          </p>
        )}
      </div>
    </div>
  );
}
