import { useState } from 'react';
import {
  ArrowRight, MessageCircle, Plus, CheckCircle, Clock,
  Droplets, Ban, Heart, Sparkles, Camera, Calendar, XCircle,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAftercareTemplates } from '@/hooks/useAftercareTemplates';
import { useToast } from '@/hooks/use-toast';
import { useHealingPhases, HealingPhase } from '@/hooks/useHealingPhases';

interface TimelineStep {
  day: number;
  icon: React.ReactNode;
  emoji: string;
  titleHe: string;
  titleEn: string;
  descHe: string;
  descEn: string;
  status: 'sent' | 'pending' | 'scheduled';
  scheduledDate?: string;
  messageKey?: string;
  isCustom?: boolean;
}

interface HealingJourneyTimelineProps {
  clientName: string;
  clientPhone: string;
  treatmentType: string;
  treatmentDay: number;
  treatmentStartDate?: string;
  artistName: string;
  onBack: () => void;
  onCancel?: () => void;
  waSentLog: Record<string, string>;
  onSendWhatsApp: (day: number, message: string) => void;
}

/* ── Current-phase label from DB ── */
function getCurrentPhaseFromDB(day: number, phases: HealingPhase[], isHe: boolean): { label: string; emoji: string } {
  const phase = phases.find(p => day >= p.day_start && day <= p.day_end);
  if (phase) return { label: isHe ? phase.title_he : phase.title_en, emoji: phase.icon };
  if (phases.length > 0 && day > phases[phases.length - 1].day_end) return { label: isHe ? 'הושלם' : 'Completed', emoji: '🎉' };
  return { label: isHe ? 'מסע החלמה' : 'Healing Journey', emoji: '✨' };
}

function isLipsTreatment(treatmentType: string): boolean {
  return treatmentType.includes('שפתיים') || treatmentType.toLowerCase().includes('lip');
}

