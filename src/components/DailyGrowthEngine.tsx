import { Gift, RefreshCw, Star, MessageCircle } from 'lucide-react';
import HelpTooltip from '@/components/HelpTooltip';
import { isRenewalDue } from '@/components/RenewalMessageDialog';

interface ClientEntry {
  dbId?: string;
  name: string;
  phone: string;
  email?: string;
  day: number;
  treatment: string;
  link: string;
  beforeImg: string;
  afterImg: string;
  pushOptedIn?: boolean;
  birthDate?: string | null;
}

interface DailyGrowthEngineProps {
  clients: ClientEntry[];
  artistName: string;
  lang: 'en' | 'he';
  onBirthdayClick: (client: ClientEntry) => void;
  onRenewalClick: (client: ClientEntry) => void;
  reviewTemplate?: string;
  reviewTemplateEn?: string;
}

/** Resolve both {{placeholder}} and [PLACEHOLDER] formats */
function resolvePlaceholders(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result
      .replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
      .replace(new RegExp(`\\[${key.toUpperCase()}\\]`, 'gi'), value);
  }
  return result;
}

function isBirthdayThisWeek(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false;
  const today = new Date();
  for (let i = 0; i <= 7; i++) {
    const check = new Date(today);
    check.setDate(today.getDate() + i);
    const m = String(check.getMonth() + 1).padStart(2, '0');
    const d = String(check.getDate()).padStart(2, '0');
    if (birthDate.slice(5, 7) === m && birthDate.slice(8, 10) === d) return true;
  }
  return false;
}

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return '972' + digits.slice(1);
  if (!digits.startsWith('972')) return '972' + digits;
  return digits;
};

/* ── Rose-gold outline action button style ── */
const goldButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #d8b4b4',
  color: '#c88c8c',
  boxShadow: 'none',
  borderRadius: '12px',
};

/* ── Clean glassmorphism card wrapper ── */
function GoldCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-shrink-0 w-[280px] rounded-[22px] p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(238, 202, 202, 0.4)',
        boxShadow: '10px 10px 25px rgba(180, 110, 110, 0.08), -5px -5px 15px rgba(255, 255, 255, 0.8)',
      }}
    >
      {children}
    </div>
  );
}

export default function DailyGrowthEngine({ clients, artistName, lang, onBirthdayClick, onRenewalClick, reviewTemplate, reviewTemplateEn }: DailyGrowthEngineProps) {
  const birthdayClients = clients.filter(c => isBirthdayThisWeek(c.birthDate));
  const renewalClients = clients.filter(c => isRenewalDue(c.treatment, c.day));
  const reviewClients = clients.filter(c => c.day >= 35 && c.day <= 120);

  const handleReviewWhatsApp = (client: ClientEntry) => {
    const defaultMsgHe = 'היי {{client_name}}! ✨ מקווה שאת מרוצה מהתוצאות! אם יש לך רגע, אשמח מאוד להמלצה קצרה — זה עוזר לנשים נוספות למצוא את הטיפול הנכון. תודה רבה! 💕 — {{artist_name}}';
    const defaultMsgEn = 'Hi {{client_name}}! ✨ I hope you\'re loving your results! If you have a moment, I\'d really appreciate a short review — it helps other women find the right treatment. Thank you so much! 💕 — {{artist_name}}';
    const template = lang === 'en' ? (reviewTemplateEn || defaultMsgEn) : (reviewTemplate || defaultMsgHe);
    const vars = { client_name: client.name, artist_name: artistName || (lang === 'en' ? 'Your artist' : 'האמנית שלך') };
    const msg = resolvePlaceholders(template, vars);
    const cleanPhone = client.phone ? formatPhone(client.phone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  /* Always show all 3 categories */
  const categories = [
    {
      id: 'birthdays',
      emoji: '🎂',
      title: lang === 'en' ? 'Birthdays' : 'ימי הולדת',
      subtitle: lang === 'en' ? 'This week' : 'השבוע',
      emptyText: lang === 'en' ? 'No birthdays this week' : 'אין ימי הולדת השבוע',
      clients: birthdayClients,
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); onBirthdayClick(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={goldButtonStyle}
        >
          <Gift className="w-3 h-3" />
          {lang === 'en' ? 'Send Wish' : 'שלחי ברכה'}
        </button>
      ),
    },
    {
      id: 'renewals',
      emoji: '🔄',
      title: lang === 'en' ? 'Renewals' : 'חידוש טיפול',
      subtitle: lang === 'en' ? 'Due now' : 'הגיע הזמן',
      emptyText: lang === 'en' ? 'No renewals due' : 'אין חידושים כרגע',
      clients: renewalClients,
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); onRenewalClick(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={goldButtonStyle}
        >
          <RefreshCw className="w-3 h-3" />
          {lang === 'en' ? 'Send Reminder' : 'שלחי תזכורת'}
        </button>
      ),
    },
    {
      id: 'reviews',
      emoji: '⭐',
      title: lang === 'en' ? 'Reviews' : 'בקשת המלצה',
      subtitle: lang === 'en' ? 'Ask now' : 'הזמן לבקש',
      emptyText: lang === 'en' ? 'No review candidates' : 'אין לקוחות להמלצה כרגע',
      clients: reviewClients,
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleReviewWhatsApp(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={goldButtonStyle}
        >
          <MessageCircle className="w-3 h-3" />
          {lang === 'en' ? 'Ask Review' : 'בקשי המלצה'}
        </button>
      ),
    },
  ];

  return (
    <div className="animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
      {/* Section title */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #f0c8c8, #d8a0a0)',
            boxShadow: '0 0 14px rgba(216, 180, 180, 0.6), 0 0 28px rgba(216, 160, 160, 0.25)',
          }}
        >
          <Star className="w-4 h-4" style={{ color: '#fff', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-1.5 mb-1" style={{ color: 'hsl(14 29% 30%)', fontFamily: "'FB Ahava', 'Assistant', sans-serif" }}>
            {lang === 'en' ? 'Your Daily Growth Engine' : 'מנוע הצמיחה היומי שלך'}
            <HelpTooltip text="פעולות יומיות קטנות ומוכחות שיעזרו לך למלא את היומן, לשמר לקוחות ולהגדיל הכנסות." id="growth-engine" />
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {lang === 'en' ? 'One-tap actions to grow your business' : 'פעולות בלחיצה אחת להצמחת העסק'}
          </p>
        </div>
      </div>

      {/* Horizontal scrollable — ALL 3 cards always visible */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {categories.map((cat) => (
          <GoldCard key={cat.id}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cat.emoji}</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">{cat.title}</h3>
                <p className="text-[10px] text-muted-foreground">{cat.subtitle} • {cat.clients.length}</p>
              </div>
            </div>

            {cat.clients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{cat.emptyText}</p>
            ) : (
              <div className="space-y-2">
                {cat.clients.slice(0, 3).map((client, i) => (
                  <div
                    key={client.dbId || i}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-muted/50 border border-border/50"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#fff' }}
                    >
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{client.treatment}</p>
                    </div>
                    {cat.renderAction(client)}
                  </div>
                ))}
                {cat.clients.length > 3 && (
                  <p className="text-[10px] text-center text-muted-foreground pt-1">
                    +{cat.clients.length - 3} {lang === 'en' ? 'more' : 'נוספות'}
                  </p>
                )}
              </div>
            )}
          </GoldCard>
        ))}
      </div>
    </div>
  );
}
