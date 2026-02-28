import { X, Shield, Eye } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Check } from 'lucide-react';

const goldColor = 'hsl(48, 53%, 60%)';

const medicalQuestionsHe = [
  { icon: '🤰', label: 'הריון או הנקה' },
  { icon: '⚠️', label: 'אלרגיות' },
  { icon: '🏥', label: 'מחלות כרוניות' },
  { icon: '💊', label: 'רואקוטן (חצי שנה אחרונה)' },
  { icon: '🩸', label: 'מדללי דם' },
  { icon: '💉', label: 'תרופות אחרות' },
  { icon: '🧴', label: 'בעיות עור (פסוריאזיס, אקזמה)' },
  { icon: '🛡️', label: 'מחלות אוטואימוניות' },
  { icon: '💊', label: 'האם נטלת אנטיביוטיקה בשבועיים האחרונים?', critical: true },
  { icon: '💉', label: 'האם בוצעו הזרקות בוטוקס או חומצה היאלורונית בשבועיים האחרונים?', critical: true, note: 'חשוב מאוד למניעת נדידת חומר או חוסר סימטריה' },
  { icon: '🧬', label: 'האם את סובלת מחוסר באנזים G6PD?', critical: true, note: 'קריטי לבחירת מאלחשים' },
  { icon: '👁️', label: 'האם את סובלת מרגישות מיוחדת בעיניים, דלקות חוזרות או יובש קיצוני?', note: 'רלוונטי במיוחד לטיפולי אייליינר' },
];

