import { useState } from "react";
import { Check, Lock, Sparkles, Star, Loader2 } from "lucide-react";
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
  PLAN_FEATURES,
  FEATURE_LABELS,
  REQUIRED_PLAN_FOR_FEATURE
} from "@/types/subscription";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredFeature?: Feature;
  title?: string;
  description?: string;
}

const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  start: <Star className="h-5 w-5" />,
  educa_pass: <Star className="h-5 w-5" />,
  cartao_digital: <Star className="h-5 w-5" />,
  essencial: <Star className="h-5 w-5" />,
  profissional: <Sparkles className="h-5 w-5" />,
  premium: <Sparkles className="h-5 w-5" />,
  fundador: <Sparkles className="h-5 w-5" />,
};

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  start: "border-muted bg-card",
  educa_pass: "border-muted bg-card",
  cartao_digital: "border-muted bg-card",
  essencial: "border-muted bg-card",
  profissional: "border-primary/50 bg-primary/5",
  premium: "border-primary/50 bg-primary/5",
  fundador: "border-primary/50 bg-primary/5",
};

const PLAN_BADGE_COLORS: Record<SubscriptionPlan, string> = {
  start: "bg-muted text-muted-foreground",
  educa_pass: "bg-muted text-muted-foreground",
  cartao_digital: "bg-muted text-muted-foreground",
  essencial: "bg-muted text-muted-foreground",
  profissional: "bg-primary text-primary-foreground",
  premium: "bg-primary text-primary-foreground",
  fundador: "bg-primary text-primary-foreground",
};

const plans: SubscriptionPlan[] = ["essencial", "profissional"];

export function UpgradeDialog({
  open,
  onOpenChange,
  requiredFeature,
  title,
  description,
}: UpgradeDialogProps) {
  const { plan: currentPlan, getPlanLabel } = useSubscription();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const STRIPE_PRICES: Partial<Record<SubscriptionPlan, string>> = {
    profissional: "price_1TE4lRFkGdVt5nieLz51QfLV",
  };

  const handleUpgrade = async (planKey: SubscriptionPlan) => {
    const priceId = STRIPE_PRICES[planKey];
    if (!priceId) {
      toast({ title: "Plano indisponível", description: "Entre em contato com o suporte.", variant: "destructive" });
      return;
    }
    setLoadingPlan(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
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
    ? `${FEATURE_LABELS[requiredFeature]} - Recurso Bloqueado`
    : "Escolha seu Plano");

  const dialogDescription = description || (requiredPlan
    ? `Este recurso está disponível a partir do plano ${getPlanLabel(requiredPlan)}. Faça upgrade para desbloquear.`
    : "Compare os planos e escolha o melhor para você.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {plans.map((planKey) => {
            const isCurrentPlan = planKey === currentPlan;
            const isPlanHigher = plans.indexOf(planKey) > plans.indexOf(currentPlan);
            const isRequiredPlan = planKey === requiredPlan;
            const features = PLAN_FEATURES[planKey];

            return (
              <div
                key={planKey}
                className={cn(
                  "relative rounded-xl border-2 p-4 transition-all",
                  PLAN_COLORS[planKey],
                  isRequiredPlan && "ring-2 ring-primary ring-offset-2",
                  isCurrentPlan && "border-primary"
                )}
              >
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 left-4 bg-primary">
                    Seu plano atual
                  </Badge>
                )}
                {isRequiredPlan && !isCurrentPlan && (
                  <Badge className="absolute -top-2 left-4 bg-amber-500">
                    Recomendado
                  </Badge>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("p-2 rounded-lg", PLAN_BADGE_COLORS[planKey])}>
                    {PLAN_ICONS[planKey]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{PLAN_LABELS[planKey]}</h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {PLAN_DESCRIPTIONS[planKey]}
                </p>

                <div className="space-y-2 mb-4">
                  {features.slice(0, 6).map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{FEATURE_LABELS[feature]}</span>
                    </div>
                  ))}
                  {features.length > 6 && (
                    <p className="text-xs text-muted-foreground ml-6">
                      +{features.length - 6} recursos adicionais
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={isPlanHigher ? "default" : "outline"}
                  disabled={isCurrentPlan || !isPlanHigher || loadingPlan === planKey || !STRIPE_PRICES[planKey]}
                  onClick={() => isPlanHigher && STRIPE_PRICES[planKey] && handleUpgrade(planKey)}
                >
                  {loadingPlan === planKey ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...</>
                  ) : isCurrentPlan 
                    ? "Plano Atual" 
                    : isPlanHigher && STRIPE_PRICES[planKey]
                      ? "Fazer Upgrade" 
                      : isPlanHigher
                        ? "Em breve"
                        : "Plano Inferior"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Entre em contato com nosso suporte para alterar seu plano ou saber mais sobre os benefícios de cada opção.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
