import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, Crown, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionPlan } from "@/types/subscription";

const TEST_PLANS: { id: SubscriptionPlan; label: string; icon: typeof Star; description: string }[] = [
  { id: "start", label: "Start", icon: Star, description: "Gratuito — acesso básico" },
  { id: "profissional", label: "Profissional", icon: Sparkles, description: "R$49/mês — acesso intermediário" },
  { id: "premium", label: "Premium", icon: Crown, description: "R$98/mês — acesso total" },
];

export function AdminPlanSwitcher() {
  const { user } = useAuth();
  const { plan, refetch } = useSubscription();
  const { toast } = useToast();
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (targetPlan: SubscriptionPlan) => {
    if (!user || switching || targetPlan === plan) return;
    setSwitching(targetPlan);

    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ plan: targetPlan })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      await refetch();

      toast({
        title: "Plano alterado",
        description: `Agora você está visualizando como ${TEST_PLANS.find(p => p.id === targetPlan)?.label}.`,
      });
    } catch (err: any) {
      console.error("Plan switch error:", err);
      toast({
        variant: "destructive",
        title: "Erro ao trocar plano",
        description: err.message || "Tente novamente.",
      });
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Simulador de Planos (Teste)</CardTitle>
        </div>
        <CardDescription>
          Alterne entre os planos para validar permissões, bloqueios e experiência de upgrade.
          Após trocar, navegue pela plataforma para testar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TEST_PLANS.map(({ id, label, icon: Icon, description }) => {
            const isActive = plan === id;
            const isLoading = switching === id;

            return (
              <button
                key={id}
                onClick={() => handleSwitch(id)}
                disabled={isActive || !!switching}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-left",
                  isActive
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/40 hover:bg-muted/50",
                  (!!switching && !isLoading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isActive && (
                  <Badge className="absolute -top-2.5 right-3 text-[10px]" variant="default">
                    Ativo
                  </Badge>
                )}
                <div className={cn(
                  "p-2.5 rounded-xl",
                  isActive ? "bg-primary/10" : "bg-muted"
                )}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : isActive ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Icon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          ⚠️ Isso altera seu plano real temporariamente. Lembre-se de voltar ao plano correto após os testes.
        </p>
      </CardContent>
    </Card>
  );
}
