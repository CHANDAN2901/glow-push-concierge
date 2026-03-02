import { forwardRef, useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { X, Share, MoreVertical, Bell, Download, Smartphone, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const goldColor = 'hsl(38, 65%, 55%)';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function getDeviceType(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

const PWA_DISMISSED_KEY = 'glow-pwa-dismissed';
const NOTIF_PROMPTED_KEY = 'glow-notif-prompted';

type Step = 'install' | 'notifications' | 'done';

const InstallBanner = forwardRef<HTMLDivElement>((_, ref) => {
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>('install');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const device = getDeviceType();

  useEffect(() => {
    // Listen for beforeinstallprompt (Chrome/Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const alreadyInstalled = isStandalone();
    const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);
    const notifPrompted = localStorage.getItem(NOTIF_PROMPTED_KEY);

    if (alreadyInstalled) {
      // Already installed — check if we should prompt for notifications
      if (!notifPrompted && 'Notification' in window && Notification.permission === 'default') {
        setStep('notifications');
        setTimeout(() => setVisible(true), 1500);
      }
      return;
    }

    if (dismissed) return;
    if (device === 'other') return;

    setTimeout(() => setVisible(true), 2500);
  }, [device]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    if (step === 'install') {
      localStorage.setItem(PWA_DISMISSED_KEY, '1');
    } else {
      localStorage.setItem(NOTIF_PROMPTED_KEY, '1');
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        // Move to notification step
        setStep('notifications');
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStep('done');
      localStorage.setItem(NOTIF_PROMPTED_KEY, '1');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Subscribe to push
      try {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        
        if (vapidPublicKey) {
          const subscription = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });

          const json = subscription.toJSON();
          // Save subscription to database
          await supabase.from('push_subscriptions').insert({
            endpoint: json.endpoint!,
            p256dh: json.keys!.p256dh!,
            auth_key: json.keys!.auth!,
            client_name: 'web-client',
          });
        }
      } catch (err) {
        console.warn('Push subscription failed:', err);
      }
    }

    setStep('done');
    localStorage.setItem(NOTIF_PROMPTED_KEY, '1');
  };

  const renderContent = () => {
    if (step === 'done') {
      return (
        <div className="text-center py-2 space-y-2">
          <CheckCircle className="w-10 h-10 mx-auto" style={{ color: goldColor }} />
          <p className="text-sm font-medium">
            {isHe ? 'מעולה! הכל מוכן ✨' : 'All set! ✨'}
          </p>
          <button onClick={dismiss} className="text-xs font-medium" style={{ color: goldColor }}>
            {isHe ? 'סגרי' : 'Close'}
          </button>
        </div>
      );
    }

    if (step === 'notifications') {
      return (
        <>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${goldColor}15` }}>
              <Bell className="w-6 h-6" style={{ color: goldColor }} />
            </div>
            <div className="flex-1">
              <h3 className="font-serif font-bold text-base mb-1">
                {isHe ? 'קבלי התראות חשובות 🔔' : 'Enable Notifications 🔔'}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isHe
                  ? 'אשרי קבלת התראות כדי שנדע לעדכן אותך מתי לשים משחה ומתי הפיגמנט מתייצב'
                  : 'Allow notifications so we can update you on healing milestones and ointment reminders'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEnableNotifications}
            className="w-full mt-4 py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${goldColor}, hsl(40, 50%, 72%))`, color: 'hsl(0, 0%, 15%)' }}
          >
            <Bell className="w-4 h-4 inline -mt-0.5 mr-2" />
            {isHe ? 'אישור התראות' : 'Allow Notifications'}
          </button>
          <button onClick={dismiss} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {isHe ? 'אולי אחר כך' : 'Maybe later'}
          </button>
        </>
      );
    }

    // Install step
    return (
      <>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0" style={{ background: 'hsl(0 0% 8%)' }}>
            <img src="/pwa-192.png" alt="Glow Push" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-bold text-base mb-1">
              {isHe ? 'התקיני את Glow Push 📲' : 'Install Glow Push 📲'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isHe
                ? 'התקיני את האפליקציה כדי לקבל התראות חשובות על תהליך ההחלמה שלך!'
                : 'Install the app to receive important healing progress notifications!'}
            </p>
          </div>
        </div>

        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${goldColor}, hsl(40, 50%, 72%))`, color: 'hsl(0, 0%, 15%)' }}
          >
            <Download className="w-4 h-4 inline -mt-0.5 mr-2" />
            {isHe ? 'התקיני עכשיו' : 'Install Now'}
          </button>
        ) : device === 'ios' ? (
          <div className="mt-4 p-3 rounded-xl text-sm text-muted-foreground leading-relaxed" style={{ background: `${goldColor}08`, border: `1px solid ${goldColor}20` }}>
            {isHe ? (
              <>לחצי על <Share className="w-4 h-4 inline -mt-0.5" style={{ color: goldColor }} /> (כפתור שיתוף) למטה, ואז <strong>״הוסף למסך הבית״</strong></>
            ) : (
              <>Tap <Share className="w-4 h-4 inline -mt-0.5" style={{ color: goldColor }} /> Share, then <strong>"Add to Home Screen"</strong></>
            )}
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-xl text-sm text-muted-foreground leading-relaxed" style={{ background: `${goldColor}08`, border: `1px solid ${goldColor}20` }}>
            {isHe ? (
              <>לחצי על <MoreVertical className="w-4 h-4 inline -mt-0.5" style={{ color: goldColor }} /> (תפריט), ואז <strong>״התקן אפליקציה״</strong></>
            ) : (
              <>Tap <MoreVertical className="w-4 h-4 inline -mt-0.5" style={{ color: goldColor }} /> menu, then <strong>"Install App"</strong></>
            )}
          </div>
        )}

        <button onClick={dismiss} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {isHe ? 'אולי אחר כך' : 'Maybe later'}
        </button>
      </>
    );
  };

  return (
    <div ref={ref} className="fixed inset-0 z-[100] flex items-end justify-center pb-6 px-4" style={{ background: 'hsla(0, 0%, 0%, 0.4)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-md bg-card border rounded-2xl p-5 shadow-2xl animate-fade-up relative"
        style={{ borderColor: `${goldColor}30` }}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {renderContent()}
      </div>
    </div>
  );
});

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

InstallBanner.displayName = 'InstallBanner';

export default InstallBanner;
