import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { Upload, Sparkles, UserPlus, ChevronLeft, ChevronRight, CheckCircle, X, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const goldColor = 'hsl(38, 55%, 62%)';

interface Props {
  open: boolean;
  onClose: () => void;
  userProfileId: string | null;
  currentLogoUrl: string;
  currentName: string;
  currentPhone: string;
  onProfileUpdated: () => void;
}

export default function OnboardingWizard({
  open,
  onClose,
  userProfileId,
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
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [logoPreview, setLogoPreview] = useState(currentLogoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(currentName);
  const [businessPhone, setBusinessPhone] = useState(currentPhone);
  const [saving, setSaving] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfileId) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${userProfileId}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('portfolio')
        .getPublicUrl(path);

      setLogoUrl(urlData.publicUrl);
      toast({ title: isHe ? 'הלוגו הועלה בהצלחה ✅' : 'Logo uploaded ✅' });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      toast({ title: isHe ? 'שגיאה בהעלאת הלוגו' : 'Logo upload failed', variant: 'destructive' });
      setLogoPreview(logoUrl);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (!open) return null;

  const totalSteps = 3;

  const saveStep1 = async () => {
    if (!userProfileId) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        logo_url: logoUrl || null,
        full_name: businessName || null,
        business_phone: businessPhone || null,
      }).eq('id', userProfileId);
      onProfileUpdated();
      toast({ title: isHe ? 'הפרטים נשמרו ✅' : 'Details saved ✅' });
    } catch {}
    setSaving(false);
    setStep(1);
  };

  const steps = [
    // Step 1: Logo & Details
    <div key="step1" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))` }}>
          <Upload className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'פרטי הסטודיו שלך' : 'Your Studio Details'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'הלוגו והפרטים יופיעו בכרטיס הביקור ובטפסים' : 'Logo & details will appear on your card & forms'}
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)' }}>
            {isHe ? 'לוגו העסק' : 'Business Logo'}
          </Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-3 h-24 rounded-xl cursor-pointer transition-colors hover:opacity-80"
            style={{
              border: '2px dashed hsl(38 40% 82%)',
              background: logoPreview ? 'transparent' : 'hsl(38 55% 62% / 0.04)',
            }}
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
          <Input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className="h-11 rounded-xl"
            style={{ border: '1px solid hsl(38 40% 82%)' }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: 'hsl(38 40% 45%)' }}>
            {isHe ? 'טלפון עסקי' : 'Business Phone'}
          </Label>
          <Input
            value={businessPhone}
            onChange={e => setBusinessPhone(e.target.value)}
            dir="ltr"
            inputMode="tel"
            className="h-11 rounded-xl"
            style={{ border: '1px solid hsl(38 40% 82%)' }}
          />
        </div>
      </div>

      <Button
        onClick={saveStep1}
        disabled={saving}
        className="w-full h-12 rounded-xl font-serif text-base"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
          color: '#4a3636',
          border: 'none',
        }}
      >
        {saving ? '...' : isHe ? 'שמירה והמשך' : 'Save & Continue'}
      </Button>
    </div>,

    // Step 2: Timeline Settings
    <div key="step2" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))` }}>
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'מסע ההחלמה' : 'Healing Journey'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'התאימי את שלבי ההחלמה שהלקוחות שלך יראו' : 'Customize the healing phases your clients will see'}
        </p>
      </div>

      <div
        className="rounded-2xl p-5 text-center"
        style={{
          background: 'linear-gradient(135deg, hsl(38 55% 62% / 0.06), hsl(40 50% 72% / 0.12))',
          border: '1.5px solid hsl(38 55% 62% / 0.25)',
        }}
      >
        <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: goldColor }} />
        <p className="text-sm font-medium text-foreground mb-1">
          {isHe ? 'עורכת מסע ההחלמה' : 'Healing Journey Editor'}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {isHe ? 'ערכי את ההוראות, הטיפים והציטוטים לכל שלב' : 'Edit instructions, tips & quotes for each phase'}
        </p>
        <Button
          onClick={() => navigate('/admin/timeline-settings')}
          className="rounded-xl font-serif"
          style={{
            background: '#ffffff',
            border: '2px solid #D4AF37',
            color: '#4a3636',
          }}
        >
          {isHe ? 'פתיחת עורך הטיימליין' : 'Open Timeline Editor'}
        </Button>
      </div>

      <Button
        onClick={() => setStep(2)}
        className="w-full h-12 rounded-xl font-serif text-base"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
          color: '#4a3636',
          border: 'none',
        }}
      >
        {isHe ? 'המשך לשלב הבא' : 'Continue'}
      </Button>
    </div>,

    // Step 3: Add First Client Tip
    <div key="step3" className="space-y-5 animate-fade-up">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))` }}>
          <UserPlus className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-foreground">
          {isHe ? 'הוספת לקוחה ראשונה' : 'Add Your First Client'}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isHe ? 'הכל מוכן! הנה איך להתחיל' : "Everything's ready! Here's how to start"}
        </p>
      </div>

      <div className="space-y-3">
        {[
          { num: '1', text: isHe ? 'לחצי על כפתור ה-➕ הזהב בראש המסך' : 'Tap the golden ➕ button at the top' },
          { num: '2', text: isHe ? 'הזיני שם, טלפון וסוג טיפול' : 'Enter name, phone & treatment type' },
          { num: '3', text: isHe ? 'שלחי ללקוחה את הקישור בוואטסאפ' : 'Send the link to your client via WhatsApp' },
        ].map((item) => (
          <div
            key={item.num}
            className="flex items-center gap-3 p-3.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid hsl(38 55% 62% / 0.2)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))', color: '#fff' }}
            >
              {item.num}
            </div>
            <p className="text-sm text-foreground font-medium">{item.text}</p>
          </div>
        ))}
      </div>

      <Button
        onClick={async () => {
          localStorage.setItem('gp-onboarding-done', '1');
          if (userProfileId) {
            await supabase.from('profiles').update({ onboarding_checklist_dismissed: true }).eq('id', userProfileId);
          }
          onClose();
          toast({
            title: isHe ? '🎉 הקליניקה הדיגיטלית שלך מוכנה!' : '🎉 Your digital clinic is ready!',
          });
        }}
        className="w-full h-12 rounded-xl font-serif text-base"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
          color: '#4a3636',
          border: 'none',
        }}
      >
        <CheckCircle className="w-5 h-5 mr-2" />
        {isHe ? 'יאללה, מתחילות! 🚀' : "Let's Go! 🚀"}
      </Button>
    </div>,
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl p-7 max-h-[90vh] overflow-y-auto"
        style={{
          background: '#FFFFFF',
          border: '2px solid hsl(38 55% 62% / 0.3)',
          boxShadow: '0 20px 60px -10px hsla(38, 55%, 62%, 0.25)',
        }}
      >
        {/* Close button */}
        <button
          onClick={async () => { localStorage.setItem('gp-onboarding-done', '1'); if (userProfileId) { await supabase.from('profiles').update({ onboarding_checklist_dismissed: true }).eq('id', userProfileId); } onClose(); }}
          className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Welcome heading (only on first step) */}
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
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '8px',
                background: i <= step
                  ? 'linear-gradient(135deg, #B8860B, #D4AF37)'
                  : 'hsl(38 30% 85%)',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        {steps[step]}

        {/* Back button for steps > 0 */}
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-3 w-full text-center text-sm font-serif transition-colors"
            style={{ color: 'hsl(38 40% 45%)' }}
          >
            {isHe ? '← חזרה' : '← Back'}
          </button>
        )}
      </div>
    </div>
  );
}
