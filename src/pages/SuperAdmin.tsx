import { useEffect, useState } from 'react';
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
import { useInvalidateTier } from '@/hooks/useFeatureAccess';
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
import AdminPolicyEditor from '@/components/AdminPolicyEditor';
import FaqManager from '@/pages/FaqManager';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';

type AdminView = 'dashboard' | 'users' | 'announcements' | 'pricing' | 'messages' | 'timeline' | 'timeline-settings' | 'aftercare' | 'health-questions' | 'clinic-policy' | 'faq-manager' | 'settings';

interface ArtistRow {
  id: string;
  name: string;
  studio: string;
  plan: string;
  status: string;
  joinDate: string;
  createdAt: string;
  profileId: string;
}


/* ── helpers ── */
const planBadge = (
  plan: string,
  lang: 'en' | 'he',
  plans: import('@/hooks/usePricingPlans').PricingPlan[] = [],
) => {
  const styles: Record<string, string> = {
    lite: 'bg-muted text-muted-foreground',
    professional: 'bg-accent/10 text-accent',
    master: 'bg-foreground text-background',
  };
  const dbPlan = plans.find(p => p.slug === plan);
  const label = (lang === 'he' ? dbPlan?.name_he : dbPlan?.name_en) ?? plan;
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles[plan] || 'bg-muted text-muted-foreground'}`}>{label}</span>;
};

const statusBadge = (status: string, activeLabel: string, suspendedLabel: string) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
    status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'
  }`}>
    {status === 'active' ? activeLabel : suspendedLabel}
  </span>
);

