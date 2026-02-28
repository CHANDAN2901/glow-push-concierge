import { useNavigate } from 'react-router-dom';
import { X, Crown, Check, PenTool } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  featureId?: string;
  featureName?: string;
}

const goldColor = 'hsl(48, 53%, 60%)';
const goldDark = 'hsl(48, 55%, 45%)';

export default function UpgradeModal({ open, onClose, featureId, featureName }: Props) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';

  if (!open) return null;

  const bullets = isHe
    ? [
        'חתימה דיגיטלית מהירה על המסך',
        'תיק לקוחה מאורגן עם כל הטפסים ב-PDF',
        'שאלון רפואי מקצועי (G6PD, בוטוקס, אנטיביוטיקה)',
        'מראה יוקרתי ומקצועי שמרשים את הלקוחות',
      ]
    : [
        'Quick digital signature on screen',
        'Organized client files with all forms in PDF',
        'Professional medical questionnaire (G6PD, Botox, Antibiotics)',
        'Luxurious & professional look that impresses clients',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" style={{ color: '#999' }} />
        </button>

        {/* Header with gold accent bar */}
        <div className="pt-8 pb-5 px-6 text-center" style={{ borderBottom: `2px solid ${goldColor}30` }}>
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${goldColor}, ${goldDark})`, boxShadow: `0 6px 24px ${goldColor}40` }}
          >
            <PenTool className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-sans font-bold text-xl mb-1" style={{ color: '#1A1A1A' }}>
            {isHe ? 'תתקדמי לדיגיטלי' : 'Go Digital'}
          </h2>
          <p className="text-sm" style={{ color: '#888' }}>
            {isHe ? 'הצהרת בריאות ללא ניירת' : 'Paperless Health Declaration'}
          </p>
        </div>

        {/* Blurred signature preview teaser */}
        <div className="mx-6 mt-5 rounded-xl overflow-hidden relative" style={{ border: '1px solid #F0EBE0', height: '80px' }}>
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: '#FAFAF8' }}>
            {/* Simulated blurred signature strokes */}
            <svg viewBox="0 0 300 60" className="w-full h-full opacity-30" style={{ filter: 'blur(3px)' }}>
              <path d="M 30 40 C 60 10, 80 50, 110 30 C 140 10, 160 45, 190 25 C 210 15, 240 40, 270 30" stroke={goldColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <path d="M 50 45 C 70 25, 100 50, 130 35 C 150 25, 180 45, 220 30" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.3), rgba(255,255,255,0.7))' }} />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <span className="text-[10px] font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${goldColor}20`, color: goldDark }}>
              {isHe ? '✍️ חתימה דיגיטלית' : '✍️ Digital Signature'}
            </span>
          </div>
        </div>

        {/* Bullet points */}
        <div className="px-6 py-5 space-y-3">
          {bullets.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${goldColor}18` }}
              >
                <Check className="w-3 h-3" style={{ color: goldColor }} />
              </div>
              <p className="text-sm leading-snug" style={{ color: '#333' }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="px-6 pb-3 space-y-3">
          {/* Primary: Upgrade to Master */}
          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${goldColor}, ${goldDark})`,
              color: '#FFFFFF',
              boxShadow: `0 4px 20px ${goldColor}40`,
            }}
          >
            <Crown className="w-4 h-4" />
            {isHe ? 'שדרוג לחבילת Master' : 'Upgrade to Master Plan'}
          </button>

          {/* Secondary: Buy add-on only */}
          <button
            onClick={() => { onClose(); /* switch to addons tab handled by parent */ }}
            className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{
              border: `1.5px solid ${goldColor}`,
              color: goldDark,
              backgroundColor: 'transparent',
            }}
          >
            {isHe ? 'רכישת הפיצ׳ר כתוספת בלבד' : 'Buy This Feature Only'}
          </button>
        </div>

        {/* Not now link */}
        <div className="pb-5 text-center">
          <button
            onClick={onClose}
            className="text-xs hover:underline transition-colors"
            style={{ color: '#BBB' }}
          >
            {isHe ? 'לא עכשיו' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
