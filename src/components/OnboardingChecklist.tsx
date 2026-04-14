import { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { CheckCircle, Upload, UserPlus, CreditCard, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  logoUrl: string;
  clients: { name: string }[];
  subscriptionTier: string;
  hasDigitalCard?: boolean;
  onOpenAddClient: () => void;
  onOpenProfile: () => void;
  onOpenDigitalCard: () => void;
  onOpenPush: () => void;
  onOpenHealing: () => void;
  userProfileId?: string | null;
}

export default function OnboardingChecklist({
  logoUrl,
  clients,
  subscriptionTier,
  hasDigitalCard,
  onOpenAddClient,
  onOpenProfile,
  onOpenDigitalCard,
  onOpenPush,
  onOpenHealing,
  userProfileId,
}: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const [dismissed, setDismissed] = useState(false);
  const [planName, setPlanName] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Re-check dismiss state whenever the real profileId becomes available
  useEffect(() => {
    if (!userProfileId) return;
    const key = `gp-checklist-dismissed-${userProfileId}`;
    if (localStorage.getItem(key) === '1') setDismissed(true);
  }, [userProfileId]);

  // Auto-detected states from DB
  const [pushMessagesDone, setPushMessagesDone] = useState(false);
  const [healingDone] = useState(true);

  // Query DB to auto-detect push messages and healing completion
  useEffect(() => {
    if (!userProfileId) {
      setLoaded(true);
      return;
    }

    const detect = async () => {
      // Check if artist has saved custom push message settings
      const { data: msgData } = await (supabase as any)
        .from('artist_message_settings')
        .select('id')
        .eq('artist_profile_id', userProfileId)
        .maybeSingle();
      if (msgData?.id) setPushMessagesDone(true);


      setLoaded(true);
    };

    detect();
  }, [userProfileId]);

  // Fetch dynamic plan name
  useEffect(() => {
    const slugMap: Record<string, string> = { lite: 'lite', professional: 'pro', master: 'elite' };
    const slug = slugMap[subscriptionTier] || subscriptionTier;
    supabase
      .from('pricing_plans')
      .select('name_he, name_en, slug')
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          const match = data.find(p => p.slug === slug) || data.find(p => p.slug.includes(subscriptionTier));
          if (match) setPlanName(isHe ? match.name_he : match.name_en);
        }
      });
  }, [subscriptionTier, isHe]);

  // All checks are auto-detected — no manual toggles
  const checks = useMemo(() => ({
    logo: !!(logoUrl && logoUrl.length > 5),
    client: clients.length > 0,
    card: !!hasDigitalCard,
    pushMessages: pushMessagesDone,
    healing: healingDone,
  }), [logoUrl, clients.length, hasDigitalCard, pushMessagesDone, healingDone]);

  const allDone = Object.values(checks).every(Boolean);
  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalSteps = 5;

  const persistDismiss = useCallback(() => {
    if (userProfileId) localStorage.setItem(`gp-checklist-dismissed-${userProfileId}`, '1');
    setDismissed(true);
  }, [userProfileId]);

  // Auto-dismiss permanently once all steps are complete — no need to show the success screen
  useEffect(() => {
    if (allDone && loaded && !dismissed) {
      persistDismiss();
    }
  }, [allDone, loaded, dismissed, persistDismiss]);

  if (!loaded || dismissed) return null;

  const displayPlanName = planName || subscriptionTier;

  const steps: { key: keyof typeof checks; icon: typeof Upload; label: string; tip?: string; action: () => void }[] = [
    {
      key: 'logo',
      icon: Upload,
      label: isHe ? 'העלי לוגו לעסק ✨' : 'Upload your business logo ✨',
      action: onOpenProfile,
    },
    {
      key: 'client',
      icon: UserPlus,
      label: isHe ? 'הוסיפי לקוחה ראשונה 👤' : 'Add your first client 👤',
      action: onOpenAddClient,
    },
    {
      key: 'card',
      icon: CreditCard,
      label: isHe ? 'הגדירי את הכרטיס הדיגיטלי שלך 💳' : 'Set up your Digital Card 💳',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: כרטיס דיגיטלי מעוצב משדר יוקרה ועוזר ללקוחות להמליץ עלייך.'
        : '💡 Tip: A styled digital card projects luxury and helps clients recommend you.',
      action: onOpenDigitalCard,
    },
    {
      key: 'pushMessages',
      icon: MessageSquare,
      label: isHe ? 'ערכי את הודעות הפוש האוטומטיות 🔔' : 'Edit your automated Push messages 🔔',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: ניסוח אישי של הפושים יגרום ללקוחות שלך להרגיש שאת מלווה אותן באמת!'
        : '💡 Tip: Personalized push messages make your clients feel truly cared for!',
      action: onOpenPush,
    },
    {
      key: 'healing',
      icon: Sparkles,
      label: isHe ? 'הגדירי מסע החלמה ראשון 💌' : 'Set up your first Healing Journey 💌',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: אוטומציה פה תחסוך לך 5 שעות של מענה בוואטסאפ בשבוע!'
        : '💡 Tip: Automation here saves you 5 hours of WhatsApp replies per week!',
      action: onOpenHealing,
    },
  ];

  return (
    <div
      className="rounded-3xl overflow-hidden animate-fade-up"
      style={{
        background: 'linear-gradient(160deg, hsl(40 45% 97%), hsl(38 40% 93%))',
        border: '1.5px solid hsl(38 55% 62% / 0.3)',
        boxShadow: '0 8px 32px hsl(38 55% 62% / 0.12)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 pt-5 pb-4"
        style={{ background: 'linear-gradient(135deg, hsl(38 55% 62% / 0.08), hsl(40 50% 72% / 0.15))' }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-base font-bold font-serif text-foreground leading-snug">
            {isHe
              ? `ברוכה הבאה למסלול ${displayPlanName}! 👑`
              : `Welcome to ${displayPlanName}! 👑`}
          </h3>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2.5 mt-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(38 30% 88%)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(completedCount / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, #B8860B, #D4AF37, #F9F295)',
              }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color: 'hsl(38 55% 50%)' }}>
            {completedCount}/{totalSteps}
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 pb-5 pt-2">
        <div className="space-y-2.5">
          {steps.map((step) => {
              const done = checks[step.key];
              return (
                <div key={step.key}>
                  <button
                    onClick={() => { if (!done) step.action(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-start transition-all active:scale-[0.98]"
                    style={{
                      background: done ? 'hsl(38 55% 62% / 0.08)' : 'rgba(255,255,255,0.7)',
                      border: done ? '1px solid hsl(38 55% 62% / 0.25)' : '1px solid hsl(38 30% 85%)',
                      cursor: done ? 'default' : 'pointer',
                    }}
                  >
                    {/* Status indicator — display only, not clickable */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: done
                          ? 'linear-gradient(135deg, #B8860B, #D4AF37)'
                          : 'transparent',
                        border: done ? 'none' : '2px solid hsl(38 30% 75%)',
                      }}
                    >
                      {done && <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />}
                    </div>
                    <span
                      className={`text-sm font-medium flex-1 transition-all ${done ? 'line-through opacity-60' : ''}`}
                      style={{ color: done ? 'hsl(38 40% 50%)' : 'hsl(30 20% 20%)' }}
                    >
                      {step.label}
                    </span>
                    {!done && (
                      <step.icon className="w-4 h-4 shrink-0" style={{ color: 'hsl(38 55% 62%)' }} />
                    )}
                  </button>
                  {step.tip && !done && (
                    <p className="text-[11px] text-muted-foreground pr-12 pl-3 mt-1 leading-relaxed">
                      {step.tip}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
}
