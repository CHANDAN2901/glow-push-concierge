import { useState } from 'react';
import { ArrowLeft, HelpCircle, MessageCircle, AlertTriangle, ChevronDown, Send, Headphones, CheckCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const goldColor = 'hsl(38, 65%, 55%)';

const FAQ_ITEMS = [
  {
    q: 'איך מעלים לוגו?',
    a: 'גשי ללשונית "לקוחות" בדשבורד, גללי למטה לאזור "הגדרות סטודיו" והדביקי את כתובת ה-URL של הלוגו שלך. הלוגו יופיע בכרטיס הביקור הדיגיטלי ובטופס הרפואי.',
  },
  {
    q: 'איך שולחים טופס ללקוחה?',
    a: 'בלשונית "לקוחות", לחצי על "הצהרת בריאות" ליד שם הלקוחה. מלאי את הטופס יחד איתה או שלחי לה קישור. הטופס כולל חתימה דיגיטלית ונשמר אוטומטית.',
  },
  {
    q: 'איך משנים סיסמה?',
    a: 'בשלב זה, ניתן לאפס סיסמה דרך מסך ההתחברות — לחצי על "שכחתי סיסמה" והזיני את כתובת המייל שלך. קישור לאיפוס יישלח אלייך.',
  },
  {
    q: 'איך שולחים תזכורת החלמה ללקוחה?',
    a: 'המערכת שולחת תזכורות החלמה וטאצ׳ אפ באופן אוטומטי לכל לקוחה. בלשונית "לקוחות" תוכלי לראות את סטטוס האוטומציה ליד כל לקוחה.',
  },
  {
    q: 'האם הלקוחה צריכה להוריד אפליקציה שתופסת מקום בטלפון?',
    a: 'ממש לא! Glow Push עובדת בטכנולוגיית רשת. הלקוחה מקבלת ממך לינק אישי בוואטסאפ. כשהיא תפתח אותו, המערכת תציע לה לשמור את האפליקציה על מסך הבית כדי לקבל התראות פוש (Push), ללא צורך בהורדה מחנות האפליקציות.',
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

interface Props {
  onClose: () => void;
}

export default function HelpCenter({ onClose }: Props) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const isHe = lang === 'he';

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const SUPPORT_PHONE = '972501234567'; // placeholder — artist will provide real number

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast({ title: isHe ? 'שגיאה בשליחה, נסי שוב' : 'Error submitting, try again', variant: 'destructive' });
      return;
    }
    setSent(true);
    setMessage('');
    toast({ title: isHe ? 'הדיווח נשלח בהצלחה! ✅' : 'Report submitted! ✅' });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-serif font-bold">
            {isHe ? 'מרכז עזרה ותמיכה' : 'Help & Support Center'}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isHe ? 'אנחנו כאן בשבילך 💛' : "We're here for you 💛"}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${goldColor}15` }}>
          <Headphones className="w-5 h-5" style={{ color: goldColor }} />
        </div>
      </div>

      {/* Trust banner */}
      <div className="rounded-xl p-4 text-center" style={{ background: `linear-gradient(135deg, ${goldColor}10, ${goldColor}05)`, border: `1px solid ${goldColor}20` }}>
        <p className="text-sm font-medium" style={{ color: goldColor }}>
          {isHe ? '🛡️ צוות התמיכה שלנו זמין עבורך' : '🛡️ Our support team is available for you'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'זמן מענה ממוצע: עד 24 שעות' : 'Average response time: up to 24 hours'}
        </p>
      </div>

      {/* Section A: FAQ */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5" style={{ color: goldColor }} />
          <h2 className="font-sans font-bold text-sm tracking-wide">
            {isHe ? 'שאלות נפוצות' : 'Frequently Asked Questions'}
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 overflow-hidden">
              <AccordionTrigger className="text-sm font-medium text-start py-4 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Section B: Report a Problem */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5" style={{ color: goldColor }} />
          <h2 className="font-sans font-bold text-sm tracking-wide">
            {isHe ? 'דיווח על בעיה' : 'Report a Problem'}
          </h2>
        </div>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle className="w-10 h-10 mx-auto" style={{ color: goldColor }} />
            <p className="text-sm font-medium">
              {isHe ? 'הדיווח התקבל! הצוות הטכני יטפל בפנייתך בהקדם.' : 'Report received! Our team will handle it soon.'}
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-xs font-medium hover:underline"
              style={{ color: goldColor }}
            >
              {isHe ? 'שלחי דיווח נוסף' : 'Send another report'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isHe ? 'תארי את הבעיה...' : 'Describe the issue...'}
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl text-sm border border-border bg-background resize-none outline-none transition-all focus:ring-1 focus:ring-accent"
              dir={isHe ? 'rtl' : 'ltr'}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{message.length}/1000</span>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || sending || !user}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-accent-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                style={{ background: `linear-gradient(135deg, ${goldColor}, hsl(38, 50%, 70%))` }}
              >
                <Send className="w-4 h-4" />
                {sending
                  ? (isHe ? 'שולחת...' : 'Sending...')
                  : (isHe ? 'שלחי דיווח לצוות הטכני' : 'Send Report')}
              </button>
            </div>
            {!user && (
              <p className="text-xs text-destructive">
                {isHe ? 'יש להתחבר כדי לשלוח דיווח' : 'Please sign in to submit a report'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Section C: Urgent Help */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5" style={{ color: goldColor }} />
          <h2 className="font-sans font-bold text-sm tracking-wide">
            {isHe ? 'עזרה דחופה' : 'Urgent Help'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {isHe
            ? 'צריכה תשובה מיידית? פני אלינו ישירות בוואטסאפ:'
            : 'Need an immediate answer? Contact us directly on WhatsApp:'}
        </p>
        <a
          href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(isHe ? 'היי, אני צריכה עזרה עם האפליקציה GlowPush' : 'Hi, I need help with GlowPush')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle className="w-5 h-5" />
          {isHe ? "צ'אט עם תמיכה (וואטסאפ)" : 'Chat with Support (WhatsApp)'}
        </a>
      </div>

      {/* Footer trust */}
      <p className="text-center text-[11px] text-muted-foreground pb-4">
        {isHe ? 'GlowPush · גרסה 1.0 · כל הזכויות שמורות' : 'GlowPush · Version 1.0 · All rights reserved'}
      </p>
    </div>
  );
}
