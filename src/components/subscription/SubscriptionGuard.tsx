import { ReactNode, useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "./UpgradeDialog";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface SubscriptionGuardProps {
  feature: Feature;
  children: ReactNode;
}

export function SubscriptionGuard({ feature, children }: SubscriptionGuardProps) {
  const { hasFeature, getPlanLabel, getRequiredPlan } = useSubscription();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const navigate = useNavigate();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const requiredPlan = getRequiredPlan(feature);

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Lock className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Recurso Bloqueado
        </h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Este recurso está disponível a partir do plano {getPlanLabel(requiredPlan)}.
          Faça upgrade para desbloquear todas as funcionalidades.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => setShowUpgrade(true)}>
            Ver Planos
          </Button>
        </div>
      </div>

      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        requiredFeature={feature}
      />
    </DashboardLayout>
  );
}
