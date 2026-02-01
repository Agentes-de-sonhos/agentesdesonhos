import { ReactNode, useState } from "react";
import { usePromoterPresentation } from "@/hooks/usePromoterPresentation";
import { FeatureLimitDialog } from "@/components/promoter/FeatureLimitDialog";
import { TrackableFeature, FEATURE_LABELS } from "@/types/promoter-presentation";

interface PromoterFeatureGateProps {
  feature: TrackableFeature;
  children: ReactNode;
  onFeatureUsed?: () => void;
}

/**
 * Gate component for promoter demo mode.
 * Wraps features that should be limited to one use per presentation.
 * 
 * Usage:
 * <PromoterFeatureGate feature="itinerary_generator" onFeatureUsed={() => trackUsage()}>
 *   <Button onClick={handleGenerate}>Generate</Button>
 * </PromoterFeatureGate>
 */
export function PromoterFeatureGate({ 
  feature, 
  children, 
  onFeatureUsed 
}: PromoterFeatureGateProps) {
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const { isPromotor, canUseFeature, trackFeatureUsage, activePresentation } = usePromoterPresentation();

  // If not a promoter or no active presentation, just render children normally
  if (!isPromotor || !activePresentation) {
    return <>{children}</>;
  }

  const handleFeatureClick = () => {
    if (!canUseFeature(feature)) {
      setShowLimitDialog(true);
      return false;
    }

    // Track the usage
    trackFeatureUsage(feature);
    onFeatureUsed?.();
    return true;
  };

  return (
    <>
      <div onClick={(e) => {
        // Only intercept if we can't use the feature
        if (!canUseFeature(feature)) {
          e.preventDefault();
          e.stopPropagation();
          setShowLimitDialog(true);
        }
      }}>
        {children}
      </div>
      
      <FeatureLimitDialog
        open={showLimitDialog}
        onClose={() => setShowLimitDialog(false)}
        featureName={FEATURE_LABELS[feature]}
      />
    </>
  );
}

/**
 * Hook to check if a promoter can use a feature.
 * Returns a function that should be called before using the feature.
 */
export function usePromoterFeatureCheck() {
  const { isPromotor, canUseFeature, trackFeatureUsage, activePresentation } = usePromoterPresentation();

  const checkAndTrackFeature = (feature: TrackableFeature): { allowed: boolean; message?: string } => {
    // Not a promoter - always allowed
    if (!isPromotor) {
      return { allowed: true };
    }

    // Promoter without active presentation - not allowed
    if (!activePresentation) {
      return { 
        allowed: false, 
        message: "Você precisa iniciar uma apresentação primeiro." 
      };
    }

    // Check if feature was already used
    if (!canUseFeature(feature)) {
      return { 
        allowed: false, 
        message: `A funcionalidade "${FEATURE_LABELS[feature]}" já foi utilizada nesta apresentação.` 
      };
    }

    // Track and allow
    trackFeatureUsage(feature);
    return { allowed: true };
  };

  return { checkAndTrackFeature, isPromotor, activePresentation };
}