function buildStepsFromPhases(
  phases: HealingPhase[],
  currentDay: number,
  startDate: string,
  sentLog: Record<string, string>,
  clientName: string,
): TimelineStep[] {
  const start = new Date(startDate);
  const formatDateTime = (dayOffset: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(9, 0, 0, 0);
    return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} · 09:00`;
  };

  const getStatus = (day: number): 'sent' | 'pending' | 'scheduled' => {
    const logKey = `${clientName}-day${day}`;
    if (sentLog[logKey]) return 'sent';
    if (currentDay >= day) return 'pending';
    return 'scheduled';
  };

  const dayZero: TimelineStep = {
    day: 0,
    icon: <CheckCircle className="w-5 h-5" />,
    emoji: '✅',
    titleHe: 'טיפול בוצע',
    titleEn: 'Treatment Completed',
    descHe: 'הטיפול בוצע בהצלחה — מסע ההחלמה התחיל!',
    descEn: 'Treatment completed — healing journey started!',
    status: 'sent' as const,
  };

  const phaseSteps: TimelineStep[] = phases.map(p => ({
    day: p.day_start,
    icon: <Heart className="w-5 h-5" />,
    emoji: p.icon,
    titleHe: p.title_he,
    titleEn: p.title_en,
    descHe: p.steps_he.join(' ') || p.title_he,
    descEn: p.steps_en.join(' ') || p.title_en,
    status: getStatus(p.day_start),
    scheduledDate: formatDateTime(p.day_start),
    messageKey: `phase_${p.sort_order}`,
  }));

  return [dayZero, ...phaseSteps];
}

const STATUS_CONFIG = {
  sent: {
    labelHe: '✅ נשלח',
    labelEn: '✅ Sent',
    bg: 'bg-green-100',
    text: 'text-green-700',
    dotColor: '#22c55e',
    borderColor: 'border-green-400',
    bgCircle: 'bg-green-50',
  },
  pending: {
    labelHe: '⏳ ממתין',
    labelEn: '⏳ Pending',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    dotColor: '#D4AF37',
    borderColor: 'border-amber-400',
    bgCircle: 'bg-amber-50',
  },
  scheduled: {
    labelHe: '📅 מתוזמן',
    labelEn: '📅 Scheduled',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    dotColor: '#aaa',
    borderColor: 'border-border',
    bgCircle: 'bg-card',
  },
};

export default function HealingJourneyTimeline({
  clientName,
  clientPhone,
  treatmentType,
  treatmentDay,
  treatmentStartDate,
  artistName,
  onBack,
  onCancel,
  waSentLog,
  onSendWhatsApp,
}: HealingJourneyTimelineProps) {
  const { lang } = useI18n();
  const { toast } = useToast();
  const isHe = lang === 'he';
  const { buildWhatsAppText } = useAftercareTemplates();
  const treatment: 'eyebrows' | 'lips' = isLipsTreatment(treatmentType) ? 'lips' : 'eyebrows';
  const { phases } = useHealingPhases(treatment);

  const startDate = treatmentStartDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() - treatmentDay);
    return d.toISOString().split('T')[0];
  })();

  const [customAlerts, setCustomAlerts] = useState<TimelineStep[]>([]);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customDay, setCustomDay] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const defaultSteps = buildStepsFromPhases(phases, treatmentDay, startDate, waSentLog, clientName);
  const allSteps = [...defaultSteps, ...customAlerts].sort((a, b) => a.day - b.day);
  const phase = getCurrentPhaseFromDB(treatmentDay, phases, isHe);

  const handleSendManual = (step: TimelineStep) => {
    const msg = buildWhatsAppText(step.day || 1, clientName, artistName);
    onSendWhatsApp(step.day, msg);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onBack();
    }
    toast({ title: isHe ? 'מסע ההחלמה בוטל' : 'Healing journey cancelled' });
  };

  const addCustomAlert = () => {
    const dayNum = parseInt(customDay);
    if (isNaN(dayNum) || dayNum < 0 || !customTitle.trim()) return;
    const start = new Date(startDate);
    start.setDate(start.getDate() + dayNum);
    const scheduledDate = start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });

    setCustomAlerts(prev => [
      ...prev,
      {
        day: dayNum,
        icon: <Sparkles className="w-5 h-5" />,
        emoji: '💬',
        titleHe: customTitle,
        titleEn: customTitle,
        descHe: customDesc || customTitle,
        descEn: customDesc || customTitle,
        status: treatmentDay >= dayNum ? 'pending' : 'scheduled',
        scheduledDate,
        isCustom: true,
      },
    ]);
    setCustomDay('');
    setCustomTitle('');
    setCustomDesc('');
    setShowAddCustom(false);
  };

  const lips = isLipsTreatment(treatmentType);

  return (
    <div className="space-y-5 animate-fade-up" dir={isHe ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center border border-border hover:bg-accent/10 transition-all shrink-0"
        >
          <ArrowRight className={`w-5 h-5 text-foreground ${isHe ? '' : 'rotate-180'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <h1
            className="text-lg font-bold truncate bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #B8860B)' }}
          >
            {isHe ? 'מסע ההחלמה התחיל!' : 'Healing Journey Started!'}
          </h1>
          <p className="text-xs font-bold text-foreground mt-0.5">
            {clientName} · {lips ? (isHe ? '👄 שפתיים' : '👄 Lips') : (isHe ? '✨ גבות' : '✨ Brows')}
          </p>
        </div>
      </div>

      {/* ── Current Status Card ── */}
      <div
        className="rounded-2xl p-5 border border-border/40 relative overflow-hidden"
        style={{ background: 'hsl(0 0% 100%)' }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37, #B8860B)' }}
        />
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-foreground/60 uppercase tracking-wider mb-1">
              {isHe ? 'סטטוס נוכחי' : 'Current Status'}
            </p>
            <p className="text-xl font-bold text-foreground">
              {phase.emoji} {isHe ? `היום: יום ${treatmentDay}` : `Today: Day ${treatmentDay}`}
            </p>
            <p className="text-sm font-bold text-foreground/80 mt-0.5">{phase.label}</p>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #B8860B)' }}
            >
              {Math.min(Math.round((treatmentDay / 30) * 100), 100)}%
            </div>
            <p className="text-[10px] font-bold text-foreground/50">{isHe ? 'התקדמות' : 'Progress'}</p>
          </div>
        </div>
        <div className="w-full h-2.5 rounded-full bg-card/80 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min((treatmentDay / 30) * 100, 100)}%`,
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #B8860B)',
            }}
          />
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        {/* Golden vertical connector line */}
        <div
          className={`absolute top-6 bottom-6 w-[2px] ${isHe ? 'right-[23px]' : 'left-[23px]'}`}
          style={{
            background: 'linear-gradient(180deg, #D4AF37 0%, #B8860B 50%, #D4AF37 100%)',
            opacity: 0.4,
            zIndex: 0,
          }}
        />

        <div className="space-y-0">
          {allSteps.map((step, i) => {
            const sc = STATUS_CONFIG[step.status];
            const isCurrentStep =
              i < allSteps.length - 1
                ? treatmentDay >= step.day && treatmentDay < allSteps[i + 1].day
                : treatmentDay >= step.day;

            return (
              <div key={`${step.day}-${i}`} className="relative flex items-start gap-4 py-4">
                {/* Circle node with golden day number */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${sc.borderColor} ${sc.bgCircle} ${
                    isCurrentStep ? 'ring-2 ring-offset-2 ring-accent/50 scale-110' : ''
                  }`}
                  style={isCurrentStep ? { borderColor: '#D4AF37' } : undefined}
                >
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-lg">{step.emoji}</span>
                  </div>
                </div>

                {/* Content card */}
                <div
                  className={`flex-1 min-w-0 rounded-xl p-3 border transition-all ${
                    isCurrentStep
                      ? 'border-accent/40 bg-card shadow-sm'
                      : 'border-transparent bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-bold text-accent">
                      {step.day === 0 ? (isHe ? 'יום 0' : 'Day 0') : (isHe ? `יום ${step.day}` : `Day ${step.day}`)}
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {isHe ? step.titleHe : step.titleEn}
                    </p>
                    {step.isCustom && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#B8860B' }}
                      >
                        {isHe ? 'מותאם' : 'Custom'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-foreground/60 font-medium mb-2 leading-relaxed">
                    {isHe ? step.descHe : step.descEn}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${sc.bg} ${sc.text}`}>
                      {isHe ? sc.labelHe : sc.labelEn}
                    </span>
                    {step.scheduledDate && step.status === 'scheduled' && (
                      <span className="text-[10px] text-foreground/50 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {step.scheduledDate}
                      </span>
                    )}
                    {step.status === 'sent' && waSentLog[`${clientName}-day${step.day}`] && (
                      <span className="text-[10px] text-foreground/50 font-medium">
                        {waSentLog[`${clientName}-day${step.day}`]}
                      </span>
                    )}
                  </div>
                </div>

                {/* WhatsApp golden button */}
                {step.day > 0 && (
                  <button
                    onClick={() => handleSendManual(step)}
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center border border-black transition-all active:scale-95 hover:shadow-lg mt-0.5"
                    style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)' }}
                    title={isHe ? 'שלחי בוואטסאפ' : 'Send via WhatsApp'}
                  >
                    <MessageCircle className="w-5 h-5 text-black" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Add Custom Alert ── */}
      {showAddCustom ? (
        <div className="rounded-2xl border border-border p-4 bg-card space-y-3 animate-fade-up">
          <p className="text-sm font-bold text-foreground">
            {isHe ? 'הוסיפי הודעה מותאמת אישית למסע זה' : 'Add a custom message to this journey'}
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={60}
              placeholder={isHe ? 'יום' : 'Day'}
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              className="w-20"
            />
            <Input
              placeholder={isHe ? 'כותרת' : 'Title'}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="flex-1"
            />
          </div>
          <Input
            placeholder={isHe ? 'תיאור (אופציונלי)' : 'Description (optional)'}
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={addCustomAlert} variant="gold" size="sm" className="flex-1">
              <Plus className="w-4 h-4" />
              {isHe ? 'הוסיפי' : 'Add'}
            </Button>
            <Button onClick={() => setShowAddCustom(false)} variant="outline" size="sm">
              {isHe ? 'ביטול' : 'Cancel'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCustom(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold border border-black transition-all active:scale-95 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)', color: '#4a3636' }}
        >
          <Plus className="w-4 h-4" />
          {isHe ? 'הוסיפי הודעה מותאמת אישית למסע זה' : 'Add custom message to this journey'}
        </button>
      )}

      {/* ── Cancel Journey ── */}
      <button
        onClick={handleCancel}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all active:scale-[0.97]"
      >
        <XCircle className="w-4 h-4" />
        {isHe ? 'ביטול מסע' : 'Cancel Journey'}
      </button>
    </div>
  );
}
