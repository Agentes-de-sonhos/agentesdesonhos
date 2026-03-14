import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet, FileText, Route, Image, Wrench } from "lucide-react";
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
    description: "Crie uma carteira digital para o seu cliente.",
    color: "198 93% 40%",
  },
  {
    label: "Orçamento",
    icon: FileText,
    path: "/gerar-orcamento",
    description: "Gere orçamentos para os seus clientes.",
    color: "142 64% 38%",
  },
  {
    label: "Roteiros",
    icon: Route,
    path: "/criar-roteiro",
    description: "Gere roteiros de viagem personalizados com IA.",
    color: "262 60% 50%",
  },
  {
    label: "Conteúdo",
    icon: Image,
    path: "/criar-conteudo",
    description: "Gere conteúdos para redes sociais.",
    color: "25 90% 50%",
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tools.map((tool) => (
              <Tooltip key={tool.label}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(tool.path)}
                    className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 cursor-pointer"
                    style={{ ["--tool-color" as string]: tool.color }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
                      style={{
                        backgroundColor: `hsl(${tool.color} / 0.1)`,
                      }}
                    >
                      <tool.icon
                        className="h-5 w-5"
                        style={{ color: `hsl(${tool.color})` }}
                      />
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
