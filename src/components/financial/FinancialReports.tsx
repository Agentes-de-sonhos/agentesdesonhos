import { useState, useMemo } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

type PeriodFilter = "day" | "week" | "month" | "year" | "all";

export function FinancialReports() {
  const { sales, incomeEntries, expenseEntries } = useFinancial();
  const [period, setPeriod] = useState<PeriodFilter>("month");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStartDate = (period: PeriodFilter): Date | null => {
    const now = new Date();
    switch (period) {
      case "day":
        return startOfDay(now);
      case "week":
        return startOfWeek(now, { locale: ptBR });
      case "month":
        return startOfMonth(now);
      case "year":
        return startOfYear(now);
      case "all":
        return null;
    }
  };

  const filteredData = useMemo(() => {
    const startDate = getStartDate(period);
    
    const filterByDate = <T extends { sale_date?: string; entry_date?: string }>(
      items: T[],
      dateField: "sale_date" | "entry_date"
    ) => {
      if (!startDate) return items;
      return items.filter((item) => {
        const itemDate = new Date(item[dateField] as string);
        return itemDate >= startDate;
      });
    };

    const filteredSales = filterByDate(sales, "sale_date");
    const filteredIncome = filterByDate(incomeEntries, "entry_date");
    const filteredExpenses = filterByDate(expenseEntries, "entry_date");

    const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.sale_amount), 0);
    const totalIncome = filteredIncome.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const result = totalIncome - totalExpenses;

    return {
      totalSales,
      totalIncome,
      totalExpenses,
      result,
      salesCount: filteredSales.length,
      incomeCount: filteredIncome.length,
      expenseCount: filteredExpenses.length,
    };
  }, [sales, incomeEntries, expenseEntries, period]);

  const periodLabels: Record<PeriodFilter, string> = {
    day: "Hoje",
    week: "Esta Semana",
    month: "Este Mês",
    year: "Este Ano",
    all: "Todo Período",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Relatórios</h3>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="all">Todo Período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vendas
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(filteredData.totalSales)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.salesCount} venda(s) - {periodLabels[period]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entradas
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(filteredData.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.incomeCount} recebimento(s) - {periodLabels[period]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saídas
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(filteredData.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredData.expenseCount} despesa(s) - {periodLabels[period]}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resultado
            </CardTitle>
            <PiggyBank className={cn(
              "h-4 w-4",
              filteredData.result >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              filteredData.result >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}>
              {formatCurrency(filteredData.result)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Entradas - Saídas ({periodLabels[period]})
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
