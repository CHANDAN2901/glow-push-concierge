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
      className={`inline-flex items-center gap-1 rounded-full transition-all active:scale-90 ${className}`}
      style={{ color: '#4a3636' }}
      aria-label="Back"
    >
      <ChevronRight className="w-5 h-5" strokeWidth={2} style={{ color: '#d8b4b4' }} />
      {label && <span className="text-xs font-medium" style={{ color: '#4a3636' }}>{label}</span>}
    </button>
  );
}
