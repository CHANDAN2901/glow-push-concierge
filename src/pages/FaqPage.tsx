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

const goldColor = 'hsl(38, 65%, 55%)';

const FALLBACK_FAQ_HE = [
  {
    q: 'האם הלקוחה צריכה להוריד אפליקציה שתופסת מקום בטלפון?',
    a: 'ממש לא! Glow Push עובדת בטכנולוגיית רשת. הלקוחה מקבלת ממך לינק אישי בוואטסאפ. כשהיא תפתח אותו, המערכת תציע לה לשמור את האפליקציה על מסך הבית כדי לקבל התראות פוש (Push), ללא צורך בהורדה מחנות האפליקציות.',
  },
  {
    q: 'איך הלקוחה שלי מתחברת לאפליקציה כדי לקבל התראות?',
    a: 'ברגע שאת מוסיפה לקוחה, נשלח אליה קישור אישי בוואטסאפ. כשהיא תפתח אותו, המערכת תציע לה לשמור את Glow Push כאפליקציה על מסך הבית שלה. ברגע שהיא מאשרת, היא תוכל לקבל ממך התראות פוש (Push) על כל שלב קריטי בהחלמה, וליצור קולאז׳ים אישיים בקלות.',
  },
  {
    q: 'האם אני יכולה לשנות את הטיפים של Glow Push?',
    a: 'בוודאי! בהגדרות "ניהול תכני החלמה" את יכולה לערוך כל טקסט, טיפ או שלב כדי שיתאימו בדיוק לשיטת העבודה שלך.',
  },
  {
    q: 'איך אני שומרת קולאז׳ לטלפון שלי?',
    a: 'בתוך גלריית הלקוחה, לחצי על "צור קולאז׳". לאחר שהקולאז׳ מוכן, לחצי על כפתור "שמור לגלריה" והתמונה תרד ישירות למכשיר שלך.',
  },
  {
    q: 'האם הלקוחה רואה את כל התמונות שאני מעלה?',
    a: 'כן, הגלריה מסונכרנת. כל תמונה שתעלי לתיק הלקוחה תופיע גם אצלה, כדי שהיא תוכל לעקוב אחרי ההתקדמות שלה.',
  },
  {
    q: 'מה קורה אם לקוחה מחקה בטעות את ההודעה ואיבדה את הקישור שלה?',
    a: 'פשוט מאוד. היכנסי לכרטיס הלקוחה שלה באזור הניהול, ולחצי על כפתור "שלחי קישור התחברות". הלינק יישלח אליה שוב מיד.',
  },
  {
    q: 'איך עובד מנגנון "חברה מביאה חברה"?',
    a: 'במסך הראשי יש לך כפתור ייעודי. לחיצה עליו תייצר לך קישור אישי שאותו תוכלי לשלוח לחברות למקצוע. ברגע שחברה נרשמת דרך הקישור שלך, המערכת תזהה זאת אוטומטית ושתיכן תתוגמלו בהטבה!',
  },
  {
    q: 'מי יכול לראות את תמונות ההחלמה של הלקוחות שלי?',
    a: 'הפרטיות היא מעל הכל. התמונות מאובטחות וגלויות אך ורק לך (המאפרת) וללקוחה עצמה. אף לקוחה אחרת לא יכולה לראות גלריה שאינה שלה.',
  },
  {
    q: 'איך הלוגו שלי מופיע על הקולאז׳ים?',
    a: 'בהגדרות הפרופיל שלך תוכלי להעלות את לוגו הקליניקה. ברגע שהוא מוזן למערכת, Glow Push "תטביע" אותו אוטומטית ובצורה יוקרתית על כל קולאז׳ שתייצרי דרך האפליקציה.',
  },
];

interface FaqItem {
  q: string;
  a: string;
}

export default function FaqPage() {
  const [search, setSearch] = useState('');
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [dbFaqs, setDbFaqs] = useState<FaqItem[]>([]);
  const [loaded, setLoaded] = useState(false);

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
          }))
        );
      }
      setLoaded(true);
    };
    fetchFaqs();
  }, [isHe]);

  // Use DB FAQs if available, otherwise fallback to hardcoded Hebrew list
  const faqItems: FaqItem[] = dbFaqs.length > 0 ? dbFaqs : (isHe ? FALLBACK_FAQ_HE : FALLBACK_FAQ_HE);

  const filtered = faqItems.filter(
    (item) =>
      item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background" dir={isHe ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ backgroundColor: `${goldColor}15` }}>
            <HelpCircle className="w-7 h-7" style={{ color: goldColor }} />
          </div>
          <h1 className="text-2xl font-serif font-bold">
            {isHe ? 'שאלות ותשובות' : 'Frequently Asked Questions'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isHe ? 'מצאי תשובות לשאלות הנפוצות ביותר' : 'Find answers to the most common questions'}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute ${isHe ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isHe ? 'חיפוש שאלה...' : 'Search questions...'}
            className={`w-full ${isHe ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 rounded-xl border border-border bg-card text-sm outline-none transition-all focus:ring-1`}
            style={{ '--tw-ring-color': goldColor } as React.CSSProperties}
          />
        </div>

        {/* FAQ Accordion */}
        <Accordion type="single" collapsible className="space-y-3">
          {filtered.map((item, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border border-border rounded-xl px-5 overflow-hidden bg-card shadow-sm"
            >
              <AccordionTrigger className="text-sm font-bold text-start py-4 hover:no-underline" style={{ color: goldColor }}>
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            {isHe ? `לא נמצאו תוצאות עבור "${search}"` : `No results found for "${search}"`}
          </p>
        )}
      </div>
    </div>
  );
}
