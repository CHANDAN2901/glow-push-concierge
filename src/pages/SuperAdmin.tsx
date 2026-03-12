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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { type TierSlug } from '@/lib/subscriptionConfig';
import { usePricingPlans } from '@/hooks/usePricingPlans';
import { startImpersonation } from '@/lib/impersonation';
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
import { useAllHealthQuestions } from '@/hooks/useHealthQuestions';
import CouponManager from '@/components/CouponManager';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AdminView = 'dashboard' | 'users' | 'announcements' | 'pricing' | 'messages' | 'timeline' | 'timeline-content' | 'timeline-settings' | 'aftercare' | 'health-questions' | 'clinic-policy' | 'faq' | 'faq-manager' | 'settings';

interface ArtistRow {
  id: string;
  name: string;
  studio: string;
  plan: string;
  status: string;
  joinDate: string;
  profileId: string;
}

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
const planBadge = (plan: string, plans: import('@/hooks/usePricingPlans').PricingPlan[] = []) => {
  const styles: Record<string, string> = {
    lite: 'bg-muted text-muted-foreground',
    professional: 'bg-accent/10 text-accent',
    master: 'bg-foreground text-background',
  };
  const dbPlan = plans.find(p => p.slug === plan);
  const label = dbPlan?.name_he ?? plan;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[plan] || 'bg-muted text-muted-foreground'}`}>{label}</span>;
};

const statusBadge = (status: string) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
    status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
  }`}>
    {status === 'active' ? 'פעילה' : 'מושעית'}
  </span>
);

