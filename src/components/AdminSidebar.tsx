import { LayoutDashboard, Users, Megaphone, Settings, MessageSquareText, Heart, Stethoscope, CreditCard, ClipboardList, Sparkles, Pencil, HelpCircle, Crown, ListChecks, ScrollText, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type AdminView = 'dashboard' | 'users' | 'announcements' | 'pricing' | 'messages' | 'timeline' | 'timeline-content' | 'timeline-settings' | 'aftercare' | 'health-questions' | 'clinic-policy' | 'faq' | 'faq-manager' | 'settings';

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  isAdmin?: boolean;
}

const navItems: { id: AdminView; labelKey: string; icon: React.ElementType; path?: string }[] = [
  { id: 'dashboard', labelKey: 'superAdmin.sidebar.dashboard', icon: LayoutDashboard },
  { id: 'users', labelKey: 'superAdmin.sidebar.users', icon: Users },
  { id: 'announcements', labelKey: 'superAdmin.sidebar.announcements', icon: Megaphone },
  { id: 'pricing', labelKey: 'superAdmin.sidebar.pricing', icon: CreditCard },
  { id: 'messages', labelKey: 'superAdmin.sidebar.messages', icon: MessageSquareText },
  { id: 'timeline', labelKey: 'superAdmin.sidebar.timeline', icon: Heart, path: '/admin/timeline' },
  { id: 'timeline-content', labelKey: 'superAdmin.sidebar.timelineContent', icon: Sparkles, path: '/admin/timeline-content' },
  { id: 'timeline-settings', labelKey: 'superAdmin.sidebar.timelineSettings', icon: Pencil, path: '/admin/timeline-settings' },
  { id: 'aftercare', labelKey: 'superAdmin.sidebar.aftercare', icon: Stethoscope, path: '/admin/aftercare' },
  { id: 'health-questions', labelKey: 'superAdmin.sidebar.healthQuestions', icon: ClipboardList },
  { id: 'clinic-policy', labelKey: 'superAdmin.sidebar.clinicPolicy', icon: ScrollText },
  { id: 'faq', labelKey: 'superAdmin.sidebar.faq', icon: HelpCircle },
  { id: 'faq-manager', labelKey: 'superAdmin.sidebar.faqManager', icon: ListChecks },
  { id: 'settings', labelKey: 'superAdmin.sidebar.settings', icon: Settings },
];

export default function AdminSidebar({ active, onNavigate, isAdmin }: AdminSidebarProps) {
  const { t, dir } = useI18n();
  const visibleItems = isAdmin ? navItems : navItems.filter(item => item.id !== 'faq-manager');
  return (
    <aside dir={dir} className="w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-4rem)] hidden md:block">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Settings className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="font-serif font-bold text-sm">{t('superAdmin.sidebar.brand')}</span>
        </div>
      </div>
      <nav className="p-2 space-y-1">
        {visibleItems.map((item) => {
          const classes = cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
            active === item.id
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          );

          if (item.path) {
            return (
              <Link key={item.id} to={item.path} className={classes}>
                <item.icon className="w-4 h-4" />
                {t(item.labelKey)}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={classes}
            >
              <item.icon className="w-4 h-4" />
              {t(item.labelKey)}
            </button>
          );
        })}

        {/* Logout */}
        <button
          onClick={async () => {
            const savedLang = localStorage.getItem('glow-lang');
            localStorage.clear();
            sessionStorage.clear();
            if (savedLang) localStorage.setItem('glow-lang', savedLang);
            await supabase.auth.signOut();
            window.location.href = '/auth';
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-2"
        >
          <LogOut className="w-4 h-4" />
          {t('superAdmin.sidebar.logout')}
        </button>

        {/* Premium Upgrade Link */}
        <Link
          to="/pricing"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all mt-4"
          style={{
            background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
            border: '1.5px solid rgba(212,175,55,0.4)',
            color: '#B8860B',
            boxShadow: '0 0 12px rgba(212,175,55,0.15)',
          }}
        >
          <Crown className="w-4 h-4" style={{ color: '#D4AF37' }} />
          👑 {t('superAdmin.sidebar.upgrade')}
        </Link>
      </nav>
    </aside>
  );
}
