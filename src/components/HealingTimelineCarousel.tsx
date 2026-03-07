import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useHealingPhases, HealingPhase } from '@/hooks/useHealingPhases';
import healingCharsImg from '@/assets/healing-characters.jpg';

interface TimelineStep {
  dayLabel: string;
  dayLabelEn: string;
  dayRange: [number, number];
  instruction: string;
  instructionEn: string;
  col: number;
  row: number;
}

const DEFAULT_STEPS: TimelineStep[] = [
  { dayLabel: 'יום 1', dayLabelEn: 'Day 1', dayRange: [1, 1], instruction: 'שמרי על האזור נקי ויבש. מרחי משחה בעדינות. הצבע כהה היום — זה טבעי!', instructionEn: 'Keep the area clean and dry. Apply ointment gently. Color is dark today — totally normal!', col: 2, row: 0 },
  { dayLabel: 'ימים 2-4', dayLabelEn: 'Days 2-4', dayRange: [2, 4], instruction: 'הפיגמנט מתחמצן ומכהה — ידהה בקרוב. המשיכי למרוח משחה.', instructionEn: 'The pigment oxidizes and darkens — it will fade soon. Keep applying ointment.', col: 1, row: 0 },
  { dayLabel: 'ימים 5-7', dayLabelEn: 'Days 5-7', dayRange: [5, 7], instruction: 'לא לקלף! תני לגלד ליפול לבד כדי לשמור על הפיגמנט.', instructionEn: "Don't peel! Let scabs fall off naturally to preserve pigment.", col: 0, row: 0 },
  { dayLabel: 'ימים 8-10', dayLabelEn: 'Days 8-10', dayRange: [8, 10], instruction: 'שלב ה-Ghosting — הצבע ייראה בהיר מאוד. הוא יחזור!', instructionEn: 'Ghosting phase — color looks very light. It will come back!', col: 2, row: 1 },
  { dayLabel: 'ימים 14-28', dayLabelEn: 'Days 14-28', dayRange: [14, 28], instruction: 'הצבע מתייצב. שמרי על הגנה מהשמש.', instructionEn: 'Color is stabilizing. Protect from sun exposure.', col: 1, row: 1 },
  { dayLabel: 'יום 42', dayLabelEn: 'Day 42', dayRange: [30, 60], instruction: 'מושלם! הגיע הזמן לקבוע תור לטאצ׳ אפ.', instructionEn: "Perfect! Time to schedule your touch-up.", col: 0, row: 1 },
];

function getActiveStepIndex(steps: TimelineStep[], currentDay: number): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    if (currentDay >= steps[i].dayRange[0]) return i;
  }
  return 0;
}

interface Props {
  currentDay: number;
  artistProfileId?: string | null;
  treatment?: 'eyebrows' | 'lips';
}

