import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, ShoppingCart, Target, TrendingUp, Loader2, ChevronDown } from "lucide-react";
import { useSalesGoals, useSalesStats } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

const ITEMS = [
  { title: "Gestão de Clientes", icon: Users, url: "/gestao-clientes/clientes" },
  { title: "Oportunidades", icon: ShoppingCart, url: "/gestao-clientes/funil" },
];

export function ClientesCard() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { goal, isLoading: goalLoading } = useSalesGoals(month, year);
  const { stats, isLoading: statsLoading } = useSalesStats(month, year);
  const isLoading = goalLoading || statsLoading;

  const targetAmount = goal?.target_amount || 0;
  const totalSold = stats?.totalSold || 0;
  const remaining = Math.max(0, targetAmount - totalSold);
  const progressPercent = targetAmount > 0 ? Math.min(100, (totalSold / targetAmount) * 100) : 0;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-600" />
              Clientes
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-cyan-600" />
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

        <div className="rounded-xl bg-cyan-600/5 border border-cyan-600/15 px-3 py-2 space-y-0.5 w-full">
          <p className="text-sm font-semibold text-foreground leading-tight">👥 Gerencie sua carteira</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Acompanhe clientes, oportunidades e suas metas de venda em um só lugar.
          </p>
        </div>

        {!collapsed && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Botões */}
          <div className="grid grid-cols-2 gap-3">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url)}
                  aria-label={`Acessar ${item.title}`}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-2xl w-full aspect-square p-4 text-sm font-semibold transition-all duration-200 border border-transparent",
                    "bg-cyan-100 text-cyan-700",
                    "hover:scale-[1.02] hover:shadow-md hover:border-border/50"
                  )}
                >
                  <Icon className="h-10 w-10 text-cyan-500" strokeWidth={2} />
                  <span className="text-center leading-tight px-1">{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Card de Meta */}
          <div className="rounded-2xl border border-cyan-600/20 bg-cyan-50/40 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-cyan-700" />
              <h3 className="text-sm font-semibold text-cyan-900">Meta de Vendas</h3>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
              </div>
            ) : targetAmount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                <p className="text-xs text-muted-foreground">Nenhuma meta definida para este mês</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-cyan-600 text-cyan-700 hover:bg-cyan-100"
                  onClick={() => navigate("/gestao-clientes/metas")}
                >
                  Definir meta
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span
                      className={cn(
                        "font-semibold",
                        progressPercent >= 100 && "text-green-600",
                        progressPercent >= 75 && progressPercent < 100 && "text-cyan-700",
                        progressPercent < 75 && "text-foreground"
                      )}
                    >
                      {progressPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/70 p-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="h-3 w-3" /> Meta
                    </div>
                    <p className="font-semibold text-foreground mt-0.5">{formatCurrency(targetAmount)}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 p-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" /> Vendido
                    </div>
                    <p className="font-semibold text-green-600 mt-0.5">{formatCurrency(totalSold)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-dashed border-cyan-600/30 p-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Falta:</span>
                  <span className={cn("font-semibold", remaining === 0 ? "text-green-600" : "text-orange-600")}>
                    {remaining === 0 ? "Meta atingida! 🎉" : formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
