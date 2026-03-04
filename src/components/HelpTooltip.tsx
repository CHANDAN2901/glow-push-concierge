import { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  id?: string;
}

const HelpTooltip = ({ text, id }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Position tooltip after it renders
  useLayoutEffect(() => {
    if (!open || !tooltipRef.current || !triggerRef.current) return;

    const el = tooltipRef.current;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const tooltipWidth = 250;
    const padding = 12;

    // Vertical position: below the trigger
    el.style.top = `${triggerRect.bottom + 8}px`;

    // Horizontal: center on trigger, clamped to viewport
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    let left = triggerCenter - tooltipWidth / 2;
    if (left < padding) left = padding;
    if (left + tooltipWidth > vw - padding) left = vw - padding - tooltipWidth;
    el.style.left = `${left}px`;
  }, [open]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 border-2 cursor-pointer select-none"
        style={{
          background: '#ffffff',
          borderColor: 'hsl(38 55% 62%)',
          boxShadow: '0 2px 8px hsl(38 55% 62% / 0.2)',
        }}
        aria-label="Help"
        aria-expanded={open}
        data-tour-id={id}
      >
        <HelpCircle className="w-4 h-4 pointer-events-none" strokeWidth={2.5} style={{ color: 'hsl(38 55% 62%)' }} />
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={handleClose}
          />
          {/* Tooltip bubble */}
          <div
            ref={tooltipRef}
            className="fixed p-3.5 rounded-xl animate-fade-in text-xs leading-relaxed"
            style={{
              zIndex: 9999,
              maxWidth: '250px',
              width: '250px',
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1.5px solid hsl(40 60% 50% / 0.4)',
              boxShadow: '0 12px 32px hsl(0 0% 0% / 0.35), 0 0 0 1px hsl(40 60% 50% / 0.1)',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'hsl(40 50% 70%)' }}
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-white/90 font-medium pr-1" dir="rtl" style={{ lineHeight: '1.7' }}>{text}</p>
          </div>
        </>,
        document.body
      )}
    </span>
  );
};

export default HelpTooltip;
