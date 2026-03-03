import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { X, Share, MoreVertical, Download, Smartphone, Sparkles } from 'lucide-react';
import glowpushLogo from '@/assets/glowpush-logo.png';

const goldColor = 'hsl(38, 65%, 55%)';

function getDeviceType(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

interface PostSignupInstallPromptProps {
  open: boolean;
  onClose: () => void;
}

const PostSignupInstallPrompt = ({ open, onClose }: PostSignupInstallPromptProps) => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const device = getDeviceType();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!open || isStandalone()) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'hsla(0, 0%, 0%, 0.55)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 relative animate-fade-up"
        style={{
          background: 'linear-gradient(165deg, #FFFFFF 0%, hsl(40 50% 97%) 100%)',
          border: '1.5px solid hsl(38 40% 82%)',
          boxShadow: '0 24px 80px -12px hsla(38, 55%, 50%, 0.25), 0 0 0 1px hsla(38, 40%, 82%, 0.3)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo & Welcome */}
        <div className="text-center mb-5">
          <div className="mx-auto mb-4 w-20 h-20 flex items-center justify-center">
            <img
              src={glowpushLogo}
              alt="Glow Push"
              className="h-16 object-contain drop-shadow-[0_2px_12px_rgba(212,175,55,0.35)]"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-5 h-5" style={{ color: goldColor }} />
            <h2 className="text-xl font-serif font-bold" style={{ color: 'hsl(0 0% 15%)' }}>
              {isHe ? 'ברוכה הבאה!' : 'Welcome!'}
            </h2>
            <Sparkles className="w-5 h-5" style={{ color: goldColor }} />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(38 30% 40%)' }}>
            {isHe
              ? 'התקיני את האפליקציה על המסך שלך לגישה מהירה וחוויה מושלמת'
              : 'Install the app on your home screen for quick access and the best experience'}
          </p>
        </div>

        {/* Install action */}
        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, hsl(38 55% 52%), hsl(40 50% 65%))',
              color: '#FFFFFF',
              boxShadow: '0 6px 24px -4px hsla(38, 55%, 50%, 0.4)',
              textShadow: '0 1px 2px hsla(0,0%,0%,0.15)',
            }}
          >
            <Download className="w-4 h-4 inline -mt-0.5 mr-2" />
            {isHe ? 'הורידי את האפליקציה' : 'Install App'}
          </button>
        ) : device === 'ios' ? (
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{ background: 'hsl(38 40% 96%)', border: '1px solid hsl(38 30% 88%)' }}
          >
            <p className="text-sm font-semibold text-center" style={{ color: 'hsl(0 0% 20%)' }}>
              {isHe ? 'להתקנה באייפון:' : 'To install on iPhone:'}
            </p>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'hsl(38 30% 35%)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'hsl(38 40% 90%)' }}
              >
                <span className="text-lg">1</span>
              </div>
              <p>
                {isHe ? (
                  <>לחצי על <Share className="w-4 h-4 inline -mt-0.5 mx-1" style={{ color: goldColor }} /> (כפתור שיתוף) בתחתית הדפדפן</>
                ) : (
                  <>Tap <Share className="w-4 h-4 inline -mt-0.5 mx-1" style={{ color: goldColor }} /> Share at the bottom</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'hsl(38 30% 35%)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'hsl(38 40% 90%)' }}
              >
                <span className="text-lg">2</span>
              </div>
              <p>
                {isHe ? (
                  <>בחרי <strong>״הוסף למסך הבית״</strong></>
                ) : (
                  <>Select <strong>"Add to Home Screen"</strong></>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{ background: 'hsl(38 40% 96%)', border: '1px solid hsl(38 30% 88%)' }}
          >
            <p className="text-sm font-semibold text-center" style={{ color: 'hsl(0 0% 20%)' }}>
              {isHe ? 'להתקנה:' : 'To install:'}
            </p>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'hsl(38 30% 35%)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'hsl(38 40% 90%)' }}
              >
                <span className="text-lg">1</span>
              </div>
              <p>
                {isHe ? (
                  <>לחצי על <MoreVertical className="w-4 h-4 inline -mt-0.5 mx-1" style={{ color: goldColor }} /> (תפריט) למעלה</>
                ) : (
                  <>Tap <MoreVertical className="w-4 h-4 inline -mt-0.5 mx-1" style={{ color: goldColor }} /> menu at the top</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: 'hsl(38 30% 35%)' }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'hsl(38 40% 90%)' }}
              >
                <span className="text-lg">2</span>
              </div>
              <p>
                {isHe ? (
                  <>בחרי <strong>״התקן אפליקציה״</strong></>
                ) : (
                  <>Select <strong>"Install App"</strong></>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Maybe later */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isHe ? 'אולי אחר כך' : 'Maybe later'}
        </button>
      </div>
    </div>
  );
};

export default PostSignupInstallPrompt;
