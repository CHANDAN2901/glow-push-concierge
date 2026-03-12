import { Navigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { tierHasFeature, type TierSlug } from '@/lib/subscriptionConfig';

interface ProtectedRouteProps {
  /** The feature key required to access this route */
  featureId: string;
  /** Where to redirect if access is denied */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Route guard that checks the user's subscription tier
 * against the central config before rendering the route.
 */
export default function ProtectedRoute({
  featureId,
  redirectTo = '/artist?tab=home',
  children,
}: ProtectedRouteProps) {
  const { hasFeature, isLoading } = useFeatureAccess();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!hasFeature(featureId)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
