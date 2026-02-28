import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface TopNavigationProps {
  title: string;
}

const TopNavigation = ({ title }: TopNavigationProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between w-full px-4 py-3">
      <div className="w-10 h-10" />
      <h1 className="text-lg font-bold text-foreground truncate text-center flex-1 mx-2">
        {title}
      </h1>
      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 text-accent border-2 border-accent bg-accent/5"
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default TopNavigation;
