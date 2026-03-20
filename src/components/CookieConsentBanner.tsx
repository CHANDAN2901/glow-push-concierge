import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const COOKIE_KEY = 'gp-cookie-consent';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const { t } = useI18n();
  const isArtistRoute = location.pathname === '/artist';
  const isHealthDeclaration = location.pathname === '/health-declaration';

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) setVisible(true);
  }, []);

  // Don't show cookie banner over health declaration form — it covers the action buttons
  if (isHealthDeclaration) return null;

  const accept = (choice: 'all' | 'essential') => {
    localStorage.setItem(COOKIE_KEY, choice);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed inset-x-0 z-[9999] px-4 pb-4 ${isArtistRoute ? 'bottom-20' : 'bottom-0'}`}
        >
          <div
            className="max-w-lg mx-auto rounded-2xl p-5 shadow-lg"
            style={{
              background: 'hsla(0, 0%, 100%, 0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid hsl(38 40% 82%)',
              boxShadow: '0 -4px 32px -8px hsla(0, 0%, 0%, 0.15)',
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'hsl(38 55% 50%)' }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'hsl(0 0% 20%)' }}>
                  {t('cookie.title')}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'hsl(0 0% 40%)' }}>
                  {t('cookie.description')}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => accept('all')}
                className="flex-1 py-2.5 rounded-full text-sm font-bold text-white transition-all active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, hsl(38 60% 45%), hsl(38 55% 55%))',
                  boxShadow: '0 4px 12px hsla(38, 55%, 50%, 0.3)',
                }}
              >
                {t('cookie.acceptAll')}
              </button>
              <button
                onClick={() => accept('essential')}
                className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all active:scale-[0.97]"
                style={{
                  border: '1.5px solid hsl(38 40% 75%)',
                  color: 'hsl(38 40% 40%)',
                  background: 'transparent',
                }}
              >
                {t('cookie.essentialOnly')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
