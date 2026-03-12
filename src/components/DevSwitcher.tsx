import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, X, Crown } from 'lucide-react';
import { TIERS, getDevTierOverride, setDevTierOverride, type TierSlug } from '@/lib/subscriptionConfig';

const DEV_ROUTES = [
  { path: '/artist', label: '🎨 Artist' },
  { path: '/client', label: '💆 Client' },
  { path: '/super-admin', label: '⚙️ Super Admin' },
  { path: '/auth', label: '🔐 Auth' },
  { path: '/debug-test', label: '🐛 Debug' },
];

const DevSwitcher = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentOverride, setCurrentOverride] = useState<TierSlug | null>(getDevTierOverride);

  // Only show in development
  if (import.meta.env.PROD) return null;

  const handleTierChange = (tier: TierSlug | null) => {
    setDevTierOverride(tier);
    setCurrentOverride(tier);
    // Force re-render across the app
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {open && (
        <div className="mb-2 bg-foreground/95 backdrop-blur-md rounded-xl p-2 shadow-lg border border-border animate-fade-in min-w-[180px]">
          {/* Route Switcher */}
          <div className="mb-2 pb-2 border-b border-border/30">
            <p className="text-[9px] uppercase tracking-wider text-background/40 px-3 py-1 font-bold">Routes</p>
            {DEV_ROUTES.map((route) => (
              <button
                key={route.path}
                onClick={() => { navigate(route.path); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === route.path
                    ? 'bg-accent text-accent-foreground'
                    : 'text-background hover:bg-background/10'
                }`}
              >
                {route.label}
              </button>
            ))}
          </div>

          {/* Tier Switcher */}
          <div>
            <p className="text-[9px] uppercase tracking-wider text-background/40 px-3 py-1 font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" /> Tier Override
            </p>
            <button
              onClick={() => handleTierChange(null)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                currentOverride === null
                  ? 'bg-accent text-accent-foreground'
                  : 'text-background hover:bg-background/10'
              }`}
            >
              🔄 Use DB Tier
            </button>
            {TIERS.map((tier) => (
              <button
                key={tier.slug}
                onClick={() => handleTierChange(tier.slug)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentOverride === tier.slug
                    ? 'bg-accent text-accent-foreground'
                    : 'text-background hover:bg-background/10'
                }`}
              >
                {tier.slug === 'lite' ? '🆓' : tier.slug === 'professional' ? '⭐' : '👑'} {tier.name.en}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-foreground text-background shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        title="Dev Switcher"
      >
        {open ? <X className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
      </button>
    </div>
  );
};

export default DevSwitcher;
