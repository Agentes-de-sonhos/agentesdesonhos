import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles, Wand2, Image, FileText, ArrowRight, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    title: "Trip Wallet",
    description: "Organize vouchers e documentos da viagem do cliente",
    icon: Wallet,
    href: "/ferramentas-ia/trip-wallet",
    available: true,
    badge: "Novo",
  },
];

export default function FerramentasIA() {
  return (
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
  );
}
