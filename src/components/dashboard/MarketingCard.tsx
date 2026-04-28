import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Store,
  CreditCard,
  Paintbrush,
  UserPlus,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketingItem {
  title: string;
  icon: LucideIcon;
  url: string;
  color: string;
  iconColor: string;
}

const MARKETING_ITEMS: MarketingItem[] = [
  { title: "Vitrine de Ofertas", icon: Store, url: "/minha-vitrine", color: "bg-pink-100 text-pink-700", iconColor: "text-pink-500" },
  { title: "Cartão de Visitas", icon: CreditCard, url: "/meu-cartao", color: "bg-rose-100 text-rose-700", iconColor: "text-rose-500" },
  { title: "Personalizador de Lâminas", icon: Paintbrush, url: "/personalizador-laminas", color: "bg-fuchsia-100 text-fuchsia-700", iconColor: "text-fuchsia-500" },
  { title: "Captação de Leads", icon: UserPlus, url: "/meus-leads", color: "bg-red-100 text-red-700", iconColor: "text-red-500" },
];

export function MarketingCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex items-start justify-between gap-3 sm:justify-start sm:flex-shrink-0">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-pink-600" />
                Marketing
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-pink-600" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 text-muted-foreground hover:text-foreground transition-transform sm:hidden"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
              aria-expanded={!collapsed}
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 sm:flex-1 min-w-0 w-full">
            <div className="rounded-xl bg-pink-600/5 border border-pink-600/15 px-3 py-2 space-y-0.5 min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-tight">📣 Divulgue melhor, venda mais</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Crie materiais, ofertas e ferramentas de captação para fortalecer sua presença e gerar mais oportunidades.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground transition-transform hidden sm:inline-flex flex-shrink-0"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir seção" : "Recolher seção"}
              aria-expanded={!collapsed}
            >
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`} />
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div
            className="grid gap-3 w-full"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}
          >
            {MARKETING_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  aria-label={`Acessar ${item.title}`}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-2xl w-full aspect-square text-xs font-medium transition-all duration-200 border p-2",
                    item.color,
                    "border-transparent hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                  )}
                >
                  <Icon className={cn("h-6 w-6", item.iconColor)} />
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
