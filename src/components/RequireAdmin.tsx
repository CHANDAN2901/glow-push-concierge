import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, roleLoading } = useAuth();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
