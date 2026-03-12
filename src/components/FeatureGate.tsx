import { useState, type ReactNode } from 'react';
import { Lock, Crown } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useI18n } from '@/lib/i18n';
import { getFeature, getMinTierForFeature, getTier } from '@/lib/subscriptionConfig';
import UpgradeModal from '@/components/UpgradeModal';

interface FeatureGateProps {
  /** The machine-readable key from subscriptionConfig */
  featureKey: string;
  /** Human-readable feature name (for the upgrade modal) */
  featureName?: string;
  /** Content to render when the user has access */
  children: ReactNode;
  /** Optional: render a custom locked placeholder instead of default */
  lockedFallback?: ReactNode;
  /**
   * "badge" mode: renders children but adds a 👑 badge overlay.
   * Clicking triggers the upgrade modal instead of the feature action.
   */
  mode?: 'block' | 'badge';
}

/**
 * Wraps a feature behind a dynamic plan gate.
 * If the user's plan includes the featureKey → renders children.
 * Otherwise:
 *   mode="block" (default) → shows a locked placeholder + upgrade modal on click.
 *   mode="badge" → renders children with a 👑 badge; clicking opens upgrade modal.
 */
export default function FeatureGate({
  featureKey,
  featureName,
  children,
  lockedFallback,
  mode = 'block',
}: FeatureGateProps) {
  const { hasFeature, isLoading, userTier } = useFeatureAccess();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Resolve display name from config if not provided
  const feature = getFeature(featureKey);
  const displayName = featureName ?? (feature ? (isHe ? feature.name.he : feature.name.en) : featureKey);

  // Get the tier name needed
  const minTier = getMinTierForFeature(featureKey);
  const requiredTierDef = minTier ? getTier(minTier) : null;
  const requiredTierName = requiredTierDef
    ? (isHe ? requiredTierDef.name.he : requiredTierDef.name.en)
    : '';

  // While loading, render children to avoid false-negative lock flash
  if (isLoading) return <>{children}</>;

  // User has access → render the feature
  if (hasFeature(featureKey)) {
    return <>{children}</>;
  }

  // ── Badge mode: show children with a crown overlay ──
  if (mode === 'badge') {
    return (
      <>
        <div
          className="relative cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowUpgrade(true);
          }}
        >
          <div className="pointer-events-none opacity-75">
            {children}
          </div>
          {/* Crown badge */}
          <span
            className="absolute -top-1.5 -right-1.5 rtl:-left-1.5 rtl:right-auto flex items-center justify-center w-5 h-5 rounded-full text-[10px] shadow-md z-10"
            style={{
              background: 'linear-gradient(135deg, #B8860B, #D4AF37 50%, #F9F295)',
              color: '#fff',
            }}
          >
            👑
          </span>
        </div>
        <UpgradeModal
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          featureId={featureKey}
          featureName={displayName}
        />
      </>
    );
  }

  // ── Block mode ──

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
          featureName={displayName}
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
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">
            {isHe
              ? `שדרגי ל-${requiredTierName} כדי לפתוח`
              : `Upgrade to ${requiredTierName} to unlock`}
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
        featureName={displayName}
      />
    </>
  );
}
