import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2, X } from 'lucide-react';

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

  // Only show in development
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {open && (
        <div className="mb-2 bg-foreground/95 backdrop-blur-md rounded-xl p-2 shadow-lg border border-border animate-fade-in min-w-[160px]">
          {DEV_ROUTES.map((route) => (
            <button
              key={route.path}
              onClick={() => { navigate(route.path); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === route.path
                  ? 'bg-accent text-accent-foreground'
                  : 'text-background hover:bg-background/10'
              }`}
            >
              {route.label}
            </button>
          ))}
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
