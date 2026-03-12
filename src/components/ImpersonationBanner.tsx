import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ArrowLeft } from 'lucide-react';
import { getImpersonation, stopImpersonation } from '@/lib/impersonation';

export default function ImpersonationBanner() {
  const [state, setState] = useState(getImpersonation);
  const navigate = useNavigate();

  // Listen for storage changes (cross-tab or same-tab manual dispatch)
  useEffect(() => {
    const sync = () => setState(getImpersonation());
    window.addEventListener('storage', sync);
    window.addEventListener('impersonation-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('impersonation-changed', sync);
    };
  }, []);

  if (!state) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-3 px-4 py-2 text-xs font-semibold shadow-md"
      style={{
        background: 'linear-gradient(135deg, hsl(38 60% 50%), hsl(38 70% 60%))',
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }}
    >
      <Eye className="w-3.5 h-3.5" />
      <span>
        Viewing as <strong>{state.userName}</strong> ({state.studioName}) — {state.tier.toUpperCase()} tier
      </span>
      <button
        onClick={() => {
          stopImpersonation();
          window.dispatchEvent(new Event('impersonation-changed'));
          navigate('/super-admin');
        }}
        className="ml-2 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
        style={{
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <ArrowLeft className="w-3 h-3" />
        Return to Admin
      </button>
    </div>
  );
}
