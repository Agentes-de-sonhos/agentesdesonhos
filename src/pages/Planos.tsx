import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  ArrowRight,
  Loader2,
  ArrowLeft,
  Crown,
  Star,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlan } from "@/types/subscription";
import { cn } from "@/lib/utils";

interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  price: string;
  priceValue: number;
  period: string;
  description: string;
  microcopy: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
  icon: typeof Star;
}

const plans: PlanConfig[] = [
  {
    id: "start",
    name: "Start",
    price: "0",
    priceValue: 0,
    period: "",
    description: "Comece gratuitamente e teste as principais funcionalidades.",
    microcopy: "Sem custo. Comece agora.",
    icon: Star,
    features: [
      "3 últimos treinamentos da EducaTravel",
      "Notícias do trade",
      "2 roteiros com IA por dia",
      "2 conteúdos com IA por dia",
      "Agenda",
      "Mapa do Turismo",
      "Benefícios e descontos",
      "Materiais de divulgação",
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    price: "49",
    priceValue: 49,
    period: "/mês",
    description: "Tudo que você precisa para operar sua agência com eficiência.",
    microcopy: "Ideal para operação diária",
    badge: "MAIS ECONÔMICO",
    icon: Sparkles,
    features: [
      "Tudo do plano Start",
      "Todos os treinamentos da EducaTravel",
      "Orçamentos",
      "Carteira Digital",
      "Vitrine de Ofertas",
      "IA limitada: até 5 usos/dia",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "98",
    priceValue: 98,
    period: "/mês",
    description: "Para agentes que querem escalar resultados e se conectar com o mercado.",
    microcopy: "Para quem quer crescer mais rápido",
    badge: "MAIS ESCOLHIDO",
    highlighted: true,
    icon: Crown,
    features: [
      "Tudo do plano Profissional",
      "CRM completo",
      "Gestão Financeira",
      "IA ilimitada",
      "Comunidade exclusiva",
      "Networking com agentes",
      "Acesso completo sem limitações",
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

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscriptionCtx = (() => {
    try { return useSubscription(); } catch { return null; }
  })();
  const currentPlan = subscriptionCtx?.plan || null;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleAction = async (plan: PlanConfig) => {
    if (loadingPlan) return;

    // Free plan — just go to signup/dashboard
    if (plan.id === "start") {
      if (user) {
        navigate("/dashboard-start");
      } else {
        navigate("/auth?signup=true");
      }
      return;
    }

    // Paid plan — go directly to Stripe checkout (both logged-in and not)
    setLoadingPlan(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-public-checkout", {
        body: { plan: plan.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const getButtonConfig = (plan: PlanConfig) => {
    const currentLevel = currentPlan ? (PLAN_HIERARCHY[currentPlan] ?? 0) : -1;
    const targetLevel = PLAN_HIERARCHY[plan.id] ?? 0;

    if (user && currentPlan) {
      if (currentPlan === plan.id || (currentPlan === "fundador" && plan.id === "premium")) {
        return { label: "Seu plano atual", disabled: true };
      }
      if (targetLevel > currentLevel) {
        return { label: plan.id === "premium" ? "Fazer upgrade para Premium" : "Fazer upgrade", disabled: false };
      }
      return { label: "Plano inferior", disabled: true };
    }

    if (plan.id === "start") return { label: "Começar grátis", disabled: false };
    if (plan.id === "premium") return { label: "Assinar Premium", disabled: false };
    return { label: "Assinar plano", disabled: false };
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-card/70 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 flex h-16 items-center justify-between">
          <img
            src={logoAgentes}
            alt="Agentes de Sonhos"
            className="h-9 cursor-pointer"
            onClick={() => navigate("/")}
          />
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-xl font-semibold">
              {user ? "Minha conta" : "Já sou cliente"}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-20">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Escolha o plano ideal para você
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Comece grátis ou desbloqueie todo o potencial da plataforma.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan) => {
            const { label, disabled } = getButtonConfig(plan);
            const isLoading = loadingPlan === plan.id;
            const Icon = plan.icon;

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col transition-all duration-300 hover:-translate-y-1",
                  plan.highlighted
                    ? "border-primary shadow-[0_8px_30px_hsl(var(--primary)/0.15)] scale-[1.02] md:scale-105"
                    : "border-border/60 shadow-sm hover:shadow-md"
                )}
              >
                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase",
                      plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground"
                    )}
                  >
                    {plan.badge}
                  </div>
                )}

                <CardContent className="flex flex-col flex-1 p-7 pt-8">
                  {/* Plan header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      plan.highlighted ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        plan.highlighted ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-muted-foreground text-base">R$</span>
                      <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground text-base">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">{plan.microcopy}</p>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                  {/* Features */}
                  <div className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className={cn(
                          "h-4 w-4 flex-shrink-0 mt-0.5",
                          plan.highlighted ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button
                    size="lg"
                    variant={plan.highlighted ? "default" : "outline"}
                    className={cn(
                      "w-full gap-2 rounded-xl font-semibold transition-all duration-250",
                      plan.highlighted && "shadow-[0_10px_30px_hsl(var(--primary)/0.2)] hover:shadow-[0_14px_40px_hsl(var(--primary)/0.3)]"
                    )}
                    onClick={() => handleAction(plan)}
                    disabled={disabled || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirecionando...
                      </>
                    ) : (
                      <>
                        {label}
                        {!disabled && <ArrowRight className="h-4 w-4" />}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-8 max-w-lg mx-auto">
          Pagamento seguro via Stripe. Cancele quando quiser, sem fidelidade. Após o pagamento, você receberá um e-mail para concluir seu cadastro.
        </p>
      </div>
    </div>
  );
}
