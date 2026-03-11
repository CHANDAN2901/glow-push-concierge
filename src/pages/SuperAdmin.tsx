import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, DollarSign, TrendingUp, UserPlus,
  Shield, Send, Pencil, Ban, CalendarDays, Eye,
  Settings, Save, Plus, X, MessageSquareText, Heart, Gift,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import AdminSidebar from '@/components/AdminSidebar';
import AdminMessages from '@/components/AdminMessages';
import AdminHealingEditor from '@/components/AdminHealingEditor';
import AdminAftercareEditor from '@/components/AdminAftercareEditor';
import AdminPricingEditor from '@/components/AdminPricingEditor';
import HealthQuestionsEditor from '@/components/HealthQuestionsEditor';
import CouponManager from '@/components/CouponManager';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';

type AdminView = 'dashboard' | 'users' | 'announcements' | 'pricing' | 'messages' | 'timeline' | 'timeline-content' | 'timeline-settings' | 'aftercare' | 'health-questions' | 'faq' | 'faq-manager' | 'settings';

/* ── dummy data ── */
const artists = [
  { id: '1', name: 'Dana Cohen', studio: 'DC Brows', plan: 'master', status: 'active', referrals: 28, revenue: 8400, joinDate: '12/03/2024', waAutomation: true, waUsage: 147 },
  { id: '2', name: 'Maya Levi', studio: 'Glow Beauty', plan: 'professional', status: 'active', referrals: 12, revenue: 3200, joinDate: '05/07/2024', waAutomation: true, waUsage: 82 },
  { id: '3', name: 'Shira Avital', studio: 'Shira PMU', plan: 'professional', status: 'active', referrals: 6, revenue: 1800, joinDate: '19/09/2024', waAutomation: false, waUsage: 0 },
  { id: '4', name: 'Noa Ben David', studio: 'NB Studio', plan: 'lite', status: 'suspended', referrals: 0, revenue: 0, joinDate: '02/01/2025', waAutomation: false, waUsage: 0 },
  { id: '5', name: 'Orit Hadad', studio: 'Beauty Lab TLV', plan: 'professional', status: 'active', referrals: 3, revenue: 960, joinDate: '28/11/2024', waAutomation: false, waUsage: 0 },
];

const revenueChart = [
  { month: 'Sep', revenue: 6200 },
  { month: 'Oct', revenue: 8400 },
  { month: 'Nov', revenue: 9100 },
  { month: 'Dec', revenue: 11300 },
  { month: 'Jan', revenue: 13800 },
  { month: 'Feb', revenue: 15400 },
];

const recentSignups = [
  { name: 'Noa Ben David', date: '02/01/2025' },
  { name: 'Orit Hadad', date: '28/11/2024' },
  { name: 'Shira Avital', date: '19/09/2024' },
  { name: 'Maya Levi', date: '05/07/2024' },
  { name: 'Dana Cohen', date: '12/03/2024' },
];

/* ── helpers ── */
const planBadge = (plan: string) => {
  const styles: Record<string, string> = {
    lite: 'bg-muted text-muted-foreground',
    professional: 'bg-accent/10 text-accent',
    master: 'bg-foreground text-background',
  };
  const labels: Record<string, string> = { lite: 'Lite', professional: 'Pro', master: 'Master' };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[plan]}`}>{labels[plan]}</span>;
};

const statusBadge = (status: string) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
    status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
  }`}>
    {status === 'active' ? 'Active' : 'Suspended'}
  </span>
);

