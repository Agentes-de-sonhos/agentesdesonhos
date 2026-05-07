import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  Plane,
  Images,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

const ITEMS: ResourceItem[] = [
  { title: "Bloqueios Aéreos", icon: Plane, url: "/bloqueios-aereos" },
  { title: "Materiais de Divulgação", icon: Images, url: "/materiais" },
];

export function SalesResourcesCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[hsl(var(--section-news))]" />
              Recursos de Vendas
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-news))]" />
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

        <div className="rounded-xl bg-[hsl(var(--section-news))]/5 border border-[hsl(var(--section-news))]/15 px-3 py-2 space-y-0.5 w-full">
          <p className="text-sm font-semibold text-foreground leading-tight">💼 Mais oportunidades para vender</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Encontre bloqueios aéreos exclusivos e materiais prontos para impulsionar suas vendas.
          </p>
        </div>

        {!collapsed && (
          <div className="flex flex-wrap gap-3 w-full">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  aria-label={`Acessar ${item.title}`}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl w-[140px] sm:w-[150px] aspect-square p-4 text-sm font-semibold transition-all duration-200 border border-transparent",
                    "bg-[hsl(var(--section-news))]/15 text-[hsl(var(--section-news))]",
                    "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                  )}
                >
                  <Icon className="h-10 w-10 text-[hsl(var(--section-news))]" strokeWidth={2} />
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