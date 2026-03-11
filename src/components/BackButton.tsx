import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BackButtonProps {
  /** Override default navigate(-1) behavior */
  onClick?: () => void;
  /** Override label (defaults to no label — icon only) */
  label?: string;
  /** Additional classes */
  className?: string;
}

/**
 * Minimal back-arrow button — rose-gold chevron, optional small label.
 * Designed for header placement only.
 */
export default function BackButton({ onClick, label, className = '' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={onClick ?? (() => navigate(-1))}
      className={`inline-flex items-center justify-center gap-1 rounded-full transition-all active:scale-90 w-10 h-10 ${className}`}
      style={{
        background: 'linear-gradient(135deg, #D4AF37 0%, #F0D78C 50%, #B8860B 100%)',
        boxShadow: '0 2px 8px rgba(184, 134, 11, 0.35)',
      }}
      aria-label="Back"
    >
      <ChevronRight className="w-5 h-5" strokeWidth={2.5} style={{ color: '#FFFFFF' }} />
      {label && <span className="text-xs font-bold" style={{ color: '#FFFFFF' }}>{label}</span>}
    </button>
  );
}
