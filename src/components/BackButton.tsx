import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { ChevronRight } from 'lucide-react';

interface BackButtonProps {
  /** Override default navigate(-1) behavior */
  onClick?: () => void;
  /** Override label (defaults to חזרה / Back) */
  label?: string;
  /** Additional classes */
  className?: string;
}

/**
 * Standardized back button: white bg, gold border, gold text + RTL arrow.
 */
export default function BackButton({ onClick, label, className = '' }: BackButtonProps) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';

  const defaultLabel = label ?? (isHe ? 'חזרה' : 'Back');

  return (
    <button
      onClick={onClick ?? (() => navigate(-1))}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-sm font-serif
        bg-white border-2 shadow-sm
        transition-all active:scale-95 hover:shadow-md
        ${className}`}
      style={{
        borderColor: 'hsl(38 55% 62%)',
        color: 'hsl(38 55% 50%)',
      }}
    >
      <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
      <span>{defaultLabel}</span>
    </button>
  );
}
