import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { isLegacyTimelineOverride } from '@/lib/timeline-overrides';
import { useClientHealingPhases } from '@/hooks/useClientHealingPhases';
import type { HealingPhase } from '@/hooks/useHealingPhases';
import healingCharsImg from '@/assets/healing-characters.jpg';

interface TimelineStep {
  dayLabel: string;
  dayLabelEn: string;
  dayRange: [number, number];
  instruction: string;
  instructionEn: string;
  col: number;
  row: number;
  imageUrl?: string | null;
}

function phasesToSteps(phases: HealingPhase[]): TimelineStep[] {
  return phases.map((p, i) => {
    const col = (phases.length - 1 - i) % 3;
    const row = Math.floor(i / 3);
    const dayLabel = p.day_start === p.day_end ? `יום ${p.day_start}` : `ימים ${p.day_start}-${p.day_end}`;
    const dayLabelEn = p.day_start === p.day_end ? `Day ${p.day_start}` : `Days ${p.day_start}-${p.day_end}`;
    return {
      dayLabel,
      dayLabelEn,
      dayRange: [p.day_start, p.day_end] as [number, number],
      instruction: p.steps_he.join(' ') || p.title_he,
      instructionEn: p.steps_en.join(' ') || p.title_en,
      col,
      row,
      imageUrl: p.image_url,
    };
  });
}

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
  clientId?: string | null;
}

export default function HealingTimelineCarousel({ currentDay, artistProfileId, treatment = 'eyebrows', clientId }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const { phases } = useClientHealingPhases(clientId, treatment);
  const [artistOverrides, setArtistOverrides] = useState<any[]>([]);

  // Build steps entirely from DB phases
  const steps = phases.length > 0 ? phasesToSteps(phases) : [];

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
          setArtistOverrides(data as any[]);
        }
      } catch (e) {
        console.error('Failed to load timeline content:', e);
      }
    };
    load();
  }, [artistProfileId]);

  // Apply artist overrides on top of DB steps
  const finalSteps = steps.map((s, i) => {
    const row = artistOverrides.find((r: any) => r.step_index === i);
    if (!row || isLegacyTimelineOverride(row.quote_he, row.quote_en)) return s;
    return {
      ...s,
      instruction: row.quote_he || s.instruction,
      instructionEn: row.quote_en || s.instructionEn,
    };
  });

  const activeIdx = getActiveStepIndex(finalSteps, currentDay);

  // Auto-select active step
  useEffect(() => {
    setSelectedIdx(activeIdx);
  }, [activeIdx]);

  // Scroll to active card on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || finalSteps.length === 0) return;
    const card = el.children[activeIdx] as HTMLElement | undefined;
    if (card) {
      const offset = card.offsetLeft - el.offsetWidth / 2 + card.offsetWidth / 2;
      el.scrollTo({ left: offset, behavior: 'smooth' });
    }
  }, [activeIdx, finalSteps.length]);

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

  if (finalSteps.length === 0) {
    return (
      <div className="rounded-3xl py-6 mb-6 text-center" style={{ backgroundColor: 'hsl(0 0% 100%)' }}>
        <p style={{ color: 'hsl(0 0% 60%)' }}>{isHe ? 'טוען מסע החלמה...' : 'Loading healing journey...'}</p>
      </div>
    );
  }

  const displayIdx = selectedIdx !== null ? selectedIdx : activeIdx;
  const displayStep = finalSteps[displayIdx];

  return (
    <div
      className="rounded-3xl py-6 mb-6 animate-fade-up opacity-0"
      style={{
        animationDelay: '280ms',
        backgroundColor: 'hsl(0 0% 100%)',
        boxShadow: '0 4px 24px hsl(38 35% 82% / 0.35)',
        border: '1px solid hsl(38 35% 90%)',
      }}
    >
      {/* Section title */}
      <div className="px-6 mb-4 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <h2
          className="text-lg tracking-wider"
          style={{
            color: 'hsl(30 15% 22%)',
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
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
          {finalSteps.map((step, i) => {
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
                    : '1px solid hsl(38 35% 90%)',
                  boxShadow: isActive
                    ? '0 0 20px hsl(38 55% 62% / 0.25), 0 4px 12px hsl(38 40% 50% / 0.1)'
                    : isSelected
                    ? '0 0 12px hsl(38 55% 62% / 0.15)'
                    : '0 1px 4px hsl(0 0% 0% / 0.04)',
                }}
              >
                {/* Day label — dynamic from DB */}
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
                      : '2px solid hsl(38 35% 90%)',
                    boxShadow: isActive
                      ? '0 0 12px hsl(38 55% 62% / 0.2)'
                      : 'none',
                  }}
                >
                {step.imageUrl ? (
                  <img
                    src={step.imageUrl}
                    alt={isHe ? step.dayLabel : step.dayLabelEn}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${healingCharsImg})`,
                      backgroundSize: '300% 200%',
                      backgroundPosition: `${step.col * 50}% ${step.row * 100}%`,
                    }}
                  />
                )}
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
        {finalSteps.map((_, i) => (
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
                : 'hsl(38 35% 82%)',
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
