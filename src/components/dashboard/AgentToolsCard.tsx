import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, CreditCard, Store, FileText, Route, Image, Wrench } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const tools = [
  {
    label: "Carteira Digital",
    icon: Wallet,
    path: "/carteira-digital",
    description: "Acesse sua carteira digital com seus cartões e informações profissionais.",
  },
  {
    label: "Cartão Virtual",
    icon: CreditCard,
    path: "/meu-cartao",
    description: "Crie e compartilhe seu cartão de visitas digital com QR Code.",
  },
  {
    label: "Vitrine Virtual",
    icon: Store,
    path: "/minha-vitrine",
    description: "Monte e compartilhe sua vitrine de viagens para atrair clientes.",
  },
  {
    label: "Orçamento",
    icon: FileText,
    path: "/gerar-orcamento",
    description: "Crie orçamentos profissionais para seus clientes.",
  },
  {
    label: "Roteiros",
    icon: Route,
    path: "/criar-roteiro",
    description: "Gere roteiros de viagem personalizados com IA.",
  },
  {
    label: "Conteúdo",
    icon: Image,
    path: "/criar-conteudo",
    description: "Crie conteúdo para redes sociais a partir de materiais.",
  },
];

export function AgentToolsCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-4 space-y-4">
        <div>
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[hsl(var(--section-tools))]" />
            Ferramentas do Agente
          </h2>
          <div className="mt-2 h-1 w-16 rounded-full bg-[hsl(var(--section-tools))]" />
        </div>

        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {tools.map((tool) => (
              <Tooltip key={tool.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(tool.path)}
                    className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 hover:bg-[hsl(var(--section-tools))]/10 cursor-pointer"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--section-tools))]/10 transition-colors group-hover:bg-[hsl(var(--section-tools))]/20">
                      <tool.icon className="h-5 w-5 text-[hsl(var(--section-tools))]" />
                    </div>
                    <span className="text-xs font-medium text-foreground text-center leading-tight">
                      {tool.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px] text-center">
                  <p>{tool.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