export default function HealingTimelineCarousel({ currentDay, artistProfileId, treatment = 'eyebrows' }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [steps, setSteps] = useState<TimelineStep[]>(DEFAULT_STEPS);
  const { phases } = useHealingPhases(treatment);

  // Merge DB healing phases into steps as consolidated instructions
  useEffect(() => {
    if (phases.length > 0) {
      setSteps(prev => prev.map(s => {
        const midDay = Math.floor((s.dayRange[0] + s.dayRange[1]) / 2);
        const phase = phases.find(p => midDay >= p.day_start && midDay <= p.day_end);
        if (phase) {
          return {
            ...s,
            instruction: phase.steps_he.join(' '),
            instructionEn: phase.steps_en.join(' '),
          };
        }
        return s;
      }));
    }
  }, [phases]);

  // Load artist-specific overrides from DB
  useEffect(() => {
    if (!artistProfileId) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from('timeline_content' as any)
          .select('*')
          .eq('artist_profile_id', artistProfileId);
        if (data && data.length > 0) {
          setSteps(prev => prev.map((s, i) => {
            const row = (data as any[]).find((r: any) => r.step_index === i);
            if (!row) return s;
            return {
              ...s,
              instruction: row.quote_he || s.instruction,
              instructionEn: row.quote_en || s.instructionEn,
            };
          }));
        }
      } catch (e) {
        console.error('Failed to load timeline content:', e);
      }
    };
    load();
  }, [artistProfileId]);

  const activeIdx = getActiveStepIndex(steps, currentDay);

  // Auto-select active step
  useEffect(() => {
    setSelectedIdx(activeIdx);
  }, [activeIdx]);

  // Scroll to active card on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.children[activeIdx] as HTMLElement | undefined;
    if (card) {
      const offset = card.offsetLeft - el.offsetWidth / 2 + card.offsetWidth / 2;
      el.scrollTo({ left: offset, behavior: 'smooth' });
    }
  }, [activeIdx]);

  // Sync selected index on scroll (swipe detection)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let timeout: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const children = Array.from(el.children) as HTMLElement[];
        const center = el.scrollLeft + el.offsetWidth / 2;
        let closest = 0;
        let minDist = Infinity;
        children.forEach((child, i) => {
          const childCenter = child.offsetLeft + child.offsetWidth / 2;
          const dist = Math.abs(center - childCenter);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        setSelectedIdx(closest);
      }, 80);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(timeout); el.removeEventListener('scroll', onScroll); };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const displayStep = selectedIdx !== null ? steps[selectedIdx] : steps[activeIdx];
  const displayIdx = selectedIdx !== null ? selectedIdx : activeIdx;

  return (
    <div
      className="rounded-3xl py-6 mb-6 animate-fade-up opacity-0"
      style={{
        animationDelay: '280ms',
        backgroundColor: 'hsl(0 0% 100%)',
        boxShadow: '0 4px 24px hsl(350 30% 88% / 0.35)',
        border: '1px solid hsl(350 30% 92%)',
      }}
    >
      {/* Section title */}
      <div
        className="px-6 py-3 mb-4 flex items-center gap-2 rounded-2xl mx-4"
        style={{
          background: 'linear-gradient(135deg, #ff074d 0%, #ff4d7a 40%, #ff8da6 70%, #ffb3c6 100%)',
        }}
      >
        <span className="text-lg">✨</span>
        <h2
          className="text-lg tracking-wider"
          style={{
            color: '#ffffff',
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            textShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
        >
          {isHe ? 'מסע ההחלמה שלך' : 'Your Healing Journey'}
        </h2>
      </div>

      {/* Scroll arrows */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-110"
          style={{
            left: 4,
            background: 'hsl(0 0% 100% / 0.85)',
            border: '1px solid hsl(38 40% 82%)',
            color: 'hsl(36 50% 42%)',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-110"
          style={{
            right: 4,
            background: 'hsl(0 0% 100% / 0.85)',
            border: '1px solid hsl(38 40% 82%)',
            color: 'hsl(36 50% 42%)',
          }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Scrollable cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-6 pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
          dir="ltr"
        >
          {steps.map((step, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            const isSelected = i === displayIdx;

            return (
              <div
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`snap-center flex-shrink-0 rounded-2xl flex flex-col items-center transition-all duration-300 cursor-pointer ${
                  isActive ? 'scale-[1.03]' : isPast ? 'opacity-60' : 'opacity-80'
                }`}
                style={{
                  width: 180,
                  padding: '16px 12px 12px',
                  background: isActive
                    ? 'linear-gradient(180deg, hsl(40 50% 97%), hsl(40 40% 94%))'
                    : 'hsl(0 0% 99%)',
                  border: isActive
                    ? '2px solid hsl(38 55% 62%)'
                    : isSelected
                    ? '2px dashed hsl(38 55% 62%)'
                    : '1px solid hsl(350 30% 92%)',
                  boxShadow: isActive
                    ? '0 0 20px hsl(38 55% 62% / 0.25), 0 4px 12px hsl(38 40% 50% / 0.1)'
                    : isSelected
                    ? '0 0 12px hsl(38 55% 62% / 0.15)'
                    : '0 1px 4px hsl(0 0% 0% / 0.04)',
                }}
              >
                {/* Day label */}
                <div
                  className="px-4 py-1 rounded-full text-xs font-bold mb-3 tracking-wide"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, hsl(36 50% 42%), hsl(38 55% 58%) 40%, hsl(40 50% 72%) 60%, hsl(36 50% 42%))'
                      : 'hsl(40 40% 92%)',
                    color: isActive ? 'hsl(0 0% 100%)' : 'hsl(36 50% 42%)',
                    boxShadow: isActive
                      ? '0 2px 8px hsl(38 55% 50% / 0.3)'
                      : 'none',
                  }}
                >
                  {isHe ? step.dayLabel : step.dayLabelEn}
                </div>

                {/* Character illustration */}
                <div
                  className="w-[120px] h-[120px] rounded-full overflow-hidden mb-3 flex-shrink-0"
                  style={{
                    border: isActive
                      ? '3px solid hsl(38 55% 62%)'
                      : '2px solid hsl(350 30% 92%)',
                    boxShadow: isActive
                      ? '0 0 12px hsl(38 55% 62% / 0.2)'
                      : 'none',
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${healingCharsImg})`,
                      backgroundSize: '300% 200%',
                      backgroundPosition: `${step.col * 50}% ${step.row * 100}%`,
                    }}
                  />
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: isPast
                        ? 'hsl(142 60% 45%)'
                        : isActive
                        ? 'hsl(38 55% 62%)'
                        : 'hsl(0 0% 80%)',
                    }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: 'hsl(0 0% 50%)' }}>
                    {isPast
                      ? (isHe ? 'הושלם ✓' : 'Done ✓')
                      : isActive
                      ? (isHe ? 'עכשיו' : 'Now')
                      : (isHe ? 'בקרוב' : 'Soon')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gold connector dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3 px-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedIdx(i)}
            style={{
              width: i === displayIdx ? 20 : 6,
              height: 6,
              background: i === displayIdx
                ? 'linear-gradient(90deg, hsl(36 50% 42%), hsl(38 55% 62%))'
                : i < activeIdx
                ? 'hsl(38 55% 62%)'
                : 'hsl(350 30% 88%)',
            }}
          />
        ))}
      </div>

      {/* Consolidated instruction panel */}
      <div className="px-6 mt-5">
        <div
          className="rounded-2xl p-5 transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, hsl(40 50% 97%), hsl(40 40% 95%))',
            border: '1.5px solid hsl(38 40% 85%)',
            boxShadow: '0 2px 12px hsl(38 30% 50% / 0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📋</span>
            <h3
              className="text-sm tracking-wide font-medium"
              style={{ color: 'hsl(36 50% 30%)', fontFamily: 'var(--font-serif)' }}
            >
              {isHe
                ? `הנחיות — ${displayStep.dayLabel}`
                : `Instructions — ${displayStep.dayLabelEn}`}
            </h3>
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{
              color: 'hsl(30 15% 25%)',
              direction: isHe ? 'rtl' : 'ltr',
              fontWeight: 400,
            }}
          >
            {isHe ? displayStep.instruction : displayStep.instructionEn}
          </p>
        </div>
      </div>
    </div>
  );
}
