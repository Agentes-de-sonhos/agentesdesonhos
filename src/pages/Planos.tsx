import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoAgentes from "@/assets/logo-agentes-de-sonhos.png";
import { SEO } from "@/components/seo/SEO";
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
  ShieldCheck,
  Calculator,

} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { SubscriptionPlan } from "@/types/subscription";
import { getPlanOfferState } from "@/lib/promoAccess";
import { cn } from "@/lib/utils";

interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  price: string;
  priceValue: number;
  originalPrice?: string;
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
    id: "premium",
    name: "Premium",
    price: "196",
    priceValue: 196,
    period: "/mês",
    description: "Para agentes que querem escalar resultados e se conectar com o mercado.",
    microcopy: "15 dias de teste grátis · cancele quando quiser",
    badge: "15 DIAS GRÁTIS",
    highlighted: true,
    icon: Crown,
    features: [
      "Orçamentos personalizados com a identidade visual da agência + IA",
      "Roteiros sob medida para qualquer lugar do mundo com IA",
      "Carteira Digital com todas as informações e vouchers da viagem",
      "Gestão de clientes: CRM de passageiros, acompanhantes e radar de passaportes e vistos",
      "Gestão de atendimento e oportunidades",
      "Gestão de operações das viagens",
      "Gestão financeira completa: vendas, comissões e despesas",
      "Central de reservas",
      "Notícias do trade",
      "Agenda integrada",
      "Treinamentos e capacitação EducaTravel",
      "Comunidade exclusiva de agentes e eventos",
    ],
  },
];

const marketTools: { label: string; note: string; price: number }[] = [
  {
    label: "Criador de Roteiros & Orçamentos com IA",
    note: "softwares de propostas e itinerários",
    price: 100,
  },
  {
    label: "App / Carteira Digital de Viagem para o cliente",
    note: "apps de entrega de voucher",
    price: 80,
  },
  {
    label: "CRM e Gestão de Atendimento / Oportunidades",
    note: "controle de clientes e funil de vendas",
    price: 190,
  },
  {
    label: "Sistema Financeiro para Agências",
    note: "controle de vendas e comissões",
    price: 150,
  },
];

