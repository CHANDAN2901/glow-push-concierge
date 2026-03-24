import { useState, useEffect } from 'react';
import { Copy, CheckCircle, MessageCircle, Gift, Users, TrendingUp, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { VOUCHER_DEFAULTS } from '@/components/ReferralVoucherEditor';

interface ReferralTabProps {
  artistName?: string;
  artistProfileId?: string;
}

const ReferralTab = ({ artistName = '', artistProfileId }: ReferralTabProps) => {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [copied, setCopied] = useState(false);
  const [voucherWaHe, setVoucherWaHe] = useState(VOUCHER_DEFAULTS.voucher_wa_he);
  const [voucherWaEn, setVoucherWaEn] = useState(VOUCHER_DEFAULTS.voucher_wa_en);
  const [referralCode, setReferralCode] = useState('');

  const referralLink = referralCode ? `${window.location.origin}/auth?ref=${referralCode}` : '';

  // Fetch or generate a stable referral code saved in profiles
  useEffect(() => {
    if (!artistProfileId) return;
    (async () => {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', artistProfileId)
        .maybeSingle();

      if (fetchError) console.error('[ReferralTab] fetch error:', fetchError);

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
        return;
      }

      // No code yet — generate one and persist it
      const base = (artistName || 'artist').toLowerCase().replace(/\s+/g, '');
      const newCode = base + Math.floor(100 + Math.random() * 900);

      const { error: saveError } = await supabase
        .from('profiles')
        .update({ referral_code: newCode })
        .eq('id', artistProfileId)
        .select('referral_code')
        .maybeSingle();

      if (saveError) {
        console.error('[ReferralTab] save error:', saveError);
      } else {
        setReferralCode(newCode);
      }
    })();
  }, [artistProfileId]);

  // Fetch saved voucher templates from DB
  useEffect(() => {
    if (!artistProfileId) return;
    (async () => {
      const { data } = await supabase
        .from('artist_message_settings')
        .select('settings')
        .eq('artist_profile_id', artistProfileId)
        .maybeSingle();
      if (data?.settings && typeof data.settings === 'object') {
        const s = data.settings as Record<string, unknown>;
        if (s.voucher_wa_he) setVoucherWaHe(s.voucher_wa_he as string);
        if (s.voucher_wa_en) setVoucherWaEn(s.voucher_wa_en as string);
      }
    })();
  }, [artistProfileId]);

  const buildVoucherMessage = () => {
    const template = isHe ? voucherWaHe : voucherWaEn;
    return template
      .replace(/\[CODE\]/gi, referralCode)
      .replace(/\{\{artist_name\}\}/gi, artistName || '')
      .replace(/\{\{client_name\}\}/gi, '')
      .replace(/\{\{link\}\}/gi, referralLink)
      + (template.includes(referralLink) ? '' : `\n${referralLink}`);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: isHe ? 'הקישור הועתק!' : 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const message = buildVoucherMessage();
    window.location.href = `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const stats = [
    { icon: Users, label: isHe ? 'הזמנות שנשלחו' : 'Invites Sent', value: '12' },
    { icon: TrendingUp, label: isHe ? 'נרשמו דרכך' : 'Signed Up', value: '4' },
    { icon: Gift, label: isHe ? 'קרדיט שנצבר' : 'Credits Earned', value: '₪316' },
  ];


  const handleShare = async () => {
    const shareText = buildVoucherMessage();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'GlowPush', text: shareText });
      } catch {}
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: isHe ? 'הטקסט הועתק!' : 'Text copied!' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-up opacity-0">
      {/* Hero CTA card — gold fill */}
      <button
        onClick={handleShare}
        className="w-full rounded-xl p-6 text-center transition-all active:scale-[0.97] cursor-pointer btn-gold-cta"
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Gift className="w-8 h-8 text-white" />
        </div>
        <h2 className="font-serif font-bold text-xl mb-1.5 text-white">
          {isHe ? 'הזמיני חברה והרוויחי 50 ₪' : 'Invite Friends & Earn ₪50'}
        </h2>
        <p className="text-xs leading-relaxed text-white/85 max-w-xs mx-auto">
          {isHe
            ? 'קבלי 50 ש"ח על כל חברה שנרשמת ונשארת מנויה לפחות 3 חודשים! ✨'
            : 'Get ₪50 for every friend who signs up and stays subscribed for at least 3 months! ✨'}
        </p>
      </button>

      {/* Referral link & share buttons */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="bg-muted rounded-xl p-4 max-w-lg mx-auto" dir="ltr">
          <label className="text-xs text-muted-foreground mb-2 block text-start">
            {isHe ? 'הקישור האישי שלך' : 'Your personal referral link'}
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm font-mono truncate text-start">
              <Link2 className="w-3.5 h-3.5 inline mr-2 text-accent" />
              {referralLink || (isHe ? 'טוען...' : 'Loading...')}
            </div>
            <Button
              onClick={copyLink}
              variant="outline"
              size="icon"
              className={`shrink-0 h-10 w-10 transition-all ${copied ? 'border-green-500 text-green-500' : 'border-accent text-accent hover:bg-accent hover:text-accent-foreground'}`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            onClick={shareWhatsApp}
            className="gap-2 rounded-xl"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle className="w-4 h-4" />
            {isHe ? 'שתפי בוואטסאפ' : 'Share on WhatsApp'}
          </Button>
          <Button
            onClick={copyLink}
            variant="outline"
            className="gap-2 rounded-xl border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          >
            <Copy className="w-4 h-4" />
            {isHe ? 'העתיקי קישור' : 'Copy Link'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 text-center">
            <stat.icon className="w-5 h-5 text-accent mx-auto mb-3" />
            <p className="text-2xl font-serif font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-serif font-semibold text-lg mb-4">
          {isHe ? 'איך זה עובד?' : 'How it works'}
        </h3>
        <div className="space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
          {[
            { step: '1', title: isHe ? 'שתפי את הקישור' : 'Share your link', desc: isHe ? 'שלחי את הקישור האישי שלך לקולגות בוואטסאפ או בכל אמצעי אחר' : 'Send your personal link to colleagues via WhatsApp or any other channel' },
            { step: '2', title: isHe ? 'החברה נרשמת' : 'Friend signs up', desc: isHe ? 'כשהחברה נרשמת דרך הקישור שלך, היא מקבלת חודש ראשון מתנה' : 'When your friend signs up through your link, they get their first month free' },
            { step: '3', title: isHe ? 'את מקבלת קרדיט' : 'You earn credit', desc: isHe ? 'ברגע שהחברה משלמת, את מקבלת קרדיט שמוריד מהחשבון החודשי שלך' : 'Once your friend pays, you get credit that reduces your monthly bill' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferralTab;
