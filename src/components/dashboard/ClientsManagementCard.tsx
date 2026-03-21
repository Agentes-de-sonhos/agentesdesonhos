import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Users, Target, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { useSalesGoals, useSalesStats } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

export function ClientsManagementCard() {
  const navigate = useNavigate();
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-[hsl(var(--section-financial))]" />
              Minha Meta
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-financial))]" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/gestao-clientes")}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Ver detalhes
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {targetAmount === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma meta definida para este mês</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/gestao-clientes/metas")}
            >
              Definir meta
            </Button>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso da Meta</span>
                <span 
                  className={cn(
                    "font-semibold",
                    progressPercent >= 100 && "text-green-600",
                    progressPercent >= 75 && progressPercent < 100 && "text-primary",
                    progressPercent < 75 && "text-foreground"
                  )}
                >
                  {progressPercent.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-3"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Target className="h-3 w-3" />
                  Meta do Mês
                </div>
                <p className="text-sm font-semibold">{formatCurrency(targetAmount)}</p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3 w-3" />
                  Total Vendido
                </div>
                <p className="text-sm font-semibold text-green-600">{formatCurrency(totalSold)}</p>
              </div>
            </div>

            {/* Remaining */}
            <div className="rounded-lg border border-dashed p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Falta para a meta:</span>
                <span 
                  className={cn(
                    "text-sm font-semibold",
                    remaining === 0 ? "text-green-600" : "text-orange-600"
                  )}
                >
                  {remaining === 0 ? "Meta atingida! 🎉" : formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
