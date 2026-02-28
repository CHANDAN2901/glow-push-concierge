import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  text: string;
  id?: string;
}

const HelpTooltip = ({ text, id }: HelpTooltipProps) => {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-5 h-5 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, hsl(38 55% 62%), hsl(40 50% 72%))',
          boxShadow: '0 1px 4px hsl(38 55% 62% / 0.3)',
        }}
        aria-label="Help"
        data-tour-id={id}
      >
        <HelpCircle className="w-3 h-3 text-white" strokeWidth={2.5} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="absolute z-[101] top-full mt-2 w-64 p-3 rounded-xl shadow-xl animate-fade-in text-xs leading-relaxed"
            style={{
              background: '#fffdf7',
              border: '1.5px solid hsl(38 55% 62%)',
              boxShadow: '0 8px 24px hsl(38 55% 50% / 0.2)',
              right: 0,
            }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-foreground font-medium" dir="rtl">{text}</p>
          </div>
        </>
      )}
    </span>
  );
};

export default HelpTooltip;
