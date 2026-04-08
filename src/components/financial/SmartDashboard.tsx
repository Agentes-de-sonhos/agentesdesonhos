import { useState, useMemo } from "react";
import {
  Target, TrendingUp, Wallet, AlertTriangle, CheckCircle2,
  Zap, Calendar, Settings2, Loader2, Rocket,
  DollarSign, ArrowDownCircle, ArrowUpCircle, PiggyBank,
  ShoppingBag, BarChart3, Clock, ExternalLink,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFinancialExport } from "@/hooks/useFinancialExport";
import { ExportButton, ExportModal, type ExportFormat } from "@/components/financial/ExportModal";
import { exportFinancialData, prepareDashboardExport } from "@/utils/financialExport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useFinancial } from "@/hooks/useFinancial";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SHORT_MONTHS = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type PeriodOption = "month" | "last" | "quarter";

export function SmartDashboard() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { sales, saleProducts, expenseEntries, incomeEntries } = useFinancial();
  const { goal, upsertGoal, currentMonth, currentYear, isLoading: goalLoading } = useFinancialGoals();
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({ profit_goal: 0, commission_margin: 10 });
  const [period, setPeriod] = useState<PeriodOption>("month");
  const { showExport, setShowExport, agencyName } = useFinancialExport("Dashboard");

  const handleExportDashboard = async (p: { start: Date; end: Date }, fmt: ExportFormat) => {
    const { columns, rows, totals } = prepareDashboardExport(sales, incomeEntries, expenseEntries, saleProducts, p);
    await exportFinancialData({ tabLabel: "Dashboard", columns, rows, period: p, agencyName, totals }, fmt);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Period boundaries
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const y = currentYear;
    const m = currentMonth;
    if (period === "month") {
      return {
        periodStart: `${y}-${String(m).padStart(2, "0")}-01`,
        periodEnd: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        periodLabel: `${MONTH_NAMES[m]} ${y}`,
      };
    }
    if (period === "last") {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      return {
        periodStart: `${py}-${String(pm).padStart(2, "0")}-01`,
        periodEnd: `${y}-${String(m).padStart(2, "0")}-01`,
        periodLabel: `${MONTH_NAMES[pm]} ${py}`,
      };
    }
    // quarter: last 3 months
    const d = new Date(y, m - 3, 1);
    return {
      periodStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      periodEnd: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      periodLabel: `Últimos 3 meses`,
    };
  }, [period, currentMonth, currentYear]);

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
  const periodExpenses = useMemo(() => expenseEntries.filter(e => e.entry_date >= periodStart && e.entry_date < periodEnd), [expenseEntries, periodStart, periodEnd]);
  const periodIncome = useMemo(() => incomeEntries.filter(e => e.entry_date >= periodStart && e.entry_date < periodEnd), [incomeEntries, periodStart, periodEnd]);

  // KPIs
  const totalSold = periodSales.reduce((s, sale) => s + Number(sale.sale_amount), 0);
  const totalCommission = periodProducts.reduce((s, p) => s + calcProductCommission(p), 0);
  const totalExpenses = periodExpenses.reduce((s, e) => s + Number(e.amount), 0);

  // Income statuses
  const incomeReceived = periodIncome
    .filter(e => (e as any).status === "received")
    .reduce((s, e) => s + Number(e.amount), 0);
  const incomePending = periodIncome
    .filter(e => (e as any).status === "pending")
    .reduce((s, e) => s + Number(e.amount), 0);

  // Overdue: any pending income across ALL time where expected_date < today
  const overdueEntries = incomeEntries.filter(
    e => (e as any).status === "pending" && (e as any).expected_date && (e as any).expected_date < today
  );
  const overdueTotal = overdueEntries.reduce((s, e) => s + Number(e.amount), 0);

  // Profit
  const currentProfit = totalCommission - totalExpenses;

  // Projection (only for current month)
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;
  const dailyAvg = currentDay > 0 ? totalCommission / currentDay : 0;
  const projectedCommission = period === "month" ? dailyAvg * daysInMonth : totalCommission;
  const projectedProfit = period === "month" ? projectedCommission - totalExpenses : currentProfit;

  // Goal
  const profitGoal = goal?.profit_goal || 0;
  const goalProgress = profitGoal > 0 ? Math.min(100, (currentProfit / profitGoal) * 100) : 0;

  // Operational
  const ticketMedio = periodSales.length > 0 ? totalSold / periodSales.length : 0;
  const marginAvg = totalSold > 0 ? (totalCommission / totalSold) * 100 : 0;

  // Alerts
  const salesWithoutProducts = sales.filter(s => !saleProducts.some(p => p.sale_id === s.id));
  const upcomingIncome = incomeEntries.filter(
    e => (e as any).status === "pending" && (e as any).expected_date && (e as any).expected_date >= today &&
      (e as any).expected_date <= new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0]
  );

  // Chart data: monthly comparison (last 3 months)
  const chartData = useMemo(() => {
    const months: { month: string; receitas: number; despesas: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const ms = `${y}-${String(m).padStart(2, "0")}`;
      const mSales = sales.filter(s => s.sale_date.startsWith(ms));
      const mSaleIds = new Set(mSales.map(s => s.id));
      const mProducts = saleProducts.filter(p => mSaleIds.has(p.sale_id));
      const mCommission = mProducts.reduce((s, p) => s + calcProductCommission(p), 0);
      const mExpenses = expenseEntries.filter(e => e.entry_date.startsWith(ms)).reduce((s, e) => s + Number(e.amount), 0);
      months.push({ month: `${SHORT_MONTHS[m]}/${String(y).slice(2)}`, receitas: Math.round(mCommission), despesas: Math.round(mExpenses) });
    }
    return months;
  }, [sales, saleProducts, expenseEntries, currentMonth, currentYear]);

  const openGoalDialog = () => {
    setGoalForm({ profit_goal: goal?.profit_goal || 0, commission_margin: goal?.commission_margin || 10 });
    setShowGoalDialog(true);
  };

  const handleSaveGoal = async () => {
    await upsertGoal.mutateAsync(goalForm);
    setShowGoalDialog(false);
  };

  const goToTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{periodLabel}</h2>
          {period === "month" && (
            <p className="text-sm text-muted-foreground">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Dia {currentDay} de {daysInMonth} — {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border overflow-hidden">
            {([["month", "Este mês"], ["last", "Mês anterior"], ["quarter", "3 meses"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  period === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <ExportButton onClick={() => setShowExport(true)} />
          <Button variant="outline" size="sm" onClick={openGoalDialog}>
            <Settings2 className="h-4 w-4 mr-1" /> Meta
          </Button>
        </div>
      </div>
      <ExportModal open={showExport} onOpenChange={setShowExport} tabName="Dashboard" onExport={handleExportDashboard} />

      {/* ===== LINHA 1: RESUMO EXECUTIVO ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10"><Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(incomeReceived)}</div>
            <p className="text-xs text-muted-foreground">já entrou no caixa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(incomePending)}</div>
            <p className="text-xs text-muted-foreground">previsto no período</p>
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
              {overdueTotal > 0 ? `${overdueEntries.length} entrada${overdueEntries.length > 1 ? "s" : ""} vencida${overdueEntries.length > 1 ? "s" : ""}` : "nenhum atraso 🎉"}
            </p>
          </CardContent>
        </Card>

        <Card className={cn("ring-2", currentProfit >= 0 ? "ring-emerald-500/20" : "ring-destructive/20")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lucro Atual</CardTitle>
            <div className={cn("p-2 rounded-lg", currentProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10")}>
              <PiggyBank className={cn("h-4 w-4", currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{fmt(currentProfit)}</div>
            <p className="text-xs text-muted-foreground">comissões − despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== LINHA 2: INTELIGÊNCIA ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Projeção */}
        {period === "month" && (
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Projeção do Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Média diária</span>
                <span className="font-semibold">{fmt(dailyAvg)}</span>
              </div>
              <div className={cn("rounded-lg p-3 text-center", projectedProfit >= 0 ? "bg-emerald-500/5" : "bg-destructive/5")}>
                <p className="text-xs text-muted-foreground">Lucro projetado no mês</p>
                <p className={cn("text-xl font-bold", projectedProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {fmt(projectedProfit)}
                </p>
              </div>
              {currentDay > 1 && (
                <p className="text-xs text-muted-foreground text-center italic">
                  {projectedProfit >= 0
                    ? `Se continuar nesse ritmo, você fecha o mês com ${fmt(projectedProfit)} de lucro.`
                    : `No ritmo atual, o mês pode fechar com prejuízo de ${fmt(Math.abs(projectedProfit))}.`}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Meta */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" /> Meta de Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profitGoal > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-semibold">{fmt(profitGoal)}</span>
                </div>
                <Progress value={goalProgress} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{goalProgress.toFixed(0)}%</span>
                  {goalProgress >= 100 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Meta atingida!
                    </span>
                  ) : (
                    <span>Faltam {fmt(profitGoal - currentProfit)}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-2">Defina uma meta mensal</p>
                <Button variant="outline" size="sm" onClick={openGoalDialog}>
                  <Target className="h-4 w-4 mr-2" /> Definir Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalCommission >= totalExpenses && totalExpenses > 0 && (
              <div className="flex items-start gap-2 text-xs rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Suas comissões já cobrem os custos!</span>
              </div>
            )}
            {overdueTotal > 0 && (
              <div className="flex items-start gap-2 text-xs rounded-md border border-destructive/20 bg-destructive/5 p-2 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Você tem {fmt(overdueTotal)} em comissões atrasadas</span>
              </div>
            )}
            {profitGoal > 0 && currentProfit < profitGoal && (
              <div className="flex items-start gap-2 text-xs rounded-md border border-blue-500/20 bg-blue-500/5 p-2 text-blue-700 dark:text-blue-400">
                <Target className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Faltam {fmt(profitGoal - currentProfit)} para sua meta</span>
              </div>
            )}
            {totalCommission < totalExpenses && totalExpenses > 0 && (
              <div className="flex items-start gap-2 text-xs rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Despesas superando receitas — faltam {fmt(totalExpenses - totalCommission)}</span>
              </div>
            )}
            {periodSales.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-1">Sem dados suficientes para gerar insights.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== LINHA 3: GRÁFICO ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Receitas vs Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.some(d => d.receitas > 0 || d.despesas > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receitas" name="Comissões" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados para exibir o gráfico.</p>
          )}
        </CardContent>
      </Card>

      {/* ===== LINHA 4: ALERTAS ===== */}
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

      {/* ===== LINHA 5: RESUMO OPERACIONAL ===== */}
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
              <DollarSign className="h-3.5 w-3.5" /> Total Vendido
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
              <ArrowUpCircle className="h-3.5 w-3.5" /> Ticket Médio
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
              <ArrowDownCircle className="h-3.5 w-3.5" /> Margem Comissão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{marginAvg.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">média no período</p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meta de {MONTH_NAMES[currentMonth]}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meta de Lucro Mensal (R$)</Label>
              <Input
                type="number"
                value={goalForm.profit_goal}
                onChange={(e) => setGoalForm({ ...goalForm, profit_goal: Number(e.target.value) })}
                placeholder="Ex: 5000"
              />
              <p className="text-xs text-muted-foreground">Quanto você quer lucrar neste mês?</p>
            </div>
            <div className="space-y-2">
              <Label>Margem Média de Comissão (%)</Label>
              <Input
                type="number"
                value={goalForm.commission_margin}
                onChange={(e) => setGoalForm({ ...goalForm, commission_margin: Number(e.target.value) })}
                placeholder="Ex: 10"
                min={0} max={100}
              />
              <p className="text-xs text-muted-foreground">
                Percentual médio de comissão sobre vendas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveGoal} disabled={upsertGoal.isPending}>
              {upsertGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
