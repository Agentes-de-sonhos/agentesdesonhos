import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles, Wand2, Image, FileText, ArrowRight, Wallet, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { useSubscription } from "@/hooks/useSubscription";

const tools = [
  {
    title: "Gerador de Roteiros",
    description: "Crie roteiros completos e personalizados em segundos com IA",
    icon: Wand2,
    href: "/ferramentas-ia/criar-roteiro",
    available: true,
    badge: "Disponível",
  },
  {
    title: "Criador de Conteúdo",
    description: "Transforme lâminas em textos persuasivos para suas redes",
    icon: Image,
    href: "/ferramentas-ia/criar-conteudo",
    available: true,
    badge: "Disponível",
  },
  {
    title: "Gerar Orçamento",
    description: "Monte orçamentos profissionais com todos os serviços",
    icon: FileText,
    href: "/ferramentas-ia/gerar-orcamento",
    available: true,
    badge: "Disponível",
  },
  {
    title: "Carteira Digital",
    description: "Organize vouchers, documentos e serviços da viagem do cliente em um único lugar",
    icon: Wallet,
    href: "/ferramentas-ia/trip-wallet",
    available: true,
    badge: "Novo",
  },
];

export default function FerramentasIA() {
  const { canUseAI, aiUsageRemaining, aiLimit, plan } = useSubscription();

  return (
    <SubscriptionGuard feature="ai_tools">
      <DashboardLayout>
        <div className="space-y-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Ferramentas IA
                </h1>
                <p className="text-muted-foreground">
                  Potencialize seu trabalho com inteligência artificial
                </p>
              </div>
            </div>

            {/* AI Usage Indicator */}
            {plan !== "premium" && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Uso de IA este mês:
                  </span>
                  <span className="font-medium">
                    {aiLimit - aiUsageRemaining} / {aiLimit} gerações
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all"
                    style={{ width: `${((aiLimit - aiUsageRemaining) / aiLimit) * 100}%` }}
                  />
                </div>
                {!canUseAI() && (
                  <p className="mt-2 text-xs text-destructive flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Limite mensal atingido. Faça upgrade para continuar.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.title}
                  className={tool.available ? "hover:shadow-md transition-shadow" : "opacity-60"}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant={tool.available ? "default" : "secondary"}>
                        {tool.badge}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3">{tool.title}</CardTitle>
                    <CardDescription>{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tool.available ? (
                      <Button asChild className="w-full">
                        <Link to={tool.href}>
                          Acessar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled className="w-full" variant="secondary">
                        Em breve
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
