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
            className="absolute z-[101] top-full mt-2 w-64 p-3.5 rounded-xl animate-fade-in text-xs leading-relaxed"
            style={{
              background: 'linear-gradient(145deg, #1a1a1a 0%, #2a2a2a 100%)',
              border: '1.5px solid hsl(40 60% 50% / 0.4)',
              boxShadow: '0 12px 32px hsl(0 0% 0% / 0.35), 0 0 0 1px hsl(40 60% 50% / 0.1)',
              right: 0,
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
