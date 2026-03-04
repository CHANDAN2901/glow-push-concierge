import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  id?: string;
}

const HelpTooltip = ({ text, id }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Collision detection: reposition tooltip if it overflows viewport
  useEffect(() => {
    if (open && tooltipRef.current) {
      const el = tooltipRef.current;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;

      // Reset any previous adjustments
      el.style.left = '';
      el.style.right = '';
      el.style.transform = '';

      // Center the tooltip relative to the trigger
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipWidth = el.offsetWidth;
        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        let desiredLeft = triggerCenter - tooltipWidth / 2;

        // Clamp to viewport with 12px padding
        const padding = 12;
        if (desiredLeft < padding) desiredLeft = padding;
        if (desiredLeft + tooltipWidth > vw - padding) desiredLeft = vw - padding - tooltipWidth;

        el.style.position = 'fixed';
        el.style.left = `${desiredLeft}px`;
        el.style.right = 'auto';
      }
    }
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 border-2"
        style={{
          background: '#ffffff',
          borderColor: 'hsl(38 55% 62%)',
          boxShadow: '0 2px 8px hsl(38 55% 62% / 0.2)',
        }}
        aria-label="Help"
        data-tour-id={id}
      >
        <HelpCircle className="w-4 h-4" strokeWidth={2.5} style={{ color: 'hsl(38 55% 62%)' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            ref={tooltipRef}
            className="fixed z-[101] mt-2 p-3.5 rounded-xl animate-fade-in text-xs leading-relaxed"
            style={{
              top: triggerRef.current
                ? triggerRef.current.getBoundingClientRect().bottom + 8
                : 'auto',
              maxWidth: '250px',
              width: '250px',
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1.5px solid hsl(40 60% 50% / 0.4)',
              boxShadow: '0 12px 32px hsl(0 0% 0% / 0.35), 0 0 0 1px hsl(40 60% 50% / 0.1)',
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'hsl(40 50% 70%)' }}
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-white/90 font-medium pr-1" dir="rtl" style={{ lineHeight: '1.7' }}>{text}</p>
          </div>
        </>
      )}
    </span>
  );
};

export default HelpTooltip;
