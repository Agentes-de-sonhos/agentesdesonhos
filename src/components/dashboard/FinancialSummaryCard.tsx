import { useNavigate } from "react-router-dom";
import { TrendingUp, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

export function FinancialSummaryCard() {
  const navigate = useNavigate();
  const { summary, isLoading, sales } = useFinancial();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Count sales this month
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];
  const salesCountMonth = sales.filter(s => s.sale_date >= monthStartStr).length;

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Resumo Financeiro</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card hover:shadow-card-hover transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Resumo Financeiro</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80"
            onClick={() => navigate("/financeiro")}
          >
            Ver detalhes
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Monthly Sales Highlight */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vendas do Mês</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(summary.salesMonth)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {salesCountMonth} venda{salesCountMonth !== 1 ? "s" : ""} registrada{salesCountMonth !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Vendas Hoje</p>
            <p className="text-lg font-semibold">{formatCurrency(summary.salesToday)}</p>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">Saldo em Caixa</p>
            <p className={cn(
              "text-lg font-semibold",
              summary.cashBalance >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(summary.cashBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