const medicalQuestionsEn = [
  { icon: '🤰', label: 'Pregnancy or breastfeeding' },
  { icon: '⚠️', label: 'Allergies' },
  { icon: '🏥', label: 'Chronic diseases' },
  { icon: '💊', label: 'Roaccutane (last 6 months)' },
  { icon: '🩸', label: 'Blood thinners' },
  { icon: '💉', label: 'Other medications' },
  { icon: '🧴', label: 'Skin conditions (psoriasis, eczema)' },
  { icon: '🛡️', label: 'Autoimmune diseases' },
  { icon: '💊', label: 'Antibiotics in the last 2 weeks?', critical: true },
  { icon: '💉', label: 'Botox or hyaluronic acid injections in the last 2 weeks?', critical: true, note: 'Critical to prevent migration or asymmetry' },
  { icon: '🧬', label: 'G6PD enzyme deficiency?', critical: true, note: 'Critical for anesthetic selection' },
  { icon: '👁️', label: 'Eye sensitivity, recurring infections, or extreme dryness?', note: 'Relevant for eyeliner treatments' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  logoUrl?: string;
}

export default function HealthDeclarationPreview({ open, onClose, logoUrl }: Props) {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const questions = isHe ? medicalQuestionsHe : medicalQuestionsEn;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="min-h-screen flex flex-col items-center px-4 pt-6 pb-32">
        <div className="w-full max-w-lg">

          {/* Close Button */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-colors hover:bg-secondary shrink-0"
              style={{ border: `1px solid ${goldColor}` }}
            >
              <X className="w-5 h-5" style={{ color: '#1A1A1A' }} />
            </button>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" style={{ color: goldColor }} />
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: goldColor }}>
                {isHe ? 'תצוגה מקדימה' : 'Preview Mode'}
              </span>
            </div>
          </div>

          {/* Studio Logo */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-muted" style={{ border: `2px solid ${goldColor}` }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Studio Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-xl font-bold" style={{ color: goldColor }}>GP</span>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-2xl font-medium tracking-wider" style={{ color: '#1A1A1A' }}>
              GlowPush
            </h1>
            <p className="font-serif text-lg tracking-wide mt-1" style={{ color: goldColor }}>
              {isHe ? 'הצהרת בריאות רפואית' : 'Medical Health Statement'}
            </p>
            <div className="w-16 h-px mx-auto mt-4" style={{ backgroundColor: goldColor }} />
          </div>

          {/* Step 1: Personal Details (Read-only) */}
          <div className="rounded-2xl p-6 mb-5" style={{ border: '1px solid #F0EBE0' }}>
            <div className="pb-4 mb-5" style={{ borderBottom: `1px solid ${goldColor}40` }}>
              <h2 className="font-sans font-bold text-sm tracking-wider uppercase" style={{ color: '#1A1A1A' }}>
                {isHe ? 'פרטים אישיים' : 'Personal Details'}
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { label: isHe ? 'שם מלא' : 'Full Name', value: isHe ? 'ישראלה ישראלי' : 'Jane Doe' },
                { label: isHe ? 'תעודת זהות' : 'ID Number', value: '000000000' },
                { label: isHe ? 'טלפון' : 'Phone', value: '050-0000000' },
              ].map((field, i) => (
                <div key={i} className="space-y-1.5">
                  <label className="text-[10px] font-medium tracking-widest uppercase" style={{ color: '#999' }}>
                    {field.label}
                  </label>
                  <div
                    className="w-full px-4 py-3.5 rounded-lg text-sm"
                    style={{ border: '1px solid #E0D5C0', backgroundColor: '#FAFAF8', color: '#999' }}
                  >
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Medical Questionnaire (Read-only) */}
          <div className="rounded-2xl p-6 mb-5" style={{ border: '1px solid #F0EBE0' }}>
            <div className="pb-4 mb-5" style={{ borderBottom: `1px solid ${goldColor}40` }}>
              <h2 className="font-sans font-bold text-sm tracking-wider uppercase" style={{ color: '#1A1A1A' }}>
                {isHe ? 'שאלון רפואי' : 'Medical Questionnaire'}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#999' }}>
                {isHe ? 'סמני את כל מה שרלוונטי:' : 'Check all that apply:'}
              </p>
            </div>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3.5 rounded-lg"
                  style={{
                    border: `1px solid ${(q as any).critical ? '#E5484D20' : '#E0D5C0'}`,
                    backgroundColor: '#FEFEFE',
                  }}
                >
                  <span
                    className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                    style={{ borderColor: '#C0B8A8', backgroundColor: 'transparent' }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm leading-snug" style={{ color: '#1A1A1A' }}>{q.icon} {q.label}</span>
                    {(q as any).note && (
                      <p className="text-[11px] mt-0.5 leading-tight" style={{ color: '#999' }}>{(q as any).note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: Signature (Read-only) */}
          <div className="rounded-2xl p-6 mb-5" style={{ border: '1px solid #F0EBE0' }}>
            <div className="pb-4 mb-5" style={{ borderBottom: `1px solid ${goldColor}40` }}>
              <h2 className="font-sans font-bold text-sm tracking-wider uppercase" style={{ color: '#1A1A1A' }}>
                {isHe ? 'הסכמה וחתימה' : 'Consent & Signature'}
              </h2>
            </div>

            <div className="flex items-start gap-3 px-4 py-3.5 rounded-lg mb-4" style={{ border: '1px solid #E0D5C0' }}>
              <span className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#C0B8A8' }} />
              <span className="text-sm" style={{ color: '#1A1A1A' }}>
                {isHe
                  ? 'אני מאשרת שכל המידע שמסרתי נכון ומדויק ואני מסכימה לטיפול.'
                  : 'I confirm all information provided is true and I consent to treatment.'}
              </span>
            </div>

            <div
              className="w-full h-28 rounded-lg flex items-center justify-center"
              style={{ border: `2px dashed ${goldColor}40`, backgroundColor: '#FAFAF8' }}
            >
              <span className="text-xs tracking-wider" style={{ color: '#C0B8A8' }}>
                {isHe ? 'חתימה דיגיטלית תופיע כאן' : 'Digital signature appears here'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: '#1A1A1A' }}>
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
          <Shield className="w-5 h-5 shrink-0" style={{ color: goldColor }} />
          <p className="text-xs leading-relaxed" style={{ color: '#E0D5C0' }}>
            {isHe
              ? 'זהו הטופס המקצועי שהלקוחות שלך יחתמו עליו. בטוח, דיגיטלי ומאובטח.'
              : 'This is the professional form your clients will sign. Safe, Digital, & Secure.'}
          </p>
        </div>
      </div>
    </div>
  );
}
