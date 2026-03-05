import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { CheckCircle, Upload, UserPlus, CreditCard, Sparkles, MessageSquare } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  logoUrl: string;
  clients: { name: string }[];
  subscriptionTier: string;
  onOpenDigitalCard: () => void;
  onOpenAddClient: () => void;
  onOpenTemplateEditor?: () => void;
  userProfileId?: string | null;
}

const COMPLETED_KEY = 'gp-onboarding-checklist-complete';

interface CheckState {
  logo: boolean;
  client: boolean;
  card: boolean;
  pushMessages: boolean;
  healing: boolean;
}

export default function OnboardingChecklist({ logoUrl, clients, subscriptionTier, onOpenDigitalCard, onOpenAddClient, onOpenTemplateEditor, userProfileId }: Props) {
  const { lang } = useI18n();
  const navigate = useNavigate();
  const isHe = lang === 'he';

  const [dismissed, setDismissed] = useState(false);
  const [planName, setPlanName] = useState('');
  const [manualChecks, setManualChecks] = useState<Partial<CheckState>>({});
  const [loaded, setLoaded] = useState(false);

  // Load checklist state from DB
  useEffect(() => {
    if (!userProfileId) {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('gp-onboarding-checklist');
        if (raw) setManualChecks(JSON.parse(raw));
        setDismissed(!!localStorage.getItem(COMPLETED_KEY));
      } catch {}
      setLoaded(true);
      return;
    }
    const load = async () => {
      const db = supabase as any;
      const { data } = await db
        .from('profiles')
        .select('onboarding_checklist_state, onboarding_checklist_dismissed')
        .eq('id', userProfileId)
        .single();
      if (data) {
        if (data.onboarding_checklist_state && typeof data.onboarding_checklist_state === 'object') {
          setManualChecks(data.onboarding_checklist_state);
        }
        if (data.onboarding_checklist_dismissed) {
          setDismissed(true);
        }
      }
      setLoaded(true);
    };
    load();
  }, [userProfileId]);

  // Persist checklist state to DB
  const persistChecklist = useCallback(async (checks: Partial<CheckState>, isDismissed?: boolean) => {
    if (!userProfileId) {
      localStorage.setItem('gp-onboarding-checklist', JSON.stringify(checks));
      if (isDismissed) localStorage.setItem(COMPLETED_KEY, '1');
      return;
    }
    const db = supabase as any;
    const update: any = { onboarding_checklist_state: checks };
    if (isDismissed !== undefined) update.onboarding_checklist_dismissed = isDismissed;
    await db.from('profiles').update(update).eq('id', userProfileId);
  }, [userProfileId]);

  // Fetch dynamic plan name from pricing_plans table
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
          if (match) {
            setPlanName(isHe ? match.name_he : match.name_en);
          }
        }
      });
  }, [subscriptionTier, isHe]);

  // Auto-detect completion
  const checks: CheckState = useMemo(() => ({
    logo: !!(logoUrl && logoUrl.length > 5) || !!manualChecks.logo,
    client: clients.length > 0 || !!manualChecks.client,
    card: !!manualChecks.card,
    pushMessages: !!manualChecks.pushMessages,
    healing: !!manualChecks.healing,
  }), [logoUrl, clients.length, manualChecks]);

  const allDone = Object.values(checks).every(Boolean);
  const completedCount = Object.values(checks).filter(Boolean).length;
  const totalSteps = 5;

  // Fire confetti when all done
  useEffect(() => {
    if (allDone && !dismissed && loaded) {
      persistChecklist(manualChecks, true);
      // Gold confetti burst
      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          origin: { y: 0.6 },
          colors: ['#D4AF37', '#F9F295', '#B8860B', '#FFF8DC', '#DAA520'],
          ...opts,
          particleCount: Math.floor(120 * particleRatio),
        });
      };
      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    }
  }, [allDone, dismissed]);

  if (!loaded || dismissed) return null;

  const displayPlanName = planName || subscriptionTier;

  const toggleCheck = (key: keyof CheckState) => {
    try {
      const updated = { ...manualChecks, [key]: !manualChecks[key] };
      setManualChecks(updated);
      persistChecklist(updated);
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
    }
  };

  const steps: { key: keyof CheckState; icon: typeof Upload; label: string; tip?: string; action: () => void }[] = [
    {
      key: 'logo',
      icon: Upload,
      label: isHe ? 'העלי לוגו לעסק ✨' : 'Upload your business logo ✨',
      action: () => { navigate('/artist?tab=profile'); },
    },
    {
      key: 'client',
      icon: UserPlus,
      label: isHe ? 'הוסיפי לקוחה ראשונה 👤' : 'Add your first client 👤',
      action: () => { onOpenAddClient(); },
    },
    {
      key: 'card',
      icon: CreditCard,
      label: isHe ? 'הגדירי את הכרטיס הדיגיטלי שלך 💳' : 'Set up your Digital Card 💳',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: כרטיס דיגיטלי מעוצב משדר יוקרה ועוזר ללקוחות להמליץ עלייך.'
        : '💡 Tip: A styled digital card projects luxury and helps clients recommend you.',
      action: () => { navigate('/artist?tab=profile'); },
    },
    {
      key: 'pushMessages',
      icon: MessageSquare,
      label: isHe ? 'ערכי את הודעות הפוש האוטומטיות 🔔' : 'Edit your automated Push messages 🔔',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: ניסוח אישי של הפושים יגרום ללקוחות שלך להרגיש שאת מלווה אותן באמת!'
        : '💡 Tip: Personalized push messages make your clients feel truly cared for!',
      action: () => { navigate('/artist?tab=push'); },
    },
    {
      key: 'healing',
      icon: Sparkles,
      label: isHe ? 'הגדירי מסע החלמה ראשון 💌' : 'Set up your first Healing Journey 💌',
      tip: isHe
        ? '💡 טיפ מ-Glow Push: אוטומציה פה תחסוך לך 5 שעות של מענה בוואטסאפ בשבוע!'
        : '💡 Tip: Automation here saves you 5 hours of WhatsApp replies per week!',
      action: () => { navigate('/admin/timeline-settings'); },
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
        style={{
          background: 'linear-gradient(135deg, hsl(38 55% 62% / 0.08), hsl(40 50% 72% / 0.15))',
        }}
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

      {/* Steps or success */}
      <div className="px-5 pb-5 pt-2">
        {allDone ? (
          <div className="text-center py-6 animate-scale-in">
            <div
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
              style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295)' }}
            >
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-lg font-bold font-serif text-foreground mb-2">
              {isHe ? 'אלופה!' : 'Amazing!'}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {isHe
                ? 'הקליניקה שלך עכשיו חכמה, ממותגת ומוכנה לעבוד על אוטומט 🚀'
                : 'Your clinic is now smart, branded, and ready to run on autopilot 🚀'}
            </p>
            <button
              onClick={() => {
                setDismissed(true);
                persistChecklist(manualChecks, true);
              }}
              className="mt-4 px-5 py-2 rounded-full text-sm font-serif font-semibold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #B8860B, #D4AF37, #F9F295, #D4AF37, #B8860B)',
                color: '#5C4033',
              }}
            >
              {isHe ? 'סגרי את הצ׳קליסט' : 'Dismiss'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {steps.map((step) => {
              const done = checks[step.key];
              return (
                <div key={step.key}>
                  <div
                    className="w-full flex items-center gap-3 p-3 rounded-2xl text-start transition-all"
                    style={{
                      background: done ? 'hsl(38 55% 62% / 0.08)' : 'rgba(255,255,255,0.7)',
                      border: done ? '1px solid hsl(38 55% 62% / 0.25)' : '1px solid hsl(38 30% 85%)',
                    }}
                  >
                    {/* Checkbox - toggles check state */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCheck(step.key); }}
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
                      style={{
                        background: done
                          ? 'linear-gradient(135deg, #B8860B, #D4AF37)'
                          : 'transparent',
                        border: done ? 'none' : '2px solid hsl(38 30% 75%)',
                      }}
                    >
                      {done && <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />}
                    </button>
                    {/* Row text + icon - navigates */}
                    <button
                      onClick={() => step.action()}
                      className="flex items-center gap-2 flex-1 text-start active:scale-[0.98] transition-all"
                    >
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
                  </div>
                  {step.tip && !done && (
                    <p className="text-[11px] text-muted-foreground pr-12 pl-3 mt-1 leading-relaxed">
                      {step.tip}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