/* ── component ── */
const SuperAdmin = () => {
  const { toast } = useToast();
  const { isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>('dashboard');
  const [termsText, setTermsText] = useState('הריני מאשרת כי כל הפרטים שמסרתי בטופס זה הם נכונים ומדויקים. אני מבינה כי הטיפול מבוצע בהסכמתי המלאה, וכי הוסברו לי הסיכונים האפשריים, תהליך ההחלמה והוראות הטיפול בבית. ידוע לי שתוצאות הטיפול משתנות מאחת לאחת ותלויות גם בסוג העור ובשמירה על ההוראות.');
  const [newQuestion, setNewQuestion] = useState('');
  const [editingUser, setEditingUser] = useState<ArtistRow | null>(null);
  const [editTier, setEditTier] = useState<TierSlug>('lite');
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [upsellTitle, setUpsellTitle] = useState('להשלמת המראה');
  const [upsellDescription, setUpsellDescription] = useState('אהבת את הגבות? הוסיפי הצללת אייליינר ב-15% הנחה');
  const [upsellButtonText, setUpsellButtonText] = useState('למימוש ההטבה');
  const { data: dbPlans = [] } = usePricingPlans();
  const queryClient = useQueryClient();
  const { questions: healthQuestions, refetch: refetchHealthQuestions } = useAllHealthQuestions();

  // Fetch real users from database
  const { data: artistList = [], isLoading: usersLoading } = useQuery({
    queryKey: ['superAdminUsers'],
    queryFn: async (): Promise<ArtistRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, studio_name, subscription_tier, subscription_status, created_at, has_whatsapp_automation')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.user_id,
        profileId: p.id,
        name: p.full_name || 'ללא שם',
        studio: p.studio_name || '—',
        plan: p.subscription_tier || 'lite',
        status: p.subscription_status === 'canceled' ? 'suspended' : 'active',
        joinDate: new Date(p.created_at).toLocaleDateString('he-IL'),
      }));
    },
  });

  // Mutation to persist tier changes
  const updateTierMutation = useMutation({
    mutationFn: async ({ profileId, newTier }: { profileId: string; newTier: TierSlug }) => {
      // Sanitize: strip any extra quotes from the tier value
      const cleanTier = String(newTier).replace(/"/g, '').trim();
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: cleanTier } as any)
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
  });

  // Mutation to seed test users via SECURITY DEFINER RPC (bypasses RLS)
  const seedUsersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_mock_users' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
      toast({ title: '4 משתמשות טסט נוספו בהצלחה!' });
    },
    onError: (err) => {
      toast({ title: 'שגיאה ביצירת משתמשות', description: (err as Error).message, variant: 'destructive' });
    },
  });

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
        <div className="lg:col-span-2 rounded-xl p-5" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
          <h2 className="font-serif font-bold text-lg mb-4" style={{ color: '#4a3636' }}>Revenue Growth</h2>
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
        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
          <h2 className="font-serif font-semibold text-lg mb-4" style={{ color: '#4a3636' }}>Last 5 Signups</h2>
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
    <>
      <div dir="rtl" className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
        <div className="p-5 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(216,180,180,0.3)' }}>
          <h2 className="font-serif font-semibold text-lg" style={{ color: '#4a3636' }}>ניהול משתמשות</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={seedUsersMutation.isPending}
              onClick={() => seedUsersMutation.mutate()}
            >
              <UserPlus className="w-3.5 h-3.5 ml-1" />
              {seedUsersMutation.isPending ? 'יוצרת...' : 'הוספת משתמשות טסט'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { error } = await supabase.rpc('upgrade_self_to_master' as any);
                if (error) {
                  toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
                } else {
                  queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
                  toast({ title: 'החבילה שלך שודרגה ל-Master! 👑' });
                }
              }}
            >
              👑 שדרוג עצמי ל-Master
            </Button>
            <span className="text-xs" style={{ color: '#8c6a6a' }}>{artistList.length} משתמשות</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                 <TableHead className="text-right">אמנית וסטודיו</TableHead>
                <TableHead className="text-right">חבילה</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תאריך הצטרפות</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artistList.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-right">
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.studio}</p>
                  </TableCell>
                  <TableCell className="text-right">{planBadge(u.plan, dbPlans)}</TableCell>
                  <TableCell className="text-right">{statusBadge(u.status)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{u.joinDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent" onClick={() => {
                            startImpersonation({ userName: u.name, studioName: u.studio, tier: u.plan as TierSlug });
                            window.dispatchEvent(new Event('impersonation-changed'));
                            navigate('/artist');
                          }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>כניסה כמשתמשת זו</TooltipContent>
                      </Tooltip>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(u); setEditTier(u.plan as TierSlug); }}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Ban className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">עריכת משתמשת</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-5 py-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">{editingUser.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{editingUser.name}</p>
                  <p className="text-xs text-muted-foreground">{editingUser.studio}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">חבילת מנוי</Label>
                <Select value={editTier} onValueChange={(v) => setEditTier(v as TierSlug)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dbPlans.map(p => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {p.name_he} — {p.price_monthly === 0 ? 'חינם' : `₪${p.price_monthly}/חודש`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setEditingUser(null)}>ביטול</Button>
            <Button
              disabled={updateTierMutation.isPending}
              onClick={() => {
                if (!editingUser) return;
                updateTierMutation.mutate(
                  { profileId: editingUser.profileId, newTier: editTier },
                  {
                    onSuccess: () => {
                      toast({ title: `החבילה של ${editingUser.name} עודכנה ל-${dbPlans.find(p => p.slug === editTier)?.name_he ?? editTier}` });
                      setEditingUser(null);
                    },
                    onError: (err) => {
                      toast({ title: 'שגיאה בשמירת החבילה', description: (err as Error).message, variant: 'destructive' });
                    },
                  }
                );
              }}
            >
              <Save className="w-4 h-4 ml-1" /> שמירה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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

  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    try {
      const maxOrder = healthQuestions.reduce((max, q) => Math.max(max, q.sort_order), 0);
      const { error } = await supabase
        .from('health_questions')
        .insert({
          question_he: newQuestion.trim(),
          question_en: '',
          risk_level: 'yellow',
          icon: '❓',
          has_detail_field: false,
          sort_order: maxOrder + 1,
          is_active: true,
        });
      if (error) throw error;
      setNewQuestion('');
      await refetchHealthQuestions();
      toast({ title: 'השאלה נוספה ✅' });
    } catch (err: any) {
      toast({ title: 'שגיאה בהוספת שאלה', description: err.message, variant: 'destructive' });
    }
  };

  const removeQuestion = async (id: string) => {
    try {
      const { error } = await supabase
        .from('health_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await refetchHealthQuestions();
      toast({ title: 'השאלה נמחקה ✅' });
    } catch (err: any) {
      toast({ title: 'שגיאה במחיקת שאלה', description: err.message, variant: 'destructive' });
    }
  };

  const renderSettings = () => (
    <div className="space-y-6 max-w-5xl relative pb-20">
      {/* Coupon Management */}
      <CouponManager />

      {/* Card B: Legal & Forms */}
      <div className="rounded-xl p-6" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
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
              {healthQuestions.map((q) => (
                <div key={q.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-sm flex-1">{q.question_he}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeQuestion(q.id)}>
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
      <div className="rounded-xl p-6" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
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
