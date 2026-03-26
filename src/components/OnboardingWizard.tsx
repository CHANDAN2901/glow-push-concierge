import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import {
  Upload, Sparkles, UserPlus, CheckCircle, X, Camera, Loader2,
  CreditCard, Heart, Users, Link, Globe, MapPin, Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ClientImportDialog from '@/components/ClientImportDialog';

const goldColor = 'hsl(38, 55%, 62%)';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  userProfileId: string | null;
  currentLogoUrl: string;
  currentName: string;
  currentPhone: string;
  onProfileUpdated: () => void;
}

export default function OnboardingWizard({
  open,
  onClose,
  userId,
  userProfileId: initialProfileId,
  currentLogoUrl,
  currentName,
  currentPhone,
  onProfileUpdated,
}: Props) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const [step, setStep] = useState(0);

  // Resolved profile ID — starts from prop, falls back to DB lookup by userId
  const [resolvedProfileId, setResolvedProfileId] = useState<string | null>(initialProfileId);

  /**
   * Ensure we have a profile ID before saving.
   * 1. Return cached value if already resolved.
   * 2. Try to SELECT the existing row (trigger may have just created it).
   * 3. If still missing, INSERT a minimal row — RLS allows users to insert their own profile.
   */
  const getProfileId = async (): Promise<string | null> => {
    if (resolvedProfileId) return resolvedProfileId;
    if (!userId) return null;

    // 1. Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing?.id) {
      setResolvedProfileId(existing.id);
      return existing.id;
    }

    // 2. Trigger hasn't fired yet — create the profile client-side
    const { data: inserted } = await supabase
      .from('profiles')
      .insert({ user_id: userId })
      .select('id')
      .single();

    if (inserted?.id) {
      setResolvedProfileId(inserted.id);
      onProfileUpdated(); // refresh dashboard state
      return inserted.id;
    }

    return null;
  };

  // Step 1 — Business Profile
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [logoPreview, setLogoPreview] = useState(currentLogoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(currentName);
  const [businessPhone, setBusinessPhone] = useState(currentPhone);
  const [savingStep1, setSavingStep1] = useState(false);

  // Step 2 — Digital Business Card
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [waze, setWaze] = useState('');
  const [cardPhone, setCardPhone] = useState(currentPhone);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 5 — Import
  const [showImport, setShowImport] = useState(false);

  const totalSteps = 5;

  if (!open) return null;

  // ─── Logo upload ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const profileId = await getProfileId();
    if (!profileId) return;

    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${profileId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('portfolio').getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
      toast({ title: isHe ? 'הלוגו הועלה בהצלחה ✅' : 'Logo uploaded ✅' });
    } catch {
      toast({ title: isHe ? 'שגיאה בהעלאת הלוגו' : 'Logo upload failed', variant: 'destructive' });
      setLogoPreview(logoUrl);
    } finally {
      setUploadingLogo(false);
    }
  };

  // ─── Save helpers ────────────────────────────────────────────────────────────
  const saveStep1 = async () => {
    setSavingStep1(true);
    const profileId = await getProfileId();
    if (!profileId) {
      toast({ title: isHe ? 'הפרופיל עדיין נוצר, נסי שוב' : 'Profile not ready yet, please retry', variant: 'destructive' });
      setSavingStep1(false);
      return;
    }
    try {
      await supabase.from('profiles').update({
        logo_url: logoUrl || null,
        full_name: businessName || null,
        business_phone: businessPhone || null,
      }).eq('id', profileId);
      onProfileUpdated();
      toast({ title: isHe ? 'הפרטים נשמרו ✅' : 'Details saved ✅' });
    } catch {
      toast({ title: isHe ? 'שגיאה בשמירה' : 'Save failed', variant: 'destructive' });
    }
    setSavingStep1(false);
    setStep(1);
  };

  const saveStep2 = async () => {
    setSavingStep2(true);
    const profileId = await getProfileId();
    if (!profileId) { setSavingStep2(false); setStep(2); return; }
    try {
      await supabase.from('profiles').update({
        instagram_url: instagram || null,
        facebook_url: facebook || null,
        waze_address: waze || null,
        business_phone: cardPhone || null,
      }).eq('id', profileId);
      onProfileUpdated();
      toast({ title: isHe ? 'הכרטיס הדיגיטלי נשמר ✅' : 'Digital card saved ✅' });
    } catch {}
    setSavingStep2(false);
    setStep(2);
  };

  const finishOnboarding = async () => {
    localStorage.setItem('gp-onboarding-done', '1');
    const profileId = await getProfileId();
    if (profileId) {
      await supabase.from('profiles')
        .update({ onboarding_checklist_dismissed: true })
        .eq('id', profileId);
    }
    onClose();
    toast({ title: isHe ? '🎉 הקליניקה הדיגיטלית שלך מוכנה!' : '🎉 Your digital clinic is ready!' });
  };

  // ─── Step content ────────────────────────────────────────────────────────────
  const steps = [

    // ── Step 1: Business Profile ──────────────────────────────────────────────
    <div key="step1" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
          <Upload className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'פרטי הסטודיו שלך' : 'Your Studio Details'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'הלוגו והפרטים יופיעו בכרטיס הביקור ובטפסים' : 'Logo & details appear on your card & forms'}
        </p>
      </div>

      <div className="space-y-3">
        {/* Logo upload */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)' }}>
            {isHe ? 'לוגו העסק' : 'Business Logo'}
          </Label>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 h-24 rounded-xl cursor-pointer transition-colors hover:opacity-80"
            style={{ border: '2px dashed hsl(38 40% 82%)', background: logoPreview ? 'transparent' : 'hsl(38 55% 62% / 0.04)' }}
          >
            {uploadingLogo ? (
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: goldColor }} />
            ) : logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-16 w-16 object-contain rounded-lg" />
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Camera className="w-6 h-6" style={{ color: goldColor }} />
                <span className="text-xs" style={{ color: 'hsl(38 40% 45%)' }}>
                  {isHe ? 'לחצי להעלאת לוגו' : 'Tap to upload logo'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)' }}>
            {isHe ? 'שם העסק' : 'Business Name'}
          </Label>
          <Input value={businessName} onChange={e => setBusinessName(e.target.value)}
            className="h-11 rounded-xl" style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)' }}>
            {isHe ? 'טלפון עסקי' : 'Business Phone'}
          </Label>
          <Input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
            dir="ltr" inputMode="tel" className="h-11 rounded-xl"
            style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>
      </div>

      <Button onClick={saveStep1} disabled={savingStep1} className="w-full h-12 rounded-xl font-serif text-base"
        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)', color: '#4a3636', border: 'none' }}>
        {savingStep1 ? '...' : isHe ? 'שמירה והמשך ←' : 'Save & Continue →'}
      </Button>
    </div>,

    // ── Step 2: Digital Business Card ─────────────────────────────────────────
    <div key="step2" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
          <CreditCard className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'כרטיס הביקור הדיגיטלי' : 'Digital Business Card'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'פרטי יצירת קשר ורשתות חברתיות ללקוחות' : 'Contact details & social links for clients'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            <Link className="w-3.5 h-3.5" /> Instagram
          </Label>
          <Input value={instagram} onChange={e => setInstagram(e.target.value)}
            dir="ltr" placeholder="https://instagram.com/yourstudio"
            className="h-11 rounded-xl" style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            <Globe className="w-3.5 h-3.5" /> Facebook
          </Label>
          <Input value={facebook} onChange={e => setFacebook(e.target.value)}
            dir="ltr" placeholder="https://facebook.com/yourstudio"
            className="h-11 rounded-xl" style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            <MapPin className="w-3.5 h-3.5" /> {isHe ? 'כתובת Waze' : 'Waze Address'}
          </Label>
          <Input value={waze} onChange={e => setWaze(e.target.value)}
            placeholder={isHe ? 'רחוב הדוגמה 1, תל אביב' : '1 Example St, Tel Aviv'}
            className="h-11 rounded-xl" style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'hsl(38 40% 45%)' }}>
            <Phone className="w-3.5 h-3.5" /> {isHe ? 'טלפון ליצירת קשר' : 'Contact Phone'}
          </Label>
          <Input value={cardPhone} onChange={e => setCardPhone(e.target.value)}
            dir="ltr" inputMode="tel" className="h-11 rounded-xl"
            style={{ border: '1px solid hsl(38 40% 82%)' }} />
        </div>
      </div>

      <Button onClick={saveStep2} disabled={savingStep2} className="w-full h-12 rounded-xl font-serif text-base"
        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)', color: '#4a3636', border: 'none' }}>
        {savingStep2 ? '...' : isHe ? 'שמירה והמשך ←' : 'Save & Continue →'}
      </Button>

      <button onClick={() => setStep(2)} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
        {isHe ? 'דלגי להמשך' : 'Skip for now'}
      </button>
    </div>,

    // ── Step 3: Recovery Journey Setup ───────────────────────────────────────
    <div key="step3" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
          <Heart className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'מסע ההחלמה' : 'Recovery Journey Setup'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'הגדירי את תזמון התראות ה-Push ללקוחות שלך' : 'Define when push notifications are sent to clients'}
        </p>
      </div>

      <div className="rounded-2xl p-5 space-y-4"
        style={{ background: 'linear-gradient(135deg, hsl(38 55% 62% / 0.06), hsl(40 50% 72% / 0.12))', border: '1.5px solid hsl(38 55% 62% / 0.25)' }}>
        <Sparkles className="w-8 h-8 mx-auto" style={{ color: goldColor }} />
        <p className="text-sm text-center font-medium text-foreground">
          {isHe ? 'עורך מסע ההחלמה כולל עריכת שלבים, ציטוטים ותזמון' : 'Timeline editor lets you set phases, tips & notification timing'}
        </p>
        <Button
          onClick={() => { navigate('/admin/timeline-settings'); onClose(); }}
          className="w-full rounded-xl font-serif"
          style={{ background: '#ffffff', border: '2px solid #D4AF37', color: '#4a3636' }}>
          {isHe ? 'פתחי את עורך הטיימליין' : 'Open Timeline Editor'}
        </Button>
      </div>

      <Button onClick={() => setStep(3)} className="w-full h-12 rounded-xl font-serif text-base"
        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)', color: '#4a3636', border: 'none' }}>
        {isHe ? 'המשך להגדרות הבאות ←' : 'Continue →'}
      </Button>
    </div>,

    // ── Step 4: Health Declaration Setup ─────────────────────────────────────
    <div key="step4" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'הצהרת הבריאות' : 'Health Declaration Setup'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'הכניסי שאלון רפואי ומדיניות הקליניקה' : 'Enter medical questionnaire & clinic policy'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'hsl(38 40% 97%)', border: '1px solid hsl(38 40% 85%)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))', color: '#fff' }}>1</div>
          <div>
            <p className="text-sm font-medium text-foreground">{isHe ? 'שאלון רפואי' : 'Medical Questionnaire'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHe ? 'ערכי את השאלות הרפואיות שהלקוחות ימלאו' : 'Edit the health questions clients fill out'}
            </p>
            <button
              onClick={() => { navigate('/artist?section=health-questions'); onClose(); }}
              className="mt-2 text-xs font-medium underline"
              style={{ color: goldColor }}>
              {isHe ? 'עריכת שאלות ←' : 'Edit questions →'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: 'hsl(38 40% 97%)', border: '1px solid hsl(38 40% 85%)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))', color: '#fff' }}>2</div>
          <div>
            <p className="text-sm font-medium text-foreground">{isHe ? 'מדיניות הקליניקה' : 'Clinic Policy'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isHe ? 'הגדירי את כתב ויתור שהלקוחות יחתמו' : 'Set the consent text clients sign'}
            </p>
            <button
              onClick={() => { navigate('/artist?section=clinic-policy'); onClose(); }}
              className="mt-2 text-xs font-medium underline"
              style={{ color: goldColor }}>
              {isHe ? 'עריכת מדיניות ←' : 'Edit policy →'}
            </button>
          </div>
        </div>
      </div>

      <Button onClick={() => setStep(4)} className="w-full h-12 rounded-xl font-serif text-base"
        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)', color: '#4a3636', border: 'none' }}>
        {isHe ? 'המשך ←' : 'Continue →'}
      </Button>
    </div>,

    // ── Step 5: Import Contacts / First Client ────────────────────────────────
    <div key="step5" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
          <Users className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'ייבוא לקוחות' : 'Import Clients'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'ייבאי אנשי קשר קיימים או הוסיפי לקוחה ראשונה' : 'Import existing contacts or add your first client'}
        </p>
      </div>

      <div className="space-y-3">
        {/* CSV import */}
        <button
          onClick={() => setShowImport(true)}
          className="w-full p-4 rounded-2xl flex items-center gap-3 text-start transition-colors hover:opacity-80"
          style={{ background: 'hsl(38 40% 97%)', border: '1.5px solid hsl(38 55% 62% / 0.35)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))' }}>
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{isHe ? 'ייבוא מ-CSV' : 'Import from CSV'}</p>
            <p className="text-xs text-muted-foreground">{isHe ? 'העלי קובץ אנשי קשר מהטלפון' : 'Upload a contacts file from your phone'}</p>
          </div>
        </button>

        {/* Manual add */}
        <button
          onClick={() => { finishOnboarding(); navigate('/artist?add=client'); }}
          className="w-full p-4 rounded-2xl flex items-center gap-3 text-start transition-colors hover:opacity-80"
          style={{ background: 'hsl(38 40% 97%)', border: '1px solid hsl(38 40% 85%)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'hsl(38 40% 90%)' }}>
            <UserPlus className="w-5 h-5" style={{ color: goldColor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{isHe ? 'הוספה ידנית' : 'Add manually'}</p>
            <p className="text-xs text-muted-foreground">{isHe ? 'הוסיפי לקוחה חדשה עכשיו' : 'Add a new client right now'}</p>
          </div>
        </button>
      </div>

      <Button onClick={finishOnboarding} className="w-full h-12 rounded-xl font-serif text-base"
        style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)', color: '#4a3636', border: 'none' }}>
        <CheckCircle className="w-5 h-5 mr-2" />
        {isHe ? 'יאללה, מתחילות! 🚀' : "Let's Go! 🚀"}
      </Button>
    </div>,
  ];

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div
          className="relative w-full max-w-md mx-4 rounded-3xl p-7 max-h-[90vh] overflow-y-auto"
          style={{
            background: '#FFFFFF',
            border: '2px solid hsl(38 55% 62% / 0.3)',
            boxShadow: '0 20px 60px -10px hsla(38, 55%, 62%, 0.25)',
          }}
        >
          {/* Close / skip all */}
          <button
            onClick={async () => {
              localStorage.setItem('gp-onboarding-done', '1');
              const pid = resolvedProfileId ?? (await getProfileId());
              if (pid) {
                await supabase.from('profiles').update({ onboarding_checklist_dismissed: true }).eq('id', pid);
              }
              onClose();
            }}
            className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Welcome heading */}
          {step === 0 && (
            <div className="text-center mb-6">
              <h2 className="text-xl font-serif font-bold text-foreground mb-1">
                {isHe ? 'ברוכה הבאה ל-GlowPush! ✨' : 'Welcome to GlowPush! ✨'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isHe ? 'בואי נגדיר את הקליניקה הדיגיטלית שלך' : "Let's set up your digital clinic"}
              </p>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '24px' : '8px',
                  background: i <= step
                    ? 'linear-gradient(135deg, #B8860B, #D4AF37)'
                    : 'hsl(38 30% 85%)',
                }} />
            ))}
          </div>

          {/* Step label */}
          <p className="text-center text-xs text-muted-foreground mb-4">
            {isHe ? `שלב ${step + 1} מתוך ${totalSteps}` : `Step ${step + 1} of ${totalSteps}`}
          </p>

          {steps[step]}

          {step > 0 && (
            <button onClick={() => setStep(step - 1)}
              className="mt-3 w-full text-center text-sm font-serif transition-colors"
              style={{ color: 'hsl(38 40% 45%)' }}>
              {isHe ? '→ חזרה' : '← Back'}
            </button>
          )}
        </div>
      </div>

      {/* Client import dialog — triggered from step 5 */}
      {showImport && resolvedProfileId && (
        <ClientImportDialog
          open={showImport}
          onOpenChange={(v) => setShowImport(v)}
          artistProfileId={resolvedProfileId}
          lang={lang}
          onImportComplete={() => setShowImport(false)}
        />
      )}
    </>
  );
}
