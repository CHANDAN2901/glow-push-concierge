import BackButton from '@/components/BackButton';

interface TopNavigationProps {
  title: string;
}

const TopNavigation = ({ title }: TopNavigationProps) => {
  return (
    <div className="flex items-center justify-between w-full px-4 py-3">
      <div className="w-10 h-10" />
      <h1 className="text-lg font-bold text-foreground truncate text-center flex-1 mx-2">
        {title}
      </h1>
      <BackButton />
    </div>
  );
};

export default TopNavigation;
