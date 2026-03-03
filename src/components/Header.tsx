import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { ChevronRight, Globe } from 'lucide-react';

/** 
 * Maps route paths to screen titles (Hebrew + English).
 * This header is shown on all sub-screens (not on /, /artist, /client, /health-declaration, /marketing).
 */
const ROUTE_TITLES: Record<string, { he: string; en: string }> = {
  '/pricing': { he: 'חבילות ומחירים', en: 'Plans & Pricing' },
  '/auth': { he: 'התחברות', en: 'Sign In' },
  '/super-admin': { he: 'לוח ניהול', en: 'Admin Panel' },
  '/admin/aftercare': { he: 'הודעות החלמה', en: 'Aftercare Messages' },
  '/admin/timeline': { he: 'טיימליין החלמה', en: 'Healing Timeline' },
  '/admin/timeline-content': { he: 'ניהול תכני החלמה', en: 'Timeline Content' },
  '/admin/timeline-settings': { he: 'עריכת מסע ההחלמה', en: 'Edit Healing Journey' },
  '/admin/faq': { he: 'שאלות ותשובות', en: 'FAQ' },
  '/digital-card': { he: 'כרטיס דיגיטלי', en: 'Digital Card' },
  '/client-profile': { he: 'פרופיל לקוחה', en: 'Client Profile' },
  '/reset-password': { he: 'איפוס סיסמה', en: 'Reset Password' },
  '/legal': { he: 'תנאי שימוש', en: 'Legal' },
  '/debug-test': { he: 'דיבאג', en: 'Debug' },
};

const HIDDEN_ROUTES = ['/', '/artist', '/client', '/health-declaration', '/client-form', '/declaration', '/marketing', '/home'];

const Header = () => {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  if (HIDDEN_ROUTES.includes(location.pathname) || location.pathname.startsWith('/c/')) return null;

  const titleObj = ROUTE_TITLES[location.pathname];
  const title = titleObj ? (lang === 'he' ? titleObj.he : titleObj.en) : '';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg"
      style={{
        background: 'hsla(0, 0%, 100%, 0.92)',
        borderBottom: '1.5px solid hsl(38 30% 82%)',
      }}
      dir="rtl"
    >
      <div className="flex items-center w-full h-14 px-4 relative">
        {/* Right side (RTL): Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm transition-all active:scale-95 shadow-sm z-20"
          style={{
            background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))',
            color: '#fff',
            border: '1px solid hsl(38 40% 50%)',
            boxShadow: '0 2px 8px hsl(38 55% 62% / 0.25)',
          }}
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          <span>{lang === 'he' ? 'חזרה' : 'Back'}</span>
        </button>

        {/* Center: Screen title */}
        {title && (
          <h1
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-bold whitespace-nowrap"
            style={{ color: 'hsl(30 15% 22%)' }}
          >
            {title}
          </h1>
        )}

        {/* Left side (RTL): language toggle */}
        <button
          onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80 active:scale-95"
          style={{ color: 'hsl(30 10% 45%)', border: '1px solid hsl(38 30% 82%)' }}
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'he' ? 'EN' : 'HE'}
        </button>
      </div>
    </header>
  );
};

export default Header;