const MARKET_TOTAL = marketTools.reduce((sum, t) => sum + t.price, 0);
const PLAN_PRICE = 196;
const MONTHLY_SAVINGS = MARKET_TOTAL - PLAN_PRICE;
const SAVINGS_PERCENT = Math.round((MONTHLY_SAVINGS / MARKET_TOTAL) * 100);



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
  const { user, loading: authLoading } = useAuth();
  const subscriptionCtx = (() => {
    try { return useSubscription(); } catch { return null; }
  })();
  const currentPlan = subscriptionCtx?.plan || null;
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const offer = getPlanOfferState({
    loading: !!authLoading || (!!user && !!subscriptionCtx?.loading),
    hasUser: !!user,
    plan: currentPlan,
    subscription: subscriptionCtx?.subscription as any,
    planInherited: !!subscriptionCtx?.planInherited,
  });
  const effectivePlan = user ? offer.effectivePlan : null;

  const handleAction = async (plan: PlanConfig) => {
    if (loadingPlan) return;
    // Mesma checagem do botão: nunca iniciar checkout durante carregamento,
    // com promoção vigente, com plano herdado da master ou já contratado.
    if (getButtonConfig(plan).disabled) return;

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
    if (offer.blockedReason === "loading") {
      return { label: "Carregando…", disabled: true };
    }
    if (offer.blockedReason === "team_inherited") {
      return { label: "Plano da conta principal", disabled: true };
    }
    if (offer.coveredByPromo) {
      return {
        label: plan.id === "premium" ? "Incluído na sua promoção" : "Incluído no seu acesso atual",
        disabled: true,
      };
    }

    const currentLevel = effectivePlan ? (PLAN_HIERARCHY[effectivePlan] ?? 0) : -1;
    const targetLevel = PLAN_HIERARCHY[plan.id] ?? 0;

    if (user && effectivePlan) {
      if (effectivePlan === plan.id || (effectivePlan === "fundador" && plan.id === "premium")) {
        return { label: "Seu plano atual", disabled: true };
      }
      if (targetLevel > currentLevel) {
        return { label: plan.id === "premium" ? "Fazer upgrade para Premium" : "Fazer upgrade", disabled: false };
      }
      return { label: "Plano inferior", disabled: true };
    }

    return { label: "Começar teste de 15 dias grátis", disabled: false };

  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Planos e preços | Agentes de Sonhos"
        description="Escolha o plano ideal para sua agência de viagens. CRM, orçamentos, roteiros, carteira digital, IA e mais em uma única plataforma."
        canonical="/planos"
      />
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
            Tudo o que a sua agência precisa por menos da metade do preço
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            IA para orçamentos e roteiros, carteira digital, CRM, financeiro, treinamentos e
            comunidade em uma única plataforma integrada. Teste 15 dias sem compromisso.
          </p>
        </div>


        {offer.coveredByPromo && (
          <div
            role="status"
            className="max-w-3xl mx-auto mb-8 rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 text-sm text-muted-foreground"
          >
            Seu acesso promocional já inclui os recursos do Plano Premium
            {offer.promo.endDateLabel ? ` até ${offer.promo.endDateLabel}` : ""}. Não é necessário
            contratar nenhum plano agora.
          </div>
        )}

        {/* Ancoragem de preço */}
        <div className="max-w-3xl mx-auto mb-12">
          <Card className="border-border/60 rounded-2xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Se você contratasse tudo separado
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Hoje, para ter uma agência profissional, você precisaria de várias assinaturas — e
                elas não conversam entre si.
              </p>

              <div className="divide-y divide-border/60">
                {marketTools.map((tool) => (
                  <div
                    key={tool.label}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium leading-snug">{tool.label}</p>
                      <p className="text-xs text-muted-foreground">{tool.note}</p>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap text-muted-foreground">
                      R$ {tool.price} /mês
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 pt-4 mt-1 border-t border-border">
                <span className="text-sm font-semibold">Total contratado separadamente</span>
                <span className="text-lg font-bold line-through text-muted-foreground whitespace-nowrap">
                  R$ {MARKET_TOTAL} /mês
                </span>
              </div>

              <div className="mt-6 rounded-xl bg-primary/[0.05] border border-primary/20 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Na Agentes de Sonhos, tudo integrado</p>
                    <p className="text-xs text-muted-foreground">
                      E ainda inclui Central de reservas, Operações, Agenda, Notícias do trade,
                      Treinamentos EducaTravel e Comunidade.
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-primary whitespace-nowrap">
                    R$ {PLAN_PRICE} /mês
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary mt-4">
                  Sua economia: R$ {MONTHLY_SAVINGS} todos os meses ({SAVINGS_PERCENT}% menos), mais
                  de R$ {(MONTHLY_SAVINGS * 12).toLocaleString("pt-BR")} por ano.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Além da economia, você ganha tempo: o orçamento aprovado já vira passageiro no
                  CRM, gera a carteira digital e alimenta o seu financeiro sem retrabalho.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>


        <div className="grid grid-cols-1 gap-6 items-stretch max-w-md mx-auto">
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
                  {plan.highlighted && plan.badge && (
                    <p className="text-center text-xs font-semibold text-primary mb-3 -mt-2">
                      Sem cobrança nos primeiros 15 dias
                    </p>
                  )}

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

                  <p className="text-xs font-semibold text-primary mb-3">
                    Economize R$ {MONTHLY_SAVINGS}/mês em relação às ferramentas separadas
                  </p>




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
          Pagamento seguro via Stripe. Nada é cobrado hoje: o cartão é usado apenas para iniciar o
          teste e a primeira cobrança acontece após 15 dias. Cancele quando quiser, sem fidelidade.
        </p>

        {/* Bloco de confiança */}
        <div className="max-w-3xl mx-auto mt-10">
          <Card className="border-primary/20 bg-primary/[0.03] rounded-2xl">
            <CardContent className="flex flex-col sm:flex-row items-start gap-4 p-6">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base tracking-tight">Teste sem compromisso</h3>
                <p className="text-sm text-muted-foreground leading-[1.65]">
                  Você tem 15 dias para usar todos os recursos da Agentes de Sonhos. Se cancelar
                  antes do fim do período de teste, nenhum valor é cobrado. Sem fidelidade: você
                  pode cancelar quando quiser.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
