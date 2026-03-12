import { LayoutDashboard, Users, Megaphone, Settings, MessageSquareText, Heart, Stethoscope, CreditCard, ClipboardList, Sparkles, Pencil, HelpCircle, Crown, ListChecks, ScrollText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type AdminView = 'dashboard' | 'users' | 'announcements' | 'pricing' | 'messages' | 'timeline' | 'timeline-content' | 'timeline-settings' | 'aftercare' | 'health-questions' | 'clinic-policy' | 'faq' | 'faq-manager' | 'settings';

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  isAdmin?: boolean;
}

const navItems: { id: AdminView; label: string; labelHe: string; icon: React.ElementType; path?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', labelHe: 'לוח בקרה', icon: LayoutDashboard },
  { id: 'users', label: 'Users', labelHe: 'משתמשים', icon: Users },
  { id: 'announcements', label: 'Announcements', labelHe: 'הודעות', icon: Megaphone },
  { id: 'pricing', label: 'Plans & Pricing', labelHe: 'חבילות ומחירים', icon: CreditCard },
  { id: 'messages', label: 'Messages', labelHe: 'ניהול הודעות', icon: MessageSquareText },
  { id: 'timeline', label: 'Timeline', labelHe: 'טיימליין החלמה', icon: Heart, path: '/admin/timeline' },
  { id: 'timeline-content', label: 'Timeline Content', labelHe: 'ניהול תכני החלמה', icon: Sparkles, path: '/admin/timeline-content' },
  { id: 'timeline-settings', label: 'Edit Journey', labelHe: 'עריכת מסע החלמה', icon: Pencil, path: '/admin/timeline-settings' },
  { id: 'aftercare', label: 'Aftercare', labelHe: 'הודעות החלמה', icon: Stethoscope, path: '/admin/aftercare' },
  { id: 'health-questions', label: 'Health Questions', labelHe: 'שאלות הצהרת בריאות', icon: ClipboardList },
  { id: 'clinic-policy', label: 'Clinic Policy', labelHe: 'מדיניות קליניקה', icon: ScrollText },
  { id: 'faq', label: 'FAQ & Help', labelHe: 'שאלות ותשובות / עזרה', icon: HelpCircle, path: '/admin/faq' },
  { id: 'faq-manager', label: 'FAQ Manager', labelHe: 'ניהול FAQ לנחיתה', icon: ListChecks, path: '/admin/faq-manager' },
  { id: 'settings', label: 'Settings', labelHe: 'הגדרות', icon: Settings },
];

export default function AdminSidebar({ active, onNavigate, isAdmin }: AdminSidebarProps) {
  const visibleItems = isAdmin ? navItems : navItems.filter(item => item.id !== 'faq-manager');
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card min-h-[calc(100vh-4rem)] hidden md:block">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Settings className="w-4 h-4 text-accent-foreground" />
          </div>
          <span className="font-serif font-bold text-sm">GlowPush Admin</span>
        </div>
      </div>
      <nav className="p-2 space-y-1">
        {visibleItems.map((item) => {
          const classes = cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left',
            active === item.id
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          );

          if (item.path) {
            return (
              <Link key={item.id} to={item.path} className={classes}>
                <item.icon className="w-4 h-4" />
                {item.label}
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
              {item.label}
            </button>
          );
        })}

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
          👑 שדרוג מסלול
        </Link>
      </nav>
    </aside>
  );
}