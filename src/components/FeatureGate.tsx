import { useState, type ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useI18n } from '@/lib/i18n';
import UpgradeModal from '@/components/UpgradeModal';

interface FeatureGateProps {
  /** The machine-readable key stored in pricing_plans.feature_keys */
  featureKey: string;
  /** Human-readable feature name (for the upgrade modal) */
  featureName?: string;
  /** Content to render when the user has access */
  children: ReactNode;
  /** Optional: render a custom locked placeholder instead of default */
  lockedFallback?: ReactNode;
}

/**
 * Wraps a feature behind a dynamic plan gate.
 * If the user's plan includes the featureKey → renders children.
 * Otherwise → shows a locked placeholder + upgrade modal on click.
 */
export default function FeatureGate({
  featureKey,
  featureName,
  children,
  lockedFallback,
}: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatureAccess();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [showUpgrade, setShowUpgrade] = useState(false);

  // While loading, render nothing to avoid flash
  if (isLoading) return null;

  // User has access → render the feature
  if (hasFeature(featureKey)) {
    return <>{children}</>;
  }

  // ---- Locked state ----
  if (lockedFallback) {
    return (
      <>
        <div onClick={() => setShowUpgrade(true)} className="cursor-pointer">
          {lockedFallback}
        </div>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureId={featureKey}
          featureName={featureName}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowUpgrade(true)}
        className="group relative w-full rounded-2xl border border-accent/20 bg-muted/40 p-5 flex items-center gap-4 transition-all hover:border-accent/40 hover:shadow-md active:scale-[0.98]"
      >
        {/* Lock icon */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #B8860B, #D4AF37 30%, #F9F295 50%, #D4AF37 70%, #B8860B)',
          }}
        >
          <Lock className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 text-start">
          <p className="text-sm font-semibold text-foreground">
            {featureName ?? featureKey}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHe ? 'שדרגי את המנוי כדי לפתוח' : 'Upgrade your plan to unlock'}
          </p>
        </div>

        {/* CTA badge */}
        <span
          className="shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow"
          style={{
            background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #B8860B)',
          }}
        >
          <Crown className="w-3.5 h-3.5" />
          {isHe ? 'שדרוג' : 'Upgrade'}
        </span>
      </button>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureId={featureKey}
        featureName={featureName}
      />
    </>
  );
}