/* ── component ── */
const SuperAdmin = () => {
  const { t, lang, dir } = useI18n();
  const { toast } = useToast();
  const { isAdmin, loading, roleLoading } = useAuth();
  const navigate = useNavigate();
  const invalidateTier = useInvalidateTier();
  const [view, setView] = useState<AdminView>('dashboard');
  const [termsText, setTermsText] = useState('הריני מאשרת כי כל הפרטים שמסרתי בטופס זה הם נכונים ומדויקים. אני מבינה כי הטיפול מבוצע בהסכמתי המלאה, וכי הוסברו לי הסיכונים האפשריים, תהליך ההחלמה והוראות הטיפול בבית. ידוע לי שתוצאות הטיפול משתנות מאחת לאחת ותלויות גם בסוג העור ובשמירה על ההוראות.');
  const [newQuestion, setNewQuestion] = useState('');
  const [editingUser, setEditingUser] = useState<ArtistRow | null>(null);
  const [viewingUser, setViewingUser] = useState<ArtistRow | null>(null);
  const [editTier, setEditTier] = useState<TierSlug>('lite');
  const [upsellEnabled, setUpsellEnabled] = useState(true);
  const [upsellTitle, setUpsellTitle] = useState('להשלמת המראה');
  const [upsellDescription, setUpsellDescription] = useState('אהבת את הגבות? הוסיפי הצללת אייליינר ב-15% הנחה');
  const [upsellButtonText, setUpsellButtonText] = useState('למימוש ההטבה');
  const [announcementTitleHe, setAnnouncementTitleHe] = useState('');
  const [announcementTitleEn, setAnnouncementTitleEn] = useState('');
  const [announcementContentHe, setAnnouncementContentHe] = useState('');
  const [announcementContentEn, setAnnouncementContentEn] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const { data: dbPlans = [] } = usePricingPlans();
  const queryClient = useQueryClient();
  const { questions: healthQuestions, refetch: refetchHealthQuestions } = useAllHealthQuestions();

  useEffect(() => {
    if (!loading && !roleLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, roleLoading, navigate]);

  // Fetch real users from database
  const { data: artistList = [] } = useQuery({
    queryKey: ['superAdminUsers', lang],
    queryFn: async (): Promise<ArtistRow[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, studio_name, subscription_tier, subscription_status, created_at, has_whatsapp_automation')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        id: p.user_id,
        profileId: p.id,
        name: p.full_name || t('superAdmin.noName'),
        studio: p.studio_name || t('superAdmin.noStudio'),
        plan: p.subscription_tier || 'lite',
        status: p.subscription_status === 'canceled' ? 'suspended' : 'active',
        joinDate: new Date(p.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US'),
        createdAt: p.created_at,
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
        .update({ subscription_tier: cleanTier })
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superAdminUsers'] });
    },
  });

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" dir={dir}>
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">{t('superAdmin.loading')}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = artistList.filter(u => new Date(u.createdAt) >= startOfMonth).length;
  const recentSignupsList = [...artistList].slice(0, 5);

  const dashboardStats = [
    { icon: DollarSign, label: t('superAdmin.stats.totalRevenue'), value: '₪0', color: 'text-accent' },
    { icon: Users, label: t('superAdmin.stats.activeArtists'), value: String(artistList.length), color: 'text-accent' },
    { icon: UserPlus, label: t('superAdmin.stats.newThisMonth'), value: String(newThisMonth), color: 'text-green-500' },
    { icon: TrendingUp, label: t('superAdmin.stats.totalReferrals'), value: '0', color: 'text-blue-500' },
  ];

  /* ── Dashboard View ── */
  const renderDashboard = () => (
    <>
      {/* stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" dir={dir}>
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

      {/* recent signups */}
      <div className="rounded-xl p-5" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
        <h2 className="font-serif font-semibold text-lg mb-4" style={{ color: '#4a3636' }}>{t('superAdmin.recentSignups')}</h2>
        <div className="space-y-3" dir={dir}>
          {recentSignupsList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">0</p>
          ) : recentSignupsList.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-accent">{s.name.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {s.joinDate}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  /* ── Users View ── */
  const renderUsers = () => (
    <>
      <div dir={dir} className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
        <div className="p-5 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: '1px solid rgba(216,180,180,0.3)' }}>
          <h2 className="font-serif font-semibold text-lg" style={{ color: '#4a3636' }}>{t('superAdmin.users.title')}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: '#8c6a6a' }}>{artistList.length} {t('superAdmin.users.count')}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                 <TableHead className={lang === 'he' ? 'text-right' : 'text-left'}>{t('superAdmin.users.artistStudio')}</TableHead>
                <TableHead className={lang === 'he' ? 'text-right' : 'text-left'}>{t('superAdmin.users.plan')}</TableHead>
                <TableHead className={lang === 'he' ? 'text-right' : 'text-left'}>{t('superAdmin.users.status')}</TableHead>
                <TableHead className={lang === 'he' ? 'text-right' : 'text-left'}>{t('superAdmin.users.joinDate')}</TableHead>
                <TableHead className={lang === 'he' ? 'text-right' : 'text-left'}>{t('superAdmin.users.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {artistList.map(u => (
                <TableRow key={u.id}>
                  <TableCell className={lang === 'he' ? 'text-right' : 'text-left'}>
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.studio}</p>
                  </TableCell>
                  <TableCell className={lang === 'he' ? 'text-right' : 'text-left'}>{planBadge(u.plan, lang, dbPlans)}</TableCell>
                  <TableCell className={lang === 'he' ? 'text-right' : 'text-left'}>{statusBadge(u.status, t('superAdmin.status.active'), t('superAdmin.status.suspended'))}</TableCell>
                  <TableCell className={`${lang === 'he' ? 'text-right' : 'text-left'} text-sm text-muted-foreground`}>{u.joinDate}</TableCell>
                  <TableCell className={lang === 'he' ? 'text-right' : 'text-left'}>
                    <div className={`flex items-center gap-1 ${lang === 'he' ? 'justify-end' : 'justify-start'}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent hover:text-accent" onClick={() => setViewingUser(u)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{lang === 'he' ? 'צפייה בפרטים' : 'View details'}</TooltipContent>
                      </Tooltip>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(u); setEditTier((u.plan || 'lite') as TierSlug); }}><Pencil className="w-3.5 h-3.5" /></Button>
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
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{t('superAdmin.users.editTitle')}</DialogTitle>
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
                <Label className="text-sm font-medium">{t('superAdmin.users.subscriptionPlan')}</Label>
                <Select value={editTier} onValueChange={(v) => setEditTier(v as TierSlug)}>
                  <SelectTrigger>
                    <SelectValue placeholder={editingUser.plan ? `${editingUser.plan} (${lang === 'he' ? 'נוכחי' : 'current'})` : (lang === 'he' ? 'בחרי מסלול' : 'Select a plan')} />
                  </SelectTrigger>
                  <SelectContent>
                    {dbPlans.map(p => (
                      <SelectItem key={p.slug} value={p.slug}>
                        {(lang === 'he' ? p.name_he : p.name_en)} — {p.price_monthly === 0 ? t('superAdmin.free') : `₪${p.price_monthly}/${lang === 'he' ? 'חודש' : 'month'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-row-reverse gap-2">
            <Button variant="outline" onClick={() => setEditingUser(null)}>{t('superAdmin.users.cancel')}</Button>
            <Button
              disabled={updateTierMutation.isPending}
              onClick={() => {
                if (!editingUser) return;
                updateTierMutation.mutate(
                  { profileId: editingUser.profileId, newTier: editTier },
                  {
                    onSuccess: () => {
                      const selectedPlan = dbPlans.find(p => p.slug === editTier);
                      const planName = lang === 'he' ? selectedPlan?.name_he : selectedPlan?.name_en;
                      toast({
                        title: lang === 'he'
                          ? `${t('superAdmin.users.planUpdatedPrefix')} ${editingUser.name} ${t('superAdmin.users.planUpdatedSuffix')}${planName ?? editTier}`
                          : `${t('superAdmin.users.planUpdatedPrefix')} ${editingUser.name} ${t('superAdmin.users.planUpdatedSuffix')} ${planName ?? editTier}`,
                      });
                      setEditingUser(null);
                    },
                    onError: (err) => {
                      toast({ title: t('superAdmin.users.savePlanError'), description: (err as Error).message, variant: 'destructive' });
                    },
                  }
                );
              }}
            >
              <Save className="w-4 h-4 ml-1" /> {t('superAdmin.users.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
  const handleSendAnnouncement = async () => {
    if (!announcementTitleHe.trim() && !announcementTitleEn.trim()) return;
    setSendingAnnouncement(true);
    try {
      const { error } = await supabase.from('announcements').insert({
        title: announcementTitleHe || announcementTitleEn,
        content: announcementContentHe || announcementContentEn,
        title_he: announcementTitleHe,
        title_en: announcementTitleEn,
        content_he: announcementContentHe,
        content_en: announcementContentEn,
        is_active: true,
      });
      if (error) throw error;
      setAnnouncementTitleHe('');
      setAnnouncementTitleEn('');
      setAnnouncementContentHe('');
      setAnnouncementContentEn('');
      toast({ title: lang === 'he' ? 'ההכרזה נשלחה בהצלחה ✅' : 'Announcement sent successfully ✅' });
    } catch (err) {
      toast({ title: lang === 'he' ? 'שגיאה בשליחה' : 'Failed to send', description: (err as Error).message, variant: 'destructive' });
    }
    setSendingAnnouncement(false);
  };

  /* ── Announcements View ── */
  const renderAnnouncements = () => (
    <div dir={dir} className="rounded-xl p-6 max-w-2xl" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
      <h2 className="font-serif font-semibold text-lg mb-4" style={{ color: '#4a3636' }}>{t('superAdmin.announcements.title')}</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{lang === 'he' ? 'כותרת בעברית' : 'Title (Hebrew)'}</label>
            <Input dir="rtl" placeholder="כותרת בעברית" value={announcementTitleHe} onChange={(e) => setAnnouncementTitleHe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{lang === 'he' ? 'כותרת באנגלית' : 'Title (English)'}</label>
            <Input dir="ltr" placeholder="Title in English" value={announcementTitleEn} onChange={(e) => setAnnouncementTitleEn(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{lang === 'he' ? 'תוכן בעברית' : 'Content (Hebrew)'}</label>
            <Textarea dir="rtl" placeholder="תוכן ההכרזה בעברית" rows={4} value={announcementContentHe} onChange={(e) => setAnnouncementContentHe(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{lang === 'he' ? 'תוכן באנגלית' : 'Content (English)'}</label>
            <Textarea dir="ltr" placeholder="Announcement content in English" rows={4} value={announcementContentEn} onChange={(e) => setAnnouncementContentEn(e.target.value)} />
          </div>
        </div>
        <Button
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          disabled={sendingAnnouncement || (!announcementTitleHe.trim() && !announcementTitleEn.trim())}
          onClick={handleSendAnnouncement}
        >
          <Send className="w-4 h-4 mr-2" /> {sendingAnnouncement ? (lang === 'he' ? 'שולח…' : 'Sending…') : t('superAdmin.announcements.sendAll')}
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
      toast({ title: t('superAdmin.settings.questionAdded') });
    } catch (err: unknown) {
      toast({
        title: t('superAdmin.settings.questionAddError'),
        description: err instanceof Error ? err.message : t('superAdmin.settings.questionAddError'),
        variant: 'destructive',
      });
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
      toast({ title: t('superAdmin.settings.questionDeleted') });
    } catch (err: unknown) {
      toast({
        title: t('superAdmin.settings.questionDeleteError'),
        description: err instanceof Error ? err.message : t('superAdmin.settings.questionDeleteError'),
        variant: 'destructive',
      });
    }
  };

  const renderSettings = () => (
    <div className="space-y-6 max-w-5xl relative pb-20">
      {/* Coupon Management */}
      <CouponManager />

      {/* Card B: Legal & Forms */}
      <div className="rounded-xl p-6" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
        <div className="flex items-center gap-2 mb-5" dir={dir}>
          <Settings className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">{t('superAdmin.settings.formsTitle')}</h2>
        </div>

        <div className="space-y-5" dir={dir}>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('superAdmin.settings.termsLabel')}</label>
            <Textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} rows={5} className="resize-y" dir={dir} />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('superAdmin.settings.healthQuestionsLabel')}</label>
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
              <Input placeholder={t('superAdmin.settings.newQuestionPlaceholder')} value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuestion()} dir={dir} />
              <Button variant="outline" size="icon" onClick={addQuestion}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      {/* Card C: Upsell Management */}
      <div className="rounded-xl p-6" style={{ background: 'linear-gradient(145deg, rgba(216,180,180,0.25), rgba(201,160,160,0.15))', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(216,180,180,0.4)', boxShadow: '0 8px 32px rgba(216,180,180,0.2), 0 0 20px rgba(240,200,210,0.15)' }}>
        <div className="flex items-center gap-2 mb-5" dir={dir}>
          <Gift className="w-5 h-5 text-accent" />
          <h2 className="font-serif font-semibold text-lg">{t('superAdmin.settings.upsellTitle')}</h2>
        </div>

        <div className="space-y-5" dir={dir}>
          <div className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg px-4 py-3">
            <label className="text-sm font-medium">{t('superAdmin.settings.upsellToggle')}</label>
            <Switch checked={upsellEnabled} onCheckedChange={setUpsellEnabled} className="data-[state=checked]:bg-accent" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('superAdmin.settings.upsellHeadline')}</label>
            <Input value={upsellTitle} onChange={(e) => setUpsellTitle(e.target.value)} dir={dir} placeholder={t('superAdmin.settings.upsellHeadlinePlaceholder')} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('superAdmin.settings.upsellDescription')}</label>
            <Textarea value={upsellDescription} onChange={(e) => setUpsellDescription(e.target.value)} rows={3} className="resize-y" dir={dir} placeholder={t('superAdmin.settings.upsellDescriptionPlaceholder')} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('superAdmin.settings.upsellButton')}</label>
            <Input value={upsellButtonText} onChange={(e) => setUpsellButtonText(e.target.value)} dir={dir} placeholder={t('superAdmin.settings.upsellButtonPlaceholder')} />
          </div>
        </div>
      </div>

      {/* Sticky Save */}
      <div className="sticky bottom-6 flex justify-end">
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 text-base shadow-lg" onClick={() => toast({ title: t('superAdmin.settings.saveSuccess') })}>
          <Save className="w-4 h-4 ml-2" /> {t('superAdmin.settings.save')}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex pt-16" dir={dir}>
      <AdminSidebar active={view} onNavigate={setView} isAdmin={isAdmin} />

      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[420px] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center justify-between px-2 py-2">
          {([
            { id: 'dashboard' as AdminView, icon: Shield, label: t('superAdmin.nav.dashboard') },
            { id: 'users' as AdminView, icon: Users, label: t('superAdmin.nav.users') },
            { id: 'pricing' as AdminView, icon: DollarSign, label: t('superAdmin.nav.pricing') },
            { id: 'messages' as AdminView, icon: MessageSquareText, label: t('superAdmin.nav.messages') },
            { id: 'settings' as AdminView, icon: Settings, label: t('superAdmin.nav.settings') },
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
              <h1 className="text-2xl font-serif font-bold">{t('superAdmin.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('superAdmin.subtitle')}</p>
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
          {view === 'clinic-policy' && <AdminPolicyEditor />}
          {view === 'faq-manager' && <FaqManager />}
          {view === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin;
