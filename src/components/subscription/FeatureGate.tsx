import { ReactNode, useState } from "react";
import { Lock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature, FEATURE_LABELS, REQUIRED_PLAN_FOR_FEATURE } from "@/types/subscription";
import { UpgradeDialog } from "./UpgradeDialog";
import { cn } from "@/lib/utils";

interface FeatureGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
  showLockOverlay?: boolean;
}

export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showLockOverlay = true 
}: FeatureGateProps) {
  const { hasFeature, getPlanLabel } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showLockOverlay) {
    return null;
  }

  const requiredPlan = REQUIRED_PLAN_FOR_FEATURE[feature];

  return (
    <>
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowUpgrade(true)}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <div className="p-3 rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground">
              {FEATURE_LABELS[feature]}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Disponível a partir do plano {getPlanLabel(requiredPlan)}
            </p>
            <span className="text-xs text-primary underline mt-1">
              Clique para ver os planos
            </span>
          </div>
        </div>
        <div className="opacity-30 pointer-events-none">
          {children}
        </div>
      </div>

      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        requiredFeature={feature}
      />
    </>
  );
}

interface LockedOverlayProps {
  feature: Feature;
  className?: string;
}

export function LockedOverlay({ feature, className }: LockedOverlayProps) {
  const { hasFeature, getPlanLabel } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (hasFeature(feature)) {
    return null;
  }

  const requiredPlan = REQUIRED_PLAN_FOR_FEATURE[feature];

  return (
    <>
      <div 
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg cursor-pointer",
          className
        )}
        onClick={() => setShowUpgrade(true)}
      >
        <div className="flex flex-col items-center gap-2 text-center p-4">
          <div className="p-3 rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground">
            Recurso Bloqueado
          </h3>
          <p className="text-sm text-muted-foreground">
            Requer plano {getPlanLabel(requiredPlan)}
          </p>
          <span className="text-xs text-primary underline mt-1">
            Ver planos
          </span>
        </div>
      </div>

      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        requiredFeature={feature}
      />
    </>
  );
}
