import { useState, useEffect, useCallback } from 'react';
import { Gift, Trophy, ChevronRight, Sparkles, Clock, Hourglass, Copy, CheckCircle, MessageCircle, Wallet, Info } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface BonusCenterProps {
  userProfileId: string | null;
  onNavigateToReferrals?: () => void;
}

interface PendingReferral {
  id: string;
  name: string;
  createdAt: Date;
  daysRemaining: number;
  progressPct: number;
}

interface ReferralHistoryItem {
  id: string;
  name: string;
  status: 'pending' | 'converted' | 'redeemed';
  date: string;
  amount: number;
}

const QUALIFYING_DAYS = 90;
const BONUS_AMOUNT = 50;

export default function BonusCenter({ userProfileId, onNavigateToReferrals }: BonusCenterProps) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [confirmedBalance, setConfirmedBalance] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState<PendingReferral[]>([]);
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [showRedemptionInfo, setShowRedemptionInfo] = useState(false);

  const fetchReferralData = useCallback(async () => {
    if (!userProfileId) return;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_credit, referral_code, full_name')
        .eq('id', userProfileId)
        .single();
      if (profile?.referral_credit) setConfirmedBalance(Number(profile.referral_credit));
      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        const code = (profile?.full_name || 'artist').toLowerCase().replace(/\s+/g, '') + Math.floor(100 + Math.random() * 900);
        setReferralCode(code);
      }

      // Converted referrals
      const { data: converted } = await supabase
        .from('referrals')
        .select('id, referred_email, converted_at, reward_credit')
        .eq('referrer_profile_id', userProfileId)
        .eq('status', 'converted')
        .order('converted_at', { ascending: false });
      if (converted) {
        setReferralCount(converted.length);
        setHistory(prev => [
          ...converted.map(r => ({
            id: r.id,
            name: r.referred_email || (isHe ? 'קולגה' : 'Colleague'),
            status: 'converted' as const,
            date: r.converted_at ? new Date(r.converted_at).toLocaleDateString(isHe ? 'he-IL' : 'en-US') : '',
            amount: Number(r.reward_credit) || BONUS_AMOUNT,
          })),
        ]);
      }

      // Pending referrals
      const { data: pending } = await supabase
        .from('referrals')
        .select('id, referred_email, created_at')
        .eq('referrer_profile_id', userProfileId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (pending) {
        const now = new Date();
        const pendingItems = pending.map(r => {
          const created = new Date(r.created_at);
          const elapsed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          const remaining = Math.max(0, QUALIFYING_DAYS - elapsed);
          const pct = Math.min(100, Math.round((elapsed / QUALIFYING_DAYS) * 100));
          return {
            id: r.id,
            name: r.referred_email || (isHe ? 'קולגה חדשה' : 'New colleague'),
            createdAt: created,
            daysRemaining: remaining,
            progressPct: pct,
          };
        });
        setPendingReferrals(pendingItems);
        // Add pending to history
        setHistory(prev => {
          const convertedIds = prev.map(h => h.id);
          const pendingHistory = pendingItems
            .filter(p => !convertedIds.includes(p.id))
            .map(p => ({
              id: p.id,
              name: p.name,
              status: 'pending' as const,
              date: p.createdAt.toLocaleDateString(isHe ? 'he-IL' : 'en-US'),
              amount: BONUS_AMOUNT,
            }));
          return [...prev, ...pendingHistory];
        });
      }
    } catch (err) {
      console.error('Failed to fetch referral data:', err);
    }
  }, [userProfileId, isHe]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const referralLink = `${window.location.origin}/auth?ref=${referralCode}`;
  const pendingTotal = pendingReferrals.length * BONUS_AMOUNT;

  const copyAndShare = async () => {
    const shareText = isHe
      ? `היי! אני משתמשת ב-GlowPush לניהול הקליניקה שלי וזה פשוט מושלם. תירשמי דרך הקישור שלי ונוכל שתינו להנות מהטבות: את תקבלי גישה למערכת יוקרתית, ועל הדרך תעזרי לי להשיג מנוי בחינם! 😉 הנה הקישור: ${referralLink}`
      : `Hey! I'm using GlowPush to manage my clinic and it's simply perfect. Sign up through my link and we can both enjoy benefits: you'll get access to a premium system, and help me get a free subscription! 😉 Here's the link: ${referralLink}`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast({ title: isHe ? 'הטקסט הועתק!' : 'Text copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const message = isHe
      ? `היי! אני משתמשת ב-GlowPush לניהול הקליניקה שלי וזה פשוט מושלם. תירשמי דרך הקישור שלי ונוכל שתינו להנות מהטבות: את תקבלי גישה למערכת יוקרתית, ועל הדרך תעזרי לי להשיג מנוי בחינם! 😉 הנה הקישור: ${referralLink}`
      : `Hey! I'm using GlowPush to manage my clinic and it's simply perfect. Sign up through my link and we can both enjoy benefits: you'll get access to a premium system, and help me get a free subscription! 😉 Here's the link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const vipGoal = 3;
  const vipProgress = Math.min(referralCount, vipGoal);
  const vipPct = Math.round((vipProgress / vipGoal) * 100);

  return (
    <div className="space-y-6 pb-10" dir={isHe ? 'rtl' : 'ltr'}>

      {/* 🎮 VIP Gamification Progress */}
      <div className="rounded-2xl border border-[#D4AF37]/30 p-5 animate-fade-up" style={{ background: 'linear-gradient(160deg, hsl(40 50% 97%), hsl(38 45% 93%))' }}>
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {isHe ? 'פתחי את פרס ה-VIP שלך! 🎁' : 'Unlock your VIP Reward! 🎁'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isHe
              ? 'הזמיני 3 קולגות ל-Glow Push וקבלי חודש חינם!'
              : 'Invite 3 colleagues to Glow Push and get a free month!'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative mb-3">
          <div className="w-full h-5 rounded-full bg-muted/60 overflow-hidden border border-border/30">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${vipPct}%`,
                background: 'linear-gradient(90deg, #B8860B, #D4AF37 40%, #F9F295 70%, #D4AF37)',
                boxShadow: '0 0 12px hsl(38 55% 55% / 0.4)',
              }}
            />
          </div>
          {/* Milestone markers */}
          <div className="flex justify-between mt-2 px-1">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    vipProgress >= step
                      ? 'border-[#D4AF37] text-white'
                      : 'border-border text-muted-foreground bg-card'
                  }`}
                  style={vipProgress >= step ? { background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295)' } : {}}
                >
                  {vipProgress >= step ? '✓' : step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Counter text */}
        <p className="text-center text-sm font-semibold text-foreground/80 mb-4">
          {isHe
            ? `${vipProgress} מתוך ${vipGoal} חברות הצטרפו`
            : `${vipProgress} out of ${vipGoal} friends joined`}
        </p>

        {/* WhatsApp Share CTA */}
        <button
          onClick={shareWhatsApp}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-bold text-base transition-all active:scale-95 hover:brightness-110 shadow-lg"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle className="w-5 h-5" />
          {isHe ? 'שתפי קישור בוואטסאפ' : 'Share link on WhatsApp'}
        </button>
      </div>

      {/* Engaging Header */}
      <div className="text-center py-2 space-y-2 px-2">
        <h1 
          className="text-xl md:text-2xl font-bold bg-clip-text text-transparent leading-tight"
          style={{ backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)' }}
        >
          {isHe ? 'הזמיני חברות ותתחילי להרוויח!' : 'Invite friends and start earning!'}
        </h1>
        <p className="text-sm text-foreground/80 font-medium leading-relaxed max-w-[280px] mx-auto">
          {isHe 
            ? 'על כל קולגה שתצטרף ל-GlowPush דרכך, הארנק שלך יגדל ב-50 ש"ח למילוי חוזר.'
            : 'For every colleague who joins GlowPush through you, your wallet will grow by ₪50 for refills.'}
        </p>
      </div>

      {/* Wallet Card */}
      <div className="rounded-2xl p-5 border border-border/50 shadow-sm bg-background">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center border border-border shadow-md"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
          >
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">
              {isHe ? 'הארנק שלי' : 'My Wallet'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isHe ? `${referralCount} קולגות הצטרפו דרכך` : `${referralCount} colleagues joined via you`}
            </p>
          </div>
        </div>

        {/* Confirmed Balance */}
        <div className="rounded-xl bg-card p-4 text-center mb-3 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">
            {isHe ? 'יתרה למימוש' : 'Available Balance'}
          </p>
          <p className="text-4xl font-bold" style={{ color: '#D4AF37' }}>
            ₪{confirmedBalance}
          </p>
        </div>

        {/* Pending Balance */}
        {pendingTotal > 0 && (
          <div className="rounded-xl bg-card/60 p-3 text-center mb-3 border border-border/20">
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Hourglass className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {isHe ? 'בדרך אליך' : 'On the way'}
              </p>
            </div>
            <p className="text-lg font-bold text-foreground/70">₪{pendingTotal}</p>
            <p className="text-[10px] text-muted-foreground">
              {isHe
                ? `${pendingReferrals.length} חברות שעדיין לא השלימו 3 חודשים`
                : `${pendingReferrals.length} friends haven't completed 3 months yet`}
            </p>
          </div>
        )}

        {/* Invite CTA */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={copyAndShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border border-border transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)', color: '#5C4033' }}
          >
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {isHe ? 'הזמיני קולגה וקבלי בונוס' : 'Invite Colleague & Get Bonus'}
          </button>
          <button
            onClick={shareWhatsApp}
            className="w-12 h-12 rounded-full flex items-center justify-center border border-[#D4AF37]/30 transition-all active:scale-95 shrink-0"
            style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Share Tip */}
        <p className="text-[11px] font-bold text-center mb-3 text-foreground/90 animate-pulse">
          {isHe 
            ? '💡 טיפ: ככל שתשתפי יותר, כך גדל הסיכוי שהמנוי שלך החודש יהיה בחינם!'
            : '💡 Tip: The more you share, the better the chance your subscription this month is free!'}
        </p>

        {/* Note */}
        <p className="text-[10px] text-muted-foreground text-center leading-relaxed px-2">
          {isHe
            ? 'הזיכוי יתעדכן בארנק לאחר 3 חודשי מנוי פעילים של החברה המוזמנת.'
            : 'Credit will update in your wallet after 3 active subscription months of the invited friend.'}
        </p>
      </div>

      {/* How it works */}
      <button
        onClick={() => setShowHowItWorks(!showHowItWorks)}
        className="flex items-center gap-2 text-sm font-bold text-foreground"
      >
        <Sparkles className="w-4 h-4" style={{ color: '#D4AF37' }} />
        {isHe ? 'איך זה עובד?' : 'How it works?'}
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHowItWorks ? 'rotate-90' : ''}`} />
      </button>
      {showHowItWorks && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-3 animate-fade-up">
          {[
            { step: '1', title: isHe ? 'שתפי את הקוד' : 'Share your code', desc: isHe ? 'שלחי את הקישור האישי שלך לקולגות בוואטסאפ' : 'Send your personal link to colleagues via WhatsApp' },
            { step: '2', title: isHe ? 'הקולגה נרשמת' : 'Colleague signs up', desc: isHe ? 'כשהקולגה נרשמת דרך הקישור שלך' : 'When your colleague signs up via your link' },
            { step: '3', title: isHe ? 'קבלי 50 ₪!' : 'Get ₪50!', desc: isHe ? 'אחרי 3 חודשי מנוי פעילים, 50 ₪ נכנסים לארנק שלך אוטומטית' : 'After 3 active months, ₪50 is added to your wallet automatically' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-border"
                style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)', color: '#5C4033' }}
              >
                {item.step}
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Bonuses */}
      {pendingReferrals.length > 0 && (
        <div>
          <button
            onClick={() => setShowPending(!showPending)}
            className="flex items-center gap-2 text-sm font-bold text-foreground mb-2"
          >
            <Hourglass className="w-4 h-4" style={{ color: '#D4AF37' }} />
            {isHe ? `בונוסים בהמתנה (${pendingReferrals.length})` : `Pending Bonuses (${pendingReferrals.length})`}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPending ? 'rotate-90' : ''}`} />
          </button>

          {showPending && (
            <div className="space-y-2 animate-fade-up">
              {pendingReferrals.map((pr) => (
                <div key={pr.id} className="rounded-xl p-3 border border-border/50 bg-card">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{pr.name}</span>
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: '#D4AF37' }}>₪{BONUS_AMOUNT}</span>
                  </div>
                  <Progress value={pr.progressPct} className="h-2 mb-1" />
                  <p className="text-[10px] text-muted-foreground">
                    {isHe ? `${pr.daysRemaining} ימים שנותרו` : `${pr.daysRemaining} days remaining`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="flex items-center gap-2 text-sm font-bold text-foreground"
      >
        <Trophy className="w-4 h-4" style={{ color: '#D4AF37' }} />
        {isHe ? 'היסטוריה' : 'History'}
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
      </button>
      {showHistory && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-2 animate-fade-up">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {isHe ? 'אין היסטוריה עדיין' : 'No history yet'}
            </p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                   <div
                     className="w-2 h-2 rounded-full"
                     style={{ backgroundColor: item.status === 'converted' ? '#D4AF37' : item.status === 'redeemed' ? '#22c55e' : '#aaa' }}
                   />
                   <span className="text-sm text-foreground truncate max-w-[120px]">{item.name}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                     item.status === 'converted'
                       ? 'bg-accent/20 text-accent'
                       : item.status === 'redeemed'
                       ? 'bg-green-100 text-green-700'
                       : 'bg-muted text-muted-foreground'
                   }`}>
                     {item.status === 'converted'
                       ? (isHe ? 'אושר ✓' : 'Confirmed ✓')
                       : item.status === 'redeemed'
                       ? (isHe ? 'מומש ✓' : 'Redeemed ✓')
                       : (isHe ? 'ממתין' : 'Pending')}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.date}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Redemption Info */}
      <div className="rounded-xl bg-card border border-border p-4 mt-2">
        <button
          onClick={() => setShowRedemptionInfo(!showRedemptionInfo)}
          className="flex items-center gap-2 text-sm font-bold text-foreground w-full"
        >
          <Info className="w-4 h-4" style={{ color: '#D4AF37' }} />
          {isHe ? 'איך אני מממשת את הכסף?' : 'How do I redeem my credits?'}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showRedemptionInfo ? 'rotate-90' : ''} ${isHe ? 'mr-auto' : 'ml-auto'}`} />
        </button>
        {showRedemptionInfo && (
          <div className="mt-3 animate-fade-up">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {isHe
                ? 'הכסף שצברת בארנק יקוזז באופן אוטומטי מהתשלום החודשי הבא שלך עבור המנוי ב-GlowPush. צברת מספיק? החודש שלך יכול להיות בחינם! 🎉'
                : 'The money you earned will be automatically deducted from your next monthly GlowPush subscription payment. Earned enough? Your month could be free! 🎉'}
            </p>
            <div className="mt-3 rounded-lg p-3 border border-border/30" style={{ background: 'linear-gradient(135deg, rgba(92,64,51,0.08), rgba(212,175,55,0.12))' }}>
              <p className="text-xs font-semibold text-foreground/90">
                {isHe ? '💡 לדוגמה:' : '💡 For example:'}
              </p>
              <p className="text-xs text-foreground/70 mt-1">
                {isHe
                  ? 'צברת ₪150 → המנוי החודשי שלך (₪79) יקוזז לחלוטין, ותישאר לך יתרה של ₪71 לחודש הבא.'
                  : 'You earned ₪150 → Your monthly plan (₪79) is fully covered, and ₪71 carries over to next month.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
