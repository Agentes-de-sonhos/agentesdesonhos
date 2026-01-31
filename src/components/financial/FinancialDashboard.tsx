import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinancialSummary } from "@/types/financial";
import { cn } from "@/lib/utils";

interface FinancialDashboardProps {
  summary: FinancialSummary;
}

export function FinancialDashboard({ summary }: FinancialDashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Vendas Hoje",
      value: summary.salesToday,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Vendas do Mês",
      value: summary.salesMonth,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Vendas do Ano",
      value: summary.salesYear,
      icon: DollarSign,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Faturado",
      value: summary.totalSales,
      icon: PiggyBank,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Custos",
      value: summary.totalCosts,
      icon: ArrowDownCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Lucro Bruto",
      value: summary.grossProfit,
      icon: TrendingUp,
      color: summary.grossProfit >= 0 ? "text-success" : "text-destructive",
      bgColor: summary.grossProfit >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      title: "Comissões",
      value: summary.totalCommissions,
      icon: Percent,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Lucro Líquido",
      value: summary.netProfit,
      icon: summary.netProfit >= 0 ? TrendingUp : TrendingDown,
      color: summary.netProfit >= 0 ? "text-success" : "text-destructive",
      bgColor: summary.netProfit >= 0 ? "bg-success/10" : "bg-destructive/10",
      isResult: true,
    },
  ];

  const cashFlowCards = [
    {
      title: "Recebido de Clientes",
      value: summary.totalCustomerPayments,
      icon: ArrowUpCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pago a Fornecedores",
      value: summary.totalSupplierPayments,
      icon: ArrowDownCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Saldo em Caixa",
      value: summary.cashBalance,
      icon: Wallet,
      color: summary.cashBalance >= 0 ? "text-success" : "text-destructive",
      bgColor: summary.cashBalance >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={cn(card.isResult && "ring-2 ring-primary/20")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", card.bgColor)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", card.color)}>
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {cashFlowCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", card.bgColor)}>
                  <card.icon className={cn("h-4 w-4", card.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", card.color)}>
                  {formatCurrency(card.value)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
