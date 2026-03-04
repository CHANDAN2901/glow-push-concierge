import { useState, useRef, useCallback, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface HelpTooltipProps {
  text: string;
  id?: string;
}

const SIDE_OFFSET = 10;

const HelpTooltip = ({ text, id }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);
  const [desktopTop, setDesktopTop] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Auto-close on scroll (including nested scroll containers)
  useEffect(() => {
    if (!open) return;

    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });

    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  // Close on outside tap/click
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Desktop positioning: centered to viewport, below trigger
  useLayoutEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;
      setDesktopTop(triggerRect.bottom + SIDE_OFFSET);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);

    return () => window.removeEventListener('resize', updatePosition);
  }, [open, isMobile]);

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className="relative z-[10000] h-7 w-7 cursor-pointer select-none rounded-full border-2 border-accent/60 bg-background text-accent shadow-md shadow-black/10 transition-transform hover:scale-105 active:scale-95"
        aria-label="Help"
        aria-expanded={open}
        aria-controls={id ? `${id}-help-content` : undefined}
        data-tour-id={id}
      >
        <HelpCircle className="pointer-events-none mx-auto h-4 w-4" strokeWidth={2.5} />
      </button>

      {open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={handleClose}
          />

          {isMobile ? (
            <div
              ref={contentRef}
              id={id ? `${id}-help-content` : undefined}
              className="fixed bottom-0 left-1/2 z-[9999] w-[92vw] max-w-md -translate-x-1/2 rounded-t-2xl border border-border/60 bg-background/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-sm outline-none animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
            >
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
              <button
                type="button"
                onClick={handleClose}
                className="absolute left-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close help"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="pr-6 text-sm leading-relaxed text-foreground/90" dir="rtl">
                {text}
              </p>
            </div>
          ) : (
            <div
              ref={contentRef}
              id={id ? `${id}-help-content` : undefined}
              className="fixed left-1/2 z-[9999] w-[85vw] max-w-[85vw] -translate-x-1/2 rounded-xl border border-border/60 bg-background/95 p-3.5 text-xs leading-relaxed text-foreground/90 shadow-2xl shadow-black/20 backdrop-blur-sm outline-none animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
              style={{ top: `${desktopTop}px` }}
            >
              <button
                type="button"
                onClick={handleClose}
                className="absolute left-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Close help"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <p className="pr-6" dir="rtl">
                {text}
              </p>
            </div>
          )}
        </>,
        document.body,
      )}
    </span>
  );
};

export default HelpTooltip;
