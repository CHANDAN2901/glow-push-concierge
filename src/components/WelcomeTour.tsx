import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  emoji: string;
}

const TOUR_STEPS_HE: TourStep[] = [
  {
    title: 'ברוכה הבאה! 🎉',
    description: 'זהו לוח הבקרה שלך — מכאן תנהלי את כל הלקוחות, תשלחי הודעות ותעקבי אחרי תהליכי ההחלמה.',
    emoji: '🏠',
  },
  {
    title: 'הכרטיס הדיגיטלי שלי ✨',
    description: 'כרטיס ביקור דיגיטלי יוקרתי עם כל הפרטים שלך — שתפי אותו עם לקוחות בלחיצה.',
    emoji: '💳',
  },
  {
    title: 'עריכת מסע ההחלמה ✏️',
    description: 'כאן תוכלי להתאים את ציר הזמן של ההחלמה — הוראות טיפול, טיפים והודעות לכל יום.',
    emoji: '📋',
  },
  {
    title: 'הוספת לקוחה חדשה ➕',
    description: 'לחצי על ה-"+" בתפריט כדי להוסיף לקוחה חדשה ולשלוח לה קישור אישי.',
    emoji: '👩',
  },
  {
    title: 'את מוכנה! 🚀',
    description: 'כל הכלים מוכנים בשבילך. אם תצטרכי עזרה — לחצי על סימן ה-? ליד כל כותרת.',
    emoji: '⭐',
  },
];

const TOUR_STEPS_EN: TourStep[] = [
  {
    title: 'Welcome! 🎉',
    description: 'This is your dashboard — manage clients, send messages, and track healing journeys all from here.',
    emoji: '🏠',
  },
  {
    title: 'My Digital Card ✨',
    description: 'A luxury digital business card with all your details — share it with clients in one tap.',
    emoji: '💳',
  },
  {
    title: 'Edit Healing Journey ✏️',
    description: 'Customize the healing timeline — care instructions, tips, and messages for each day.',
    emoji: '📋',
  },
  {
    title: 'Add New Client ➕',
    description: 'Tap the "+" button to add a new client and send them a personalized link.',
    emoji: '👩',
  },
  {
    title: "You're Ready! 🚀",
    description: 'All tools are set. Need help? Tap the ? icon next to any section header.',
    emoji: '⭐',
  },
];

interface WelcomeTourProps {
  open: boolean;
  onClose: () => void;
  lang: 'en' | 'he';
}

const WelcomeTour = ({ open, onClose, lang }: WelcomeTourProps) => {
  const [step, setStep] = useState(0);
  const steps = lang === 'he' ? TOUR_STEPS_HE : TOUR_STEPS_EN;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const finish = () => {
    localStorage.setItem('gp-welcome-tour-done', '1');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={finish} />
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
        style={{
          background: 'linear-gradient(160deg, #fffdf7 0%, #fff9eb 100%)',
          border: '2px solid hsl(38 55% 62%)',
          boxShadow: '0 16px 48px hsl(38 55% 50% / 0.25)',
        }}
      >
        {/* Close */}
        <button
          onClick={finish}
          className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                background: i === step
                  ? 'linear-gradient(90deg, hsl(38 55% 62%), hsl(40 50% 72%))'
                  : 'hsl(38 30% 85%)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center space-y-3" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <div className="text-4xl">{current.emoji}</div>
          <h3
            className="text-lg font-bold font-serif"
            style={{ color: 'hsl(30 15% 22%)' }}
          >
            {current.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
            style={{ color: 'hsl(38 55% 50%)' }}
          >
            {lang === 'he' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {lang === 'he' ? 'הקודם' : 'Back'}
          </button>

          <button
            onClick={() => {
              if (isLast) finish();
              else setStep(step + 1);
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B 100%)',
              color: '#5C4033',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.35)',
            }}
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4" />
                {lang === 'he' ? 'יאללה, בואי נתחיל!' : "Let's Go!"}
              </>
            ) : (
              <>
                {lang === 'he' ? 'הבא' : 'Next'}
                {lang === 'he' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeTour;
