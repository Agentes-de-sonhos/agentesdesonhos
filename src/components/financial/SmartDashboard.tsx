import { useMemo } from "react";
import {
  Wallet, AlertTriangle, PiggyBank,
  DollarSign, ArrowDownCircle, ArrowUpCircle,
  ShoppingBag, Clock, ExternalLink, MoreHorizontal, Download,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import { exportFinancialData, prepareDashboardExport } from "@/utils/financialExport";
import { projectExpensesInRange } from "@/utils/expenseRecurrence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface SmartDashboardProps {
  viewMonth: number;
  viewYear: number;
}

export function SmartDashboard({ viewMonth, viewYear }: SmartDashboardProps) {
  const [, setSearchParams] = useSearchParams();
  const { sales, saleProducts, expenseEntries, incomeEntries } = useFinancial();

  const getIncomeStatus = (entry: any) => {
    const rawStatus = String(entry?.status || "received").toLowerCase();

    if (["received", "recebido"].includes(rawStatus)) {
      return "received";
    }

    if (["pending", "a_receber", "prevista", "previsao_criada"].includes(rawStatus)) {
      return "pending";
    }

    return rawStatus;
  };

  const now = new Date();
  const { showExport, setShowExport, agencyName } = useFinancialExport("Dashboard");

  const handleExportDashboard = async (p: { start: Date; end: Date }, fmt: ExportFormat) => {
    const { columns, rows, totals } = prepareDashboardExport(sales, incomeEntries, expenseEntries, saleProducts, p);
    await exportFinancialData({ tabLabel: "Dashboard", columns, rows, period: p, agencyName, totals }, fmt);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const today = now.toISOString().split("T")[0];

  // Period boundaries based on selected month
  const periodStart = `${viewYear}-${String(viewMonth).padStart(2, "0")}-01`;
  const periodEnd = viewMonth === 12
    ? `${viewYear + 1}-01-01`
    : `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;

  // Helpers
  const calcProductCommission = (p: any) => {
    const taxes = Number(p.non_commissionable_taxes) || 0;
    const base = Number(p.sale_price) - taxes;
    return p.commission_type === "percentage"
      ? base * Number(p.commission_value) / 100
      : Number(p.commission_value);
  };

  // Filtered data for the selected period
  const periodSales = useMemo(() => sales.filter(s => s.sale_date >= periodStart && s.sale_date < periodEnd), [sales, periodStart, periodEnd]);
  const periodSaleIds = useMemo(() => new Set(periodSales.map(s => s.id)), [periodSales]);
  const periodProducts = useMemo(() => saleProducts.filter(p => periodSaleIds.has(p.sale_id)), [saleProducts, periodSaleIds]);
  const periodExpenses = useMemo(() => {
    // periodEnd é exclusivo (primeiro dia do mês seguinte). projectExpensesInRange
    // espera uma data final inclusiva, então passamos o último dia do mês corrente.
    const lastDay = new Date(viewYear, viewMonth, 0).getDate();
    const endInclusive = `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return projectExpensesInRange(expenseEntries, periodStart, endInclusive);
  }, [expenseEntries, periodStart, viewMonth, viewYear]);
  const periodIncome = useMemo(() => incomeEntries.filter(e => e.entry_date >= periodStart && e.entry_date < periodEnd), [incomeEntries, periodStart, periodEnd]);

  // KPIs
  const totalSold = periodSales.reduce((s, sale) => s + Number(sale.sale_amount), 0);
  const totalCommission = periodProducts.reduce((s, p) => s + calcProductCommission(p), 0);
  const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Income statuses
  const incomeReceived = periodIncome
    .filter(e => getIncomeStatus(e) === "received")
    .reduce((s, e) => s + Number(e.amount), 0);
  const incomePending = periodIncome
    .filter(e => getIncomeStatus(e) === "pending")
    .reduce((s, e) => s + Number(e.amount), 0);

  // Overdue: any pending income across ALL time where expected_date < today
  const overdueEntries = incomeEntries.filter(
    e => getIncomeStatus(e) === "pending" && (e as any).expected_date && (e as any).expected_date < today
  );
  const overdueTotal = overdueEntries.reduce((s, e) => s + Number(e.amount), 0);

  // Profit
  const currentProfit = totalCommission - totalExpenses;

  // Operational
  const ticketMedio = periodSales.length > 0 ? totalSold / periodSales.length : 0;
  const marginAvg = totalSold > 0 ? (totalCommission / totalSold) * 100 : 0;

  // Alerts
  const salesWithoutProducts = sales.filter(s => !saleProducts.some(p => p.sale_id === s.id));
  const upcomingIncome = incomeEntries.filter(
    e => (e as any).status === "pending" && (e as any).expected_date && (e as any).expected_date >= today &&
      (e as any).expected_date <= new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]
  );

  const goToTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => setShowExport(true)} className="cursor-pointer">
              <Download className="h-4 w-4 mr-2" /> Exportar dados
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ExportModal open={showExport} onOpenChange={setShowExport} tabName="Dashboard" onExport={handleExportDashboard} />

      {/* ===== RESUMO DO MÊS ===== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Resumo do mês</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10"><Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(incomeReceived)}</div>
            <p className="text-xs text-muted-foreground">Já entrou no caixa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(incomePending)}</div>
            <p className="text-xs text-muted-foreground">Previsto para este mês</p>
          </CardContent>
        </Card>

        <Card className={cn(overdueTotal > 0 && "ring-1 ring-destructive/30")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasado</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", overdueTotal > 0 ? "text-destructive" : "text-muted-foreground")}>{fmt(overdueTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {overdueTotal > 0 ? `${overdueEntries.length} pagamento${overdueEntries.length > 1 ? "s" : ""} vencido${overdueEntries.length > 1 ? "s" : ""}` : "Pagamentos vencidos"}
            </p>
          </CardContent>
        </Card>

        <Card className={cn("ring-2", currentProfit >= 0 ? "ring-emerald-500/20" : "ring-destructive/20")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro até agora</CardTitle>
            <div className={cn("p-2 rounded-lg", currentProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10")}>
              <PiggyBank className={cn("h-4 w-4", currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{fmt(currentProfit)}</div>
            <p className="text-xs text-muted-foreground">Comissões − despesas</p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* ===== VENDAS DO MÊS ===== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Vendas do mês</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ShoppingBag className="h-3.5 w-3.5" /> Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{periodSales.length}</div>
              <p className="text-xs text-muted-foreground">no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Total vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{fmt(totalSold)}</div>
              <p className="text-xs text-muted-foreground">valor bruto</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowUpCircle className="h-3.5 w-3.5" /> Ticket médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{fmt(ticketMedio)}</div>
              <p className="text-xs text-muted-foreground">por venda</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ArrowDownCircle className="h-3.5 w-3.5" /> Comissão média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{totalSold > 0 ? `${marginAvg.toFixed(1)}%` : "—"}</div>
              <p className="text-xs text-muted-foreground">média do período</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== PENDÊNCIAS ===== */}
      {(salesWithoutProducts.length > 0 || overdueEntries.length > 0 || upcomingIncome.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Atenção
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {salesWithoutProducts.slice(0, 3).map(s => (
              <button
                key={s.id}
                onClick={() => goToTab("vendas")}
                className="w-full flex items-center justify-between rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <span>⚠️ Venda "{s.client_name}" sem produtos cadastrados</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </button>
            ))}
            {overdueEntries.slice(0, 3).map(e => (
              <button
                key={e.id}
                onClick={() => goToTab("entradas")}
                className="w-full flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <span>🚨 Comissão de {fmt(Number(e.amount))} atrasada — {(e as any).expected_date}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </button>
            ))}
            {upcomingIncome.slice(0, 3).map(e => (
              <button
                key={e.id}
                onClick={() => goToTab("entradas")}
                className="w-full flex items-center justify-between rounded-md border border-blue-500/20 bg-blue-500/5 p-2.5 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <span>📅 {fmt(Number(e.amount))} previsto para {(e as any).expected_date}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
