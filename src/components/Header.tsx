import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { LogOut } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const ROUTE_TITLES: Record<string, { he: string; en: string }> = {
  '/pricing': { he: 'חבילות ומחירים', en: 'Plans & Pricing' },
  '/auth': { he: 'התחברות', en: 'Sign In' },
  '/super-admin': { he: 'לוח ניהול', en: 'Admin Panel' },
  '/admin/aftercare': { he: 'הודעות החלמה', en: 'Aftercare Messages' },
  '/admin/timeline': { he: 'טיימליין החלמה', en: 'Healing Timeline' },
  '/admin/timeline-content': { he: 'ניהול תכני החלמה', en: 'Timeline Content' },
  '/admin/timeline-settings': { he: 'עריכת מסע ההחלמה', en: 'Edit Healing Journey' },
  '/admin/faq': { he: 'שאלות ותשובות', en: 'FAQ' },
  '/admin/faq-manager': { he: 'ניהול שאלות נפוצות', en: 'FAQ Manager' },
  '/digital-card': { he: 'כרטיס דיגיטלי', en: 'Digital Card' },
  '/client-profile': { he: 'פרופיל לקוחה', en: 'Client Profile' },
  '/reset-password': { he: 'איפוס סיסמה', en: 'Reset Password' },
  '/legal': { he: 'מדיניות משפטית', en: 'Legal' },
  '/privacy': { he: 'מדיניות פרטיות', en: 'Privacy Policy' },
  '/terms': { he: 'תנאי שימוש', en: 'Terms of Service' },
  '/refund-policy': { he: 'מדיניות ביטולים', en: 'Refund Policy' },
  '/payment-history': { he: 'היסטוריית תשלומים', en: 'Payment History' },
  '/debug-test': { he: 'דיבאג', en: 'Debug' },
};

const HIDDEN_ROUTES = ['/', '/artist', '/client', '/health-declaration', '/client-form', '/declaration', '/marketing', '/home'];

const Header = () => {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showLogout = location.pathname === '/pricing' && !!user;

  if (HIDDEN_ROUTES.includes(location.pathname) || location.pathname.startsWith('/c/')) return null;

  const titleObj = ROUTE_TITLES[location.pathname];
  const title = titleObj ? (lang === 'he' ? titleObj.he : titleObj.en) : '';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-lg"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        borderBottom: '1px solid rgba(216, 180, 180, 0.4)',
      }}
      dir="rtl"
    >
      <div className="relative w-full h-12 px-4 flex items-center justify-center">
        {/* Back button — pinned to left side of screen */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
          <BackButton />
        </div>

        {/* Center: Screen title */}
        {title && (
          <h1
            className="text-sm font-bold whitespace-nowrap"
            style={{ color: '#4a3636', fontFamily: "'Playfair Display', 'FB Ahava', serif" }}
          >
            {title}
          </h1>
        )}

        {/* Right side: logout (pricing only) + language toggle */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
          {showLogout && (
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.35)',
                color: '#8B6508',
              }}
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-extrabold tracking-wide transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 40%, #F9F295 60%, #D4AF37 80%, #B8860B 100%)',
              color: '#4a3636',
              boxShadow: '0 2px 8px rgba(212,175,55,0.35)',
            }}
          >
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
