import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Sparkles, Wand2, MessageSquare, Image, FileText } from "lucide-react";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";

const tools = [
  {
    title: "Gerador de Roteiros",
    description: "Crie roteiros completos e personalizados em segundos",
    icon: Wand2,
    variant: "primary" as const,
  },
  {
    title: "Assistente de Vendas",
    description: "Tire dúvidas e receba sugestões em tempo real",
    icon: MessageSquare,
    variant: "default" as const,
  },
  {
    title: "Criador de Posts",
    description: "Gere conteúdo para redes sociais automaticamente",
    icon: Image,
    variant: "accent" as const,
  },
  {
    title: "Editor de Propostas",
    description: "Transforme orçamentos em propostas profissionais",
    icon: FileText,
    variant: "default" as const,
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
          {tools.map((tool) => (
            <QuickActionCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              variant={tool.variant}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
            Mais ferramentas em breve
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos desenvolvendo novas funcionalidades para você
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