/* ── component ── */
const SuperAdmin = () => {
  const { toast } = useToast();
  const { isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>('dashboard');
  const [termsText, setTermsText] = useState('הריני מאשרת כי כל הפרטים שמסרתי בטופס זה הם נכונים ומדויקים. אני מבינה כי הטיפול מבוצע בהסכמתי המלאה, וכי הוסברו לי הסיכונים האפשריים, תהליך ההחלמה והוראות הטיפול בבית. ידוע לי שתוצאות הטיפול משתנות מאחת לאחת ותלויות גם בסוג העור ובשמירה על ההוראות.');
  const [healthQuestions, setHealthQuestions] = useState([
    'האם את בהריון או מניקה?',
    'האם את נוטלת מדללי דם (אספירין, קומדין) או תרופות באופן קבוע?',
    'האם את סובלת מסוכרת (ובאיזה רמת איזון)?',
    'האם יש לך נטייה להצטלקות (קלואידים) או ריפוי איטי של פצעים?',
    'האם נטלת רואקוטן (Roaccutane) בשנה האחרונה?',
    'האם את משתמשת בתכשירים עם רטינול A או חומצות לפנים?',
    'האם יש לך מחלות מדבקות המועברות בדם (HIV, הפטיטיס)?',
    'האם עברת טיפולי כימותרפיה או הקרנות בחצי השנה האחרונה?',
    'האם את סובלת מאפילפסיה?',
    'האם יש לך קוצב לב או בעיות לבביות?',
    'האם ביצעת הזרקות (בוטוקס/חומצה היאלורונית) באזור הטיפול בחודש האחרון?',
    'האם את סובלת מהרפס (פצעי חום) בשפתיים? (קריטי לטיפולי שפתיים)',
    'האם ידועה רגישות לחומרי אלחוש (לידוקאין), לטקס או מתכות?',
    'האם קיים איפור קבוע ישן באזור הטיפול?',
    'האם שתית אלכוהול או נטלת משככי כאבים ב-24 השעות האחרונות?',
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [upsellTitle, setUpsellTitle] = useState('להשלמת המראה');
  const [upsellDescription, setUpsellDescription] = useState('אהבת את הגבות? הוסיפי הצללת אייליינר ב-15% הנחה');
  const [upsellButtonText, setUpsellButtonText] = useState('למימוש ההטבה');

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const dashboardStats = [
    { icon: DollarSign, label: 'Total Revenue', value: '₪15,400', color: 'text-accent' },
    { icon: Users, label: 'Active Artists', value: '120', color: 'text-accent' },
    { icon: UserPlus, label: 'New This Month', value: '15', color: 'text-green-500' },
    { icon: TrendingUp, label: 'Total Referrals', value: '45', color: 'text-blue-500' },
  ];

  /* ── Dashboard View ── */
  const renderDashboard = () => (
    <>
      {/* stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashboardStats.map((s, i) => (
          <div key={i} className="rounded-xl p-5" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-serif font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* revenue chart */}
        <div className="lg:col-span-2 bg-background border border-border rounded-xl p-5">
          <h2 className="font-serif font-bold text-lg mb-4 text-foreground">Revenue Growth</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueChart}>
              <defs>
                <linearGradient id="goldBronzeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F9F295" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(0 0% 12%)' }} stroke="hsl(0 0% 12%)" />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(0 0% 12%)' }} stroke="hsl(0 0% 12%)" tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip formatter={(v: number) => [`₪${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="url(#goldBronzeGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* recent signups */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-serif font-semibold text-lg mb-4">Last 5 Signups</h2>
          <div className="space-y-3">
            {recentSignups.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-accent">{s.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium">{s.name}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {s.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  /* ── Users View ── */
  const renderUsers = () => (
    <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(216,180,180,0.3)' }}>
        <h2 className="font-serif font-semibold text-lg" style={{ color: '#4a3636' }}>User Management</h2>
        <span className="text-xs" style={{ color: '#8c6a6a' }}>{artists.length} artists</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Artist & Studio</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">WA Auto</TableHead>
              <TableHead className="text-center">WA Usage</TableHead>
              <TableHead className="text-center">Referrals</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artists.map(u => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.studio}</p>
                </TableCell>
                <TableCell>{planBadge(u.plan)}</TableCell>
                <TableCell>{statusBadge(u.status)}</TableCell>
                <TableCell className="text-center">
                  {u.waAutomation ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: 'hsl(38 55% 62% / 0.15)', color: 'hsl(38 40% 45%)' }}>⚡ ON</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {u.waAutomation ? (
                    <span className={`text-xs font-semibold ${u.waUsage > 180 ? 'text-destructive' : 'text-foreground'}`}>
                      {u.waUsage}/200
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center font-medium text-sm">{u.referrals}</TableCell>
                <TableCell className="text-right font-medium text-sm">{u.revenue.toLocaleString()} ₪</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.joinDate}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent" onClick={() => toast({ title: `Simulating login as ${u.name}...` })}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Login as this user</TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Ban className="w-3.5 h-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  /* ── Announcements View ── */
  const renderAnnouncements = () => (
    <div className="rounded-xl p-6 max-w-2xl" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
      <h2 className="font-serif font-semibold text-lg mb-4" style={{ color: '#4a3636' }}>Send System Message</h2>
      <div className="space-y-4">
        <Input placeholder="Announcement title" />
        <Textarea placeholder="Message content (optional)" rows={4} />
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Send className="w-4 h-4 mr-2" /> Send to All Artists
        </Button>
      </div>
    </div>
  );

  /* ── Settings View ── */

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setHealthQuestions([...healthQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const removeQuestion = (idx: number) => {
    setHealthQuestions(healthQuestions.filter((_, i) => i !== idx));
  };

  const renderSettings = () => (
    <div className="space-y-6 max-w-5xl relative pb-20">
      {/* Coupon Management */}
      <CouponManager />

      {/* Card B: Legal & Forms */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">ניהול טפסים ומשפטי</h2>
        </div>

        <div className="space-y-5" dir="rtl">
          <div>
            <label className="text-sm font-medium mb-2 block">נוסח תקנון (ברירת מחדל)</label>
            <Textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} rows={5} className="resize-y" dir="rtl" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">שאלות הצהרת בריאות (ברירת מחדל)</label>
            <div className="space-y-2 mb-3">
              {healthQuestions.map((q, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-sm flex-1">{q}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeQuestion(i)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="הוסיפי שאלה חדשה…" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuestion()} dir="rtl" />
              <Button variant="outline" size="icon" onClick={addQuestion}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Card C: Upsell Management */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Gift className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">ניהול פינוק והטבות</h2>
        </div>

        <div className="space-y-5" dir="rtl">
          <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
            <label className="text-sm font-medium">הצג כרטיסיית הטבה באפליקציית הלקוחה</label>
            <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} className="data-[state=checked]:bg-accent" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">כותרת ההטבה</label>
            <Input value={upsellTitle} onChange={(e) => setUpsellTitle(e.target.value)} dir="rtl" placeholder="להשלמת המראה" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">תיאור ההטבה</label>
            <Textarea value={upsellDescription} onChange={(e) => setUpsellDescription(e.target.value)} rows={3} className="resize-y" dir="rtl" placeholder="אהבת את הגבות? הוסיפי הצללת אייליינר ב-15% הנחה" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">טקסט על כפתור המימוש</label>
            <Input value={upsellButtonText} onChange={(e) => setUpsellButtonText(e.target.value)} dir="rtl" placeholder="למימוש ההטבה" />
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="sticky bottom-6 flex justify-end">
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg" onClick={() => toast({ title: 'System settings updated successfully' })}>
          <Save className="w-4 h-4 ml-2" /> שמור שינויים
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex pt-16">
      <AdminSidebar active={view} onNavigate={setView} isAdmin={isAdmin} />

      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[420px] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between px-2 py-2">
          {([
            { id: 'dashboard' as AdminView, icon: Shield, label: 'דאשבורד' },
            { id: 'users' as AdminView, icon: Users, label: 'משתמשים' },
            { id: 'pricing' as AdminView, icon: DollarSign, label: 'תמחור' },
            { id: 'messages' as AdminView, icon: MessageSquareText, label: 'הודעות' },
            { id: 'settings' as AdminView, icon: Settings, label: 'הגדרות' },
          ]).map((tab) => {
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className="flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 active:scale-95"
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: isActive
                    ? 'linear-gradient(135deg, #D4AF37 0%, #F0D78C 40%, #D4AF37 70%, #B8860B 100%)'
                    : 'linear-gradient(135deg, #d8b4b4 0%, #c9a0a0 40%, #dbc0c0 55%, #c9a0a0 100%)',
                  boxShadow: isActive
                    ? '0 6px 24px rgba(212, 175, 55, 0.5), 0 2px 8px rgba(212, 175, 55, 0.3), inset 0 1px 2px rgba(255,255,255,0.4)'
                    : '0 4px 16px rgba(216, 180, 180, 0.45), 0 2px 6px rgba(160, 120, 120, 0.2), inset 0 1px 2px rgba(255,255,255,0.3)',
                  border: isActive ? '2px solid #D4AF37' : '1px solid rgba(216, 180, 180, 0.5)',
                }}
              >
                <tab.icon
                  size={18}
                  strokeWidth={2.2}
                  style={{ color: '#FFFFFF' }}
                />
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto pb-16 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
              <Shield className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Platform management dashboard</p>
            </div>
          </div>

          {view === 'dashboard' && renderDashboard()}
          {view === 'users' && renderUsers()}
          {view === 'announcements' && renderAnnouncements()}
          {view === 'messages' && <AdminMessages />}
          {view === 'pricing' && <AdminPricingEditor />}
          {view === 'timeline' && <AdminHealingEditor />}
          {view === 'aftercare' && <AdminAftercareEditor />}
          {view === 'health-questions' && <HealthQuestionsEditor />}
          {view === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin;
