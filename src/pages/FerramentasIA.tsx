import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles, Wand2, Image, ArrowRight, Lock, Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { useSubscription } from "@/hooks/useSubscription";

const tools = [
  {
    title: "Gerador de Roteiros",
    description: "Crie roteiros completos e personalizados em segundos utilizando inteligência artificial avançada",
    icon: Wand2,
    href: "/ferramentas-ia/criar-roteiro",
    highlight: "Roteiros dia a dia gerados automaticamente",
  },
  {
    title: "Criador de Conteúdo",
    description: "Transforme lâminas de divulgação em textos persuasivos para suas redes sociais com IA",
    icon: Image,
    href: "/ferramentas-ia/criar-conteudo",
    highlight: "Legendas, Stories e pitches de vendas",
  },
];

export default function FerramentasIA() {
  const { canUseAI, aiUsageRemaining, aiLimit, plan } = useSubscription();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Ferramentas com IA
            </h1>
            <p className="mt-2 text-muted-foreground text-lg">
              Potencialize seu trabalho com inteligência artificial
            </p>
          </div>

          {/* AI Usage Indicator */}
          {plan !== "profissional" && (
            <div className="max-w-md mx-auto p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Uso de IA este mês:
                </span>
                <span className="font-semibold">
                  {aiLimit - aiUsageRemaining} / {aiLimit} gerações
                </span>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                  style={{ width: `${((aiLimit - aiUsageRemaining) / aiLimit) * 100}%` }}
                />
              </div>
              {!canUseAI() && (
                <p className="mt-3 text-xs text-destructive flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  Limite mensal atingido. Faça upgrade para continuar.
                </p>
              )}
            </div>
          )}

          {/* AI Tools Grid */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-stretch max-w-4xl mx-auto">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.title}
                  className="flex-1 max-w-md hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20"
                >
                  <CardHeader className="pb-4 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                    </div>
                    <Badge variant="secondary" className="w-fit mx-auto mb-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Powered by IA
                    </Badge>
                    <CardTitle className="text-xl">{tool.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {tool.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
                      {tool.highlight}
                    </div>
                    <Button asChild className="w-full h-11 font-medium">
                      <Link to={tool.href}>
                        Acessar Ferramenta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-center text-sm text-muted-foreground max-w-lg mx-auto">
            Outras ferramentas como Orçamentos e Carteira Digital estão disponíveis no menu principal.
          </p>
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
