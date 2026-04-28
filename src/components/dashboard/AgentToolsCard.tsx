import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  Wallet,
  FileText,
  Route,
  Image as ImageIcon,
  StickyNote,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

const TOOL_ITEMS: ToolItem[] = [
  { title: "Orçamento", icon: FileText, url: "/ferramentas-ia/gerar-orcamento" },
  { title: "Carteira Digital", icon: Wallet, url: "/ferramentas-ia/trip-wallet" },
  { title: "Roteiros", icon: Route, url: "/ferramentas-ia/criar-roteiro" },
  { title: "Conteúdo", icon: ImageIcon, url: "/ferramentas-ia/criar-conteudo" },
  { title: "Bloco de Notas", icon: StickyNote, url: "/bloco-notas" },
];

export function AgentToolsCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-5 w-5 text-purple-600" />
              Ferramentas do Agente
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-purple-600" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform flex-shrink-0"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
            aria-expanded={!collapsed}
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
          </Button>
        </div>

        <div className="rounded-xl bg-purple-600/5 border border-purple-600/15 px-3 py-2 space-y-0.5 w-full">
          <p className="text-sm font-semibold text-foreground leading-tight">🛠️ Crie e organize suas vendas</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Monte orçamentos, roteiros e conteúdos em poucos cliques e gerencie tudo em um só lugar.
          </p>
        </div>

        {!collapsed && (
          <div className="grid gap-3 w-full grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {TOOL_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  aria-label={`Acessar ${item.title}`}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl w-full aspect-square p-4 text-sm font-semibold transition-all duration-200 border border-transparent",
                    "bg-purple-100 text-purple-700",
                    "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                  )}
                >
                  <Icon className="h-10 w-10 text-purple-500" strokeWidth={2} />
                  <span className="text-center leading-tight px-1">{item.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
