import { useState } from "react";
import { Check, Lock, Sparkles, Star, Crown, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Feature, 
  SubscriptionPlan, 
  PLAN_LABELS, 
  PLAN_DESCRIPTIONS,
  FEATURE_LABELS,
  REQUIRED_PLAN_FOR_FEATURE
} from "@/types/subscription";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredFeature?: Feature;
  title?: string;
  description?: string;
}

interface PlanDisplay {
  id: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  features: string[];
  icon: React.ReactNode;
  highlighted?: boolean;
  badge?: string;
}

const UPGRADE_PLANS: PlanDisplay[] = [
  {
    id: "profissional",
    name: "Profissional",
    price: "R$ 49",
    period: "/mês",
    icon: <Sparkles className="h-5 w-5" />,
    badge: "Mais econômico",
    features: [
      "Orçamentos",
      "Carteira Digital",
      "Vitrine de Ofertas",
      "Materiais de divulgação",
      "IA: até 5 usos/dia",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 98",
    period: "/mês",
    icon: <Crown className="h-5 w-5" />,
    highlighted: true,
    badge: "Mais escolhido",
    features: [
      "Tudo do Profissional",
      "CRM completo",
      "Gestão Financeira",
      "IA ilimitada",
      "Comunidade exclusiva",
      "Networking com agentes",
      "Campanhas de vendas",
      "Oportunidades de eventos e Fam Trips",
      "Viaja com a Gente (em breve)",
      "Acesso completo",
    ],
  },
];

const PLAN_HIERARCHY: Record<string, number> = {
  start: 0,
  educa_pass: 0,
  cartao_digital: 0,
  essencial: 1,
  profissional: 2,
  premium: 3,
  fundador: 4,
};

export function UpgradeDialog({
  open,
  onOpenChange,
  requiredFeature,
  title,
  description,
}: UpgradeDialogProps) {
  const { plan: currentPlan, getPlanLabel } = useSubscription();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: SubscriptionPlan) => {
    setLoadingPlan(planId);
    try {
      if (!user) {
        onOpenChange(false);
        navigate(`/planos`);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-public-checkout", {
        body: { plan: planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao iniciar checkout.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const requiredPlan = requiredFeature 
    ? REQUIRED_PLAN_FOR_FEATURE[requiredFeature] 
    : undefined;

  const dialogTitle = title || (requiredFeature 
    ? `Essa funcionalidade faz parte de um plano superior`
    : "Faça upgrade para desbloquear");

  const dialogDescription = description || (requiredPlan
    ? `${FEATURE_LABELS[requiredFeature!]} está disponível a partir do plano ${getPlanLabel(requiredPlan)}. Escolha o melhor plano para você.`
    : "Escolha o plano ideal para desbloquear todas as funcionalidades.");

  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <DialogTitle>{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {UPGRADE_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan || (currentPlan === "fundador" && plan.id === "premium");
            const targetLevel = PLAN_HIERARCHY[plan.id] ?? 0;
            const canUpgrade = targetLevel > currentLevel;
            const isRecommended = plan.id === requiredPlan;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-xl border-2 p-5 transition-all",
                  plan.highlighted
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card",
                  isRecommended && "ring-2 ring-primary ring-offset-2",
                  isCurrentPlan && "border-primary"
                )}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground">
                    Seu plano atual
                  </Badge>
                )}
                {isRecommended && !isCurrentPlan && (
                  <Badge className="absolute -top-2.5 left-4 bg-amber-500 text-white">
                    Recomendado
                  </Badge>
                )}
                {plan.badge && !isCurrentPlan && !isRecommended && (
                  <Badge
                    className={cn(
                      "absolute -top-2.5 left-4",
                      plan.badge === "Mais escolhido"
                        ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-400 border-yellow-500 shadow-md"
                        : ""
                    )}
                    variant={plan.badge === "Mais escolhido" ? "default" : "secondary"}
                  >
                    {plan.badge}
                  </Badge>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    plan.highlighted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                  </div>
                </div>

                <div className="flex items-baseline gap-0.5 mb-4">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>

                <div className="space-y-2 mb-5">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full gap-2"
                  variant={canUpgrade ? "default" : "outline"}
                  disabled={isCurrentPlan || !canUpgrade || loadingPlan === plan.id}
                  onClick={() => canUpgrade && handleUpgrade(plan.id)}
                >
                  {loadingPlan === plan.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...</>
                  ) : isCurrentPlan 
                    ? "Plano Atual" 
                    : canUpgrade
                      ? <>Fazer Upgrade <ArrowRight className="h-4 w-4" /></>
                      : "Plano Inferior"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Pagamento seguro via Stripe. Cancele quando quiser.
        </p>
      </DialogContent>
    </Dialog>
  );
}
