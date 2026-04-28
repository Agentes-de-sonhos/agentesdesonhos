import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  DollarSign,
  LayoutDashboard,
  ShoppingBag,
  ArrowUpCircle,
  ArrowDownCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

const ITEMS: FinItem[] = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/financeiro?tab=dashboard" },
  { title: "Vendas", icon: ShoppingBag, url: "/financeiro?tab=vendas" },
  { title: "Entradas", icon: ArrowUpCircle, url: "/financeiro?tab=entradas" },
  { title: "Despesas", icon: ArrowDownCircle, url: "/financeiro?tab=despesas" },
];

export function FinanceiroCard() {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Financeiro
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-emerald-600" />
          </div>
        </div>

        <div className="rounded-xl bg-emerald-600/5 border border-emerald-600/15 px-3 py-2 space-y-0.5 w-full">
          <p className="text-sm font-semibold text-foreground leading-tight">💰 Controle suas finanças</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acompanhe vendas, entradas e despesas com a visão completa do seu negócio.
          </p>
        </div>

        <div className="grid gap-3 w-full grid-cols-2 sm:grid-cols-4">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                aria-label={`Acessar ${item.title}`}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-2xl w-full aspect-square p-4 text-sm font-semibold transition-all duration-200 border border-transparent",
                  "bg-emerald-100 text-emerald-700",
                  "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                )}
              >
                <Icon className="h-10 w-10 text-emerald-500" strokeWidth={2} />
                <span className="text-center leading-tight px-1">{item.title}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
