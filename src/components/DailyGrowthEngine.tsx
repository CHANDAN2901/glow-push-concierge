import { useState } from 'react';
import { Gift, RefreshCw, Star, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

function isBirthdayToday(birthDate: string | null | undefined): boolean {
  if (!birthDate) return false;
  const today = new Date();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return birthDate.slice(5, 7) === m && birthDate.slice(8, 10) === d;
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

export default function DailyGrowthEngine({ clients, artistName, lang, onBirthdayClick, onRenewalClick }: DailyGrowthEngineProps) {
  const birthdayClients = clients.filter(c => isBirthdayThisWeek(c.birthDate));
  const renewalClients = clients.filter(c => isRenewalDue(c.treatment, c.day));
  // Review requests: clients 35+ days post-treatment (healed, good time to ask)
  const reviewClients = clients.filter(c => c.day >= 35 && c.day <= 120);

  const hasContent = birthdayClients.length > 0 || renewalClients.length > 0 || reviewClients.length > 0;
  if (!hasContent) return null;

  const handleReviewWhatsApp = (client: ClientEntry) => {
    const msg = lang === 'en'
      ? `Hi ${client.name}! ✨ I hope you're loving your results! If you have a moment, I'd really appreciate a short review — it helps other women find the right treatment. Thank you so much! 💕 — ${artistName || 'Your artist'}`
      : `היי ${client.name}! ✨ מקווה שאת מרוצה מהתוצאות! אם יש לך רגע, אשמח מאוד להמלצה קצרה — זה עוזר לנשים נוספות למצוא את הטיפול הנכון. תודה רבה! 💕 — ${artistName || 'האמנית שלך'}`;
    const cleanPhone = client.phone ? formatPhone(client.phone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const categories = [
    {
      id: 'birthdays',
      icon: Gift,
      emoji: '🎂',
      title: lang === 'en' ? 'Birthdays' : 'ימי הולדת',
      subtitle: lang === 'en' ? 'This week' : 'השבוע',
      clients: birthdayClients,
      color: 'hsl(35 90% 55%)',
      bgGradient: 'linear-gradient(135deg, hsl(40 80% 96%), hsl(35 70% 92%))',
      border: 'hsl(35 60% 75%)',
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); onBirthdayClick(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#5C4033', boxShadow: '0 2px 8px rgba(255,165,0,0.25)' }}
        >
          <Gift className="w-3 h-3" />
          {lang === 'en' ? 'Send Wish' : 'שלחי ברכה'}
        </button>
      ),
    },
    {
      id: 'renewals',
      icon: RefreshCw,
      emoji: '🔄',
      title: lang === 'en' ? 'Renewals' : 'חידוש טיפול',
      subtitle: lang === 'en' ? 'Due now' : 'הגיע הזמן',
      clients: renewalClients,
      color: 'hsl(38 55% 62%)',
      bgGradient: 'linear-gradient(135deg, hsl(38 45% 97%), hsl(36 40% 92%))',
      border: 'hsl(38 30% 80%)',
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); onRenewalClick(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={{ background: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)', border: '1.5px solid hsl(38 55% 62%)' }}
        >
          <RefreshCw className="w-3 h-3" />
          {lang === 'en' ? 'Send Reminder' : 'שלחי תזכורת'}
        </button>
      ),
    },
    {
      id: 'reviews',
      icon: Star,
      emoji: '⭐',
      title: lang === 'en' ? 'Reviews' : 'בקשת המלצה',
      subtitle: lang === 'en' ? 'Ask now' : 'הזמן לבקש',
      clients: reviewClients,
      color: 'hsl(45 80% 50%)',
      bgGradient: 'linear-gradient(135deg, hsl(45 60% 97%), hsl(42 50% 92%))',
      border: 'hsl(45 50% 78%)',
      renderAction: (client: ClientEntry) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleReviewWhatsApp(client); }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all active:scale-95"
          style={{ background: '#25D366', color: '#fff', boxShadow: '0 2px 8px rgba(37,211,102,0.25)' }}
        >
          <MessageCircle className="w-3 h-3" />
          {lang === 'en' ? 'Ask Review' : 'בקשי המלצה'}
        </button>
      ),
    },
  ].filter(cat => cat.clients.length > 0);

  if (categories.length === 0) return null;

  return (
    <div className="animate-fade-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
      {/* Section title */}
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', boxShadow: '0 2px 10px rgba(212,175,55,0.35)' }}
        >
          <Star className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-foreground" style={{ fontFamily: 'inherit' }}>
            {lang === 'en' ? 'Your Daily Growth Engine' : 'מנוע הצמיחה היומי שלך'}
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {lang === 'en' ? 'One-tap actions to grow your business' : 'פעולות בלחיצה אחת להצמחת העסק'}
          </p>
        </div>
      </div>

      {/* Horizontal scrollable categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex-shrink-0 w-[280px] rounded-2xl p-4"
            style={{
              background: cat.bgGradient,
              border: `1.5px solid ${cat.border}`,
              boxShadow: '0 4px 20px hsla(38, 40%, 50%, 0.08)',
            }}
          >
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{cat.emoji}</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-foreground">{cat.title}</h3>
                <p className="text-[10px] text-muted-foreground">{cat.subtitle} • {cat.clients.length}</p>
              </div>
            </div>

            {/* Client list (max 3 shown) */}
            <div className="space-y-2">
              {cat.clients.slice(0, 3).map((client, i) => (
                <div
                  key={client.dbId || i}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.04)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37)', color: '#fff' }}
                  >
                    {client.name.charAt(0)}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{client.treatment}</p>
                  </div>
                  {/* Action button */}
                  {cat.renderAction(client)}
                </div>
              ))}
              {cat.clients.length > 3 && (
                <p className="text-[10px] text-center text-muted-foreground pt-1">
                  +{cat.clients.length - 3} {lang === 'en' ? 'more' : 'נוספות'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
