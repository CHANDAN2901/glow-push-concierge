import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Building2, ArrowRight, Gift, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import glowpushLogo from '@/assets/glowpush-logo.png';
import PostSignupInstallPrompt from '@/components/PostSignupInstallPrompt';
import { sendAuthNotification } from '@/lib/sendServerPushNotification';

type PromoStatus = 'idle' | 'checking' | 'valid_referral' | 'valid_academy' | 'invalid';
type PromoCodeType = 'ACADEMY' | 'GRADUATE' | 'INFLUENCERS' | 'generic' | null;

const Auth = () => {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');

  // Redirect already-logged-in users away from auth page
  useEffect(() => {
    if (!authLoading && user) {
      const from = (location.state as any)?.from?.pathname || '/artist';
      navigate(from, { replace: true });
    }
  }, [user, authLoading]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // Promo / referral state
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle');
  const [promoLabel, setPromoLabel] = useState('');
  const [referrerProfileId, setReferrerProfileId] = useState<string | null>(null);
  const [promoTag, setPromoTag] = useState<string | null>(null);
  const [promoCodeType, setPromoCodeType] = useState<PromoCodeType>(null);
  // Capture ?ref= from URL on mount
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setPromoCode(ref);
      setIsLogin(false); // switch to signup mode
      validatePromoCode(ref);
    }
  }, []);

  const validatePromoCode = async (code: string) => {
    if (!code.trim()) {
      setPromoStatus('idle');
      setPromoLabel('');
      return;
    }
    setPromoStatus('checking');
    setReferrerProfileId(null);
    setPromoTag(null);
    setPromoCodeType(null);

    const normalizedCode = code.trim().toLowerCase();

    // 1. Check if it's a referral code (from profiles table)
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, full_name, referral_code')
      .ilike('referral_code', normalizedCode)
      .maybeSingle();

    if (referrer) {
      setPromoStatus('valid_referral');
      setPromoLabel(referrer.full_name || 'Artist');
      setReferrerProfileId(referrer.id);
      return;
    }

    // 2. Check if it's an academy/company code (from promo_codes table)
    const { data: promo } = await supabase
      .from('promo_codes' as any)
      .select('*')
      .ilike('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (promo) {
      const p = promo as any;
      // Check max uses
      if (p.max_uses && p.current_uses >= p.max_uses) {
        setPromoStatus('invalid');
        setPromoLabel('');
        return;
      }
      setPromoStatus('valid_academy');
      setPromoLabel(p.label || p.code_type);
      setPromoTag(`${p.code_type}_${p.label || p.code}`.replace(/\s+/g, '_'));
      return;
    }

    setPromoStatus('invalid');
    setPromoLabel('');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: lang === 'en' ? 'Enter your email first' : 'הכניסי את המייל קודם',
        variant: 'destructive',
      });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: lang === 'en' ? 'Error' : 'שגיאה', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: lang === 'en' ? 'Check your email!' : 'בדקי את המייל!',
        description: lang === 'en' ? 'We sent a password reset link.' : 'שלחנו לך קישור לאיפוס סיסמה.',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // 🔔 Push notification on LOGIN FAILURE
          void sendAuthNotification({
            type: 'login_error',
            title: lang === 'en' ? 'Login Failed ❌' : 'התחברות נכשלה ❌',
            body: lang === 'en' ? 'Please check your credentials and try again' : 'אנא בדקי את פרטי ההתחברות ונסי שוב',
          });
          throw error;
        }
        
        toast({ title: lang === 'en' ? 'Welcome back!' : 'ברוכה השבה!' });

        // 🔔 Push notification on LOGIN SUCCESS
        void sendAuthNotification({
          type: 'login_success',
          title: lang === 'en' ? 'Welcome Back! 👋' : 'ברוכה השבה! 👋',
          body: lang === 'en' ? "You're now signed in to your studio" : 'התחברת לסטודיו שלך',
        });

        const from = (location.state as any)?.from?.pathname || '/artist';
        navigate(from, { replace: true });
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              studio_name: studioName,
            },
          },
        });
        
        if (error) {
          // 🔔 Push notification on SIGNUP FAILURE
          void sendAuthNotification({
            type: 'signup_error',
            title: lang === 'en' ? 'Signup Failed ❌' : 'הרשמה נכשלה ❌',
            body: lang === 'en' ? 'Please check your details and try again' : 'אנא בדקי את הפרטים ונסי שוב',
          });
          throw error;
        }

        // 🔔 Push notification on SIGNUP SUCCESS
        void sendAuthNotification({
          type: 'signup_success',
          title: lang === 'en' ? 'Welcome to Glow Push! ✨' : 'ברוכה הבאה ל-Glow Push! ✨',
          body: lang === 'en' ? 'Your account has been created successfully!' : 'החשבון שלך נוצר בהצלחה!',
        });

        // After signup, apply promo/referral benefits once the profile row exists
        if (signUpData?.user && (promoStatus === 'valid_referral' || promoStatus === 'valid_academy')) {
          const userId = signUpData.user.id;

          // Poll for the profile row — DB trigger may take a few seconds
          const waitForProfile = async (): Promise<string | null> => {
            for (let i = 0; i < 10; i++) {
              await new Promise(r => setTimeout(r, 1500));
              const { data } = await supabase
                .from('profiles')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
              if (data?.id) return data.id;
            }
            return null;
          };

          // Run in background — don't block the UI
          (async () => {
            try {
              const newProfileId = await waitForProfile();
              if (!newProfileId) {
                console.warn('[Promo] Profile not found after retries for user', userId);
                return;
              }

              if (promoStatus === 'valid_referral' && referrerProfileId) {
                // 1. Mark new user as referred + grant 1 free month via subscription_status
                await supabase.from('profiles').update({
                  referred_by_profile_id: referrerProfileId,
                  promo_code_used: promoCode.trim(),
                  subscription_status: 'active',
                }).eq('id', newProfileId);

                // 2. Create a completed referral record with reward
                await supabase.from('referrals').insert({
                  referrer_profile_id: referrerProfileId,
                  referred_profile_id: newProfileId,
                  referred_email: email,
                  referral_code: promoCode.trim(),
                  status: 'converted',
                  converted_at: new Date().toISOString(),
                  reward_credit: 50,
                });

                // 3. Credit the referrer ₪50
                const { data: referrerProfile } = await supabase
                  .from('profiles')
                  .select('referral_credit')
                  .eq('id', referrerProfileId)
                  .maybeSingle();
                const currentCredit = referrerProfile?.referral_credit ?? 0;
                await supabase.from('profiles').update({
                  referral_credit: currentCredit + 50,
                }).eq('id', referrerProfileId);
              }

              if (promoStatus === 'valid_academy' && promoTag) {
                // 1. Fetch how many free months this promo gives
                const { data: promoRow } = await supabase
                  .from('promo_codes' as any)
                  .select('free_months')
                  .ilike('code', promoCode.trim())
                  .maybeSingle() as { data: { free_months: number | null } | null };

                const freeMonths = promoRow?.free_months ?? 1;

                // 2. Apply benefit to new user
                await supabase.from('profiles').update({
                  promo_code_used: promoCode.trim(),
                  promo_tag: promoTag,
                  subscription_status: freeMonths > 0 ? 'active' : undefined,
                }).eq('id', newProfileId);

                // 3. Increment promo usage counter
                await supabase.rpc('increment_promo_usage' as any, { promo_code_value: promoCode.trim() });
              }
            } catch (err) {
              console.warn('[Promo] Client-side apply failed:', err);
            }

            // Always call RPC as safety net — SECURITY DEFINER bypasses RLS so it
            // handles whatever the client-side steps couldn't. Idempotent: skips
            // silently if the referral record already exists for this user.
            const { error: rpcErr } = await supabase.rpc('apply_referral_benefits' as any, {
              p_new_user_id: userId,
              p_referral_code: promoCode.trim(),
            });
            if (rpcErr) console.warn('[Promo] RPC fallback error:', rpcErr.message);
          })();
        }

        const hasPromo = promoStatus === 'valid_referral' || promoStatus === 'valid_academy';
        toast({
          title: hasPromo
            ? (lang === 'en' ? 'Welcome to Glow Push!' : 'ברוכה הבאה ל-Glow Push!')
            : (lang === 'en' ? 'Check your email!' : 'בדקי את המייל!'),
          description: hasPromo
            ? (lang === 'en' ? 'Your signup benefit has been activated!' : 'הטבת ההצטרפות שלך הופעלה!')
            : (lang === 'en' ? 'We sent a confirmation link to your email.' : 'שלחנו לך קישור אישור למייל.'),
        });

        // Show install prompt after signup
        setTimeout(() => setShowInstallPrompt(true), 1500);
      }
    } catch (err: any) {
      toast({
        title: lang === 'en' ? 'Error' : 'שגיאה',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const promoStatusMessage = () => {
    switch (promoStatus) {
      case 'checking':
        return null;
      case 'valid_referral':
        return (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Check className="w-3.5 h-3.5" style={{ color: '#B8860B' }} />
            <span className="text-xs font-medium" style={{ color: '#B8860B' }}>
              {lang === 'en' ? `Referral from ${promoLabel} applied!` : `קוד ה-VIP זוהה! ההטבה עודכנה בהצלחה`}
            </span>
          </div>
        );
      case 'valid_academy':
        return (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Check className="w-3.5 h-3.5" style={{ color: '#B8860B' }} />
            <span className="text-xs font-medium" style={{ color: '#B8860B' }}>
              {lang === 'en' ? 'VIP code recognized! Benefit applied.' : 'קוד ה-VIP זוהה! ההטבה עודכנה בהצלחה'}
            </span>
          </div>
        );
      case 'invalid':
        return (
          <div className="flex items-center gap-1.5 mt-1.5">
            <X className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-medium text-destructive">
              {lang === 'en' ? 'Code not found, please check again.' : 'קוד לא נמצא, אנא בדקי שנית'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(145deg, #fcf9f8 0%, #f6f3f2 40%, #f0edec 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <img
              src={glowpushLogo}
              alt="Glow Push"
              className="h-20 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.3)]"
            />
          </div>
          <h1
            className="text-2xl font-serif tracking-wide"
            style={{ fontWeight: 300, color: 'hsl(0 0% 15%)' }}
          >
            {isLogin
              ? (lang === 'en' ? 'Welcome Back' : 'ברוכה השבה')
              : (lang === 'en' ? 'Create Your Account' : 'צרי את חשבון האמנית שלך')}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'hsl(38 40% 45%)', fontWeight: 300 }}>
            {isLogin
              ? (lang === 'en' ? 'Sign in to your studio' : 'התחברי לסטודיו שלך')
              : (lang === 'en' ? 'Join the beauty community' : 'הצטרפי לקהילת היופי')}
          </p>
        </div>

        <div
          className="rounded-3xl p-8"
          style={{
            background: '#FFFFFF',
            border: '1px solid hsl(38 40% 82%)',
            boxShadow: '0 8px 40px -12px hsla(38, 55%, 62%, 0.12)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)', letterSpacing: '0.03em' }}>{lang === 'en' ? 'Full Name' : 'שם מלא'}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder={lang === 'en' ? 'Your name' : 'השם שלך'}
                      className="pl-10 h-12 rounded-2xl bg-white text-base"
                      style={{ border: '1px solid hsl(38 40% 82%)', color: 'hsl(0 0% 15%)' }}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)', letterSpacing: '0.03em' }}>{lang === 'en' ? 'Studio Name' : 'שם הסטודיו'}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
                    <Input
                      value={studioName}
                      onChange={e => setStudioName(e.target.value)}
                      placeholder={lang === 'en' ? 'Studio name' : 'שם הסטודיו'}
                      className="pl-10 h-12 rounded-2xl bg-white text-base"
                      style={{ border: '1px solid hsl(38 40% 82%)', color: 'hsl(0 0% 15%)' }}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)', letterSpacing: '0.03em' }}>{lang === 'en' ? 'Email' : 'אימייל'}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 h-12 rounded-2xl bg-white text-base"
                  style={{ border: '1px solid hsl(38 40% 82%)', color: 'hsl(0 0% 15%)' }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)', letterSpacing: '0.03em' }}>{lang === 'en' ? 'Password' : 'סיסמה'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12 rounded-2xl bg-white text-base"
                  style={{ border: '1px solid hsl(38 40% 82%)', color: 'hsl(0 0% 15%)' }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-muted/50 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />
                    : <Eye className="w-4 h-4" style={{ color: 'hsl(38 55% 62%)' }} />}
                </button>
              </div>
            </div>

            {/* Promo / Referral Code Field - only in signup mode */}
            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)', letterSpacing: '0.03em' }}>
                  {lang === 'en' ? 'Have a promo, academy, or referral code?' : 'יש לך קוד קופון, קוד אקדמיה או קוד חברה?'}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#D4AF37' }} />
                    <Input
                      value={promoCode}
                      onChange={e => {
                        setPromoCode(e.target.value);
                        if (promoStatus !== 'idle') setPromoStatus('idle');
                      }}
                      placeholder={lang === 'en' ? 'Enter code' : 'הזיני קוד'}
                      className="pl-10 h-12 rounded-2xl bg-white text-base"
                      style={{
                        border: promoStatus === 'valid_referral' || promoStatus === 'valid_academy'
                          ? '2px solid #D4AF37'
                          : promoStatus === 'invalid'
                            ? '2px solid hsl(var(--destructive))'
                            : '1px solid hsl(38 40% 82%)',
                        color: 'hsl(0 0% 15%)',
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validatePromoCode(promoCode)}
                    disabled={!promoCode.trim() || promoStatus === 'checking'}
                    className="h-12 px-5 rounded-2xl font-serif"
                    style={{ borderColor: '#D4AF37', color: '#4a3636' }}
                  >
                    {promoStatus === 'checking' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      lang === 'en' ? 'Apply' : 'החל'
                    )}
                  </Button>
                </div>
                {promoStatusMessage()}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-13 rounded-2xl text-base font-serif tracking-wide border-none"
              style={{
                background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))',
                color: '#4a3636',
                fontWeight: 400,
                fontSize: '1rem',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 20px -4px hsl(38 55% 62% / 0.4)',
              }}
            >
              {loading
                ? '...'
                : isLogin
                  ? (lang === 'en' ? 'Sign In' : 'התחברי')
                  : (lang === 'en' ? 'Create Account' : 'צרי חשבון')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {isLogin && (
            <div className="mt-5 text-center">
              <button
                onClick={handleForgotPassword}
                className="text-sm transition-colors"
                style={{ color: 'hsl(38 40% 45%)', fontWeight: 300 }}
              >
                {lang === 'en' ? 'Forgot password?' : 'שכחת סיסמה?'}
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm transition-colors font-serif"
              style={{ color: 'hsl(38 40% 45%)', fontWeight: 400 }}
            >
              {isLogin
                ? (lang === 'en' ? "Don't have an account? Sign up" : 'אין לך חשבון? הרשמי')
                : (lang === 'en' ? 'Already have an account? Sign in' : 'כבר יש לך חשבון? התחברי')}
            </button>
          </div>
        </div>

        {/* Legal link */}
        <div className="text-center mt-6 flex items-center justify-center gap-3">
          <Link to="/legal" className="text-xs transition-colors" style={{ color: 'hsl(38 40% 55%)' }}>
            {lang === 'en' ? 'Terms & Cancellation Policy' : 'תקנון ותנאי שימוש'}
          </Link>
          <span className="text-xs" style={{ color: 'hsl(38 40% 75%)' }}>·</span>
          <Link to="/privacy" className="text-xs transition-colors" style={{ color: 'hsl(38 40% 55%)' }}>
            {lang === 'en' ? 'Privacy Policy' : 'מדיניות פרטיות'}
          </Link>
        </div>
      </div>

      <PostSignupInstallPrompt
        open={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
      />
    </div>
  );
};

export default Auth;
