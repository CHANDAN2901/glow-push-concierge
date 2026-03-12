import { useNavigate } from 'react-router-dom';
import { X, Crown, Check, PenTool, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import {
  TIERS,
  FEATURES,
  getFeature,
  getMinTierForFeature,
  getTier,
  getUpgradeFeatures,
  type TierSlug,
} from '@/lib/subscriptionConfig';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

interface Props {
  open: boolean;
  onClose: () => void;
  featureId?: string;
  featureName?: string;
}

const goldColor = 'hsl(48, 53%, 60%)';
const goldDark = 'hsl(48, 55%, 45%)';

export default function UpgradeModal({ open, onClose, featureId, featureName }: Props) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const isHe = lang === 'he';
  const { userTier } = useFeatureAccess();

  if (!open) return null;

  // Determine which tier to recommend
  const minTier = featureId ? getMinTierForFeature(featureId) : null;
  const recommendedTierSlug: TierSlug = minTier && minTier !== userTier ? minTier : 'professional';
  const recommendedTier = getTier(recommendedTierSlug);
  const tierName = recommendedTier
    ? (isHe ? recommendedTier.name.he : recommendedTier.name.en)
    : 'Pro';

  // Get features the user would gain
  const upgradeFeatures = getUpgradeFeatures(userTier, recommendedTierSlug);
  const bullets = upgradeFeatures.slice(0, 4).map(f => isHe ? f.name.he : f.name.en);

  // Feature-specific subtitle
  const feature = featureId ? getFeature(featureId) : null;
  const subtitle = featureName
    || (feature ? (isHe ? feature.name.he : feature.name.en) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl animate-fade-up overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" style={{ color: '#999' }} />
        </button>

        <div className="pt-8 pb-5 px-6 text-center" style={{ borderBottom: `2px solid ${goldColor}30` }}>
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${goldColor}, ${goldDark})`, boxShadow: `0 6px 24px ${goldColor}40` }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-sans font-bold text-xl mb-1" style={{ color: '#1A1A1A' }}>
            {isHe ? `שדרגי ל-${tierName}` : `Upgrade to ${tierName}`}
          </h2>
          {subtitle && (
            <p className="text-sm" style={{ color: '#888' }}>
              {isHe ? `פתחי את ${subtitle}` : `Unlock ${subtitle}`}
            </p>
          )}
        </div>

        <div className="px-6 py-5 space-y-3">
          {bullets.map((text, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${goldColor}18` }}
              >
                <Check className="w-3 h-3" style={{ color: goldColor }} />
              </div>
              <p className="text-sm leading-snug" style={{ color: '#333' }}>{text}</p>
            </div>
          ))}
          {bullets.length === 0 && (
            <p className="text-sm text-center" style={{ color: '#888' }}>
              {isHe ? 'שדרגי כדי לפתוח את כל התכונות המתקדמות' : 'Upgrade to unlock all premium features'}
            </p>
          )}
        </div>

        <div className="px-6 pb-3 space-y-3">
          <button
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
            className="w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${goldColor}, ${goldDark})`,
              color: '#FFFFFF',
              boxShadow: `0 4px 20px ${goldColor}40`,
            }}
          >
            <Crown className="w-4 h-4" />
            {isHe ? `שדרוג ל-${tierName}` : `Upgrade to ${tierName}`}
          </button>
        </div>

        <div className="pb-5 text-center">
          <button
            onClick={onClose}
            className="text-xs hover:underline transition-colors"
            style={{ color: '#BBB' }}
          >
            {isHe ? 'לא עכשיו' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
