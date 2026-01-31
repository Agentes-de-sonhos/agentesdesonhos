import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
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
      title: "Total Entradas",
      value: summary.totalIncome,
      icon: ArrowUpCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Saídas",
      value: summary.totalExpenses,
      icon: ArrowDownCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Resultado",
      value: summary.result,
      icon: summary.result >= 0 ? TrendingUp : TrendingDown,
      color: summary.result >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
      bgColor: summary.result >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
      isResult: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className={cn(card.isResult && "sm:col-span-2 lg:col-span-1")}>
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
  );
}
