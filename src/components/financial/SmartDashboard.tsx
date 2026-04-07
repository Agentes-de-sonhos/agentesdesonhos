import { useState } from "react";
import { 
  Target, TrendingUp, Wallet, AlertTriangle, CheckCircle2, 
  Zap, Calendar, ArrowRight, Settings2, Loader2, Rocket,
  DollarSign, ArrowDownCircle, ArrowUpCircle, PiggyBank
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFinancial } from "@/hooks/useFinancial";
import { useFinancialGoals } from "@/hooks/useFinancialGoals";
import { useBookings } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function SmartDashboard() {
  const { sales, saleProducts, expenseEntries, customerPayments, supplierPayments, incomeEntries } = useFinancial();
  const { commissionsByBooking } = useBookings();
  const { goal, upsertGoal, currentMonth, currentYear, isLoading: goalLoading } = useFinancialGoals();
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({ profit_goal: 0, commission_margin: 10 });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Current month boundaries
  const now = new Date();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = daysInMonth - currentDay;

  // Monthly sales
  const monthlySales = sales.filter(s => s.sale_date >= monthStart && s.sale_date < `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`);
  const totalSoldMonth = monthlySales.reduce((sum, s) => sum + Number(s.sale_amount), 0);

  // Monthly commissions from sale_products
  const monthlySaleIds = new Set(monthlySales.map(s => s.id));
  const monthlyProducts = saleProducts.filter(p => monthlySaleIds.has(p.sale_id));
  const commissionGenerated = monthlyProducts.reduce((sum, p) => {
    const taxes = Number((p as any).non_commissionable_taxes) || 0;
    const base = Number(p.sale_price) - taxes;
    if (p.commission_type === 'percentage') return sum + (base * Number(p.commission_value) / 100);
    return sum + Number(p.commission_value);
  }, 0);

  // Booking commissions received this month
  let bookingCommissionsReceived = 0;
  let bookingCommissionsPending = 0;
  commissionsByBooking.forEach((val) => {
    bookingCommissionsReceived += val.received;
    bookingCommissionsPending += val.pending;
  });

  // Monthly expenses
  const monthlyExpenses = expenseEntries.filter(e => e.entry_date >= monthStart && e.entry_date < `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`);
  const totalExpensesMonth = monthlyExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fixedExpenses = monthlyExpenses.filter(e => e.expense_type === 'fixed').reduce((sum, e) => sum + Number(e.amount), 0);
  const variableExpenses = monthlyExpenses.filter(e => e.expense_type !== 'fixed').reduce((sum, e) => sum + Number(e.amount), 0);

  // Monthly customer payments
  const monthlyCustomerPayments = customerPayments.filter(p => p.payment_date >= monthStart);
  const totalReceivedMonth = monthlyCustomerPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Profit calculation
  const currentProfit = commissionGenerated - totalExpensesMonth;
  const commissionMargin = goal?.commission_margin || 10;
  const profitGoal = goal?.profit_goal || 0;

  // Break-even calculation: expenses / (margin/100)
  const breakEvenSales = commissionMargin > 0 ? totalExpensesMonth / (commissionMargin / 100) : 0;
  const reachedBreakEven = totalSoldMonth >= breakEvenSales;

  // Goal calculation
  const salesNeededForGoal = commissionMargin > 0 ? (totalExpensesMonth + profitGoal) / (commissionMargin / 100) : 0;
  const salesRemainingForGoal = Math.max(0, salesNeededForGoal - totalSoldMonth);
  const goalProgress = salesNeededForGoal > 0 ? Math.min(100, (totalSoldMonth / salesNeededForGoal) * 100) : 0;

  // Daily projections
  const dailyAvg = currentDay > 0 ? totalSoldMonth / currentDay : 0;
  const projectedMonthSales = dailyAvg * daysInMonth;
  const projectedCommission = projectedMonthSales * (commissionMargin / 100);
  const projectedProfit = projectedCommission - totalExpensesMonth;

  // Alerts
  const alerts: { type: "warning" | "success" | "info"; message: string }[] = [];
  if (reachedBreakEven) {
    alerts.push({ type: "success", message: "🎉 Suas vendas já cobrem os custos do mês! A partir de agora, é lucro." });
  } else {
    const remaining = breakEvenSales - totalSoldMonth;
    alerts.push({ type: "warning", message: `Faltam ${formatCurrency(remaining)} em vendas para cobrir os custos do mês.` });
  }
  if (profitGoal > 0 && totalSoldMonth >= salesNeededForGoal) {
    alerts.push({ type: "success", message: `🏆 Parabéns! Você atingiu sua meta de ${formatCurrency(profitGoal)} de lucro!` });
  } else if (profitGoal > 0) {
    alerts.push({ type: "info", message: `Faltam ${formatCurrency(salesRemainingForGoal)} em vendas para atingir sua meta.` });
  }
  if (currentDay > 10 && monthlySales.length < 3) {
    alerts.push({ type: "warning", message: "Baixo volume de vendas neste mês. Hora de acelerar!" });
  }

  const openGoalDialog = () => {
    setGoalForm({
      profit_goal: goal?.profit_goal || 0,
      commission_margin: goal?.commission_margin || 10,
    });
    setShowGoalDialog(true);
  };

  const handleSaveGoal = async () => {
    await upsertGoal.mutateAsync(goalForm);
    setShowGoalDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{MONTH_NAMES[currentMonth]} {currentYear}</h2>
          <p className="text-sm text-muted-foreground">
            <Calendar className="inline h-3.5 w-3.5 mr-1" />
            Dia {currentDay} de {daysInMonth} — {daysRemaining} dia{daysRemaining !== 1 ? "s" : ""} restante{daysRemaining !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openGoalDialog}>
          <Settings2 className="h-4 w-4 mr-2" />
          Definir Meta
        </Button>
      </div>

      {/* Smart Alerts */}
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-sm",
              alert.type === "success" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
              alert.type === "warning" && "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
              alert.type === "info" && "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400",
            )}
          >
            {alert.type === "success" ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> :
             alert.type === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
             <Zap className="h-4 w-4 mt-0.5 shrink-0" />}
            <span>{alert.message}</span>
          </div>
        ))}
      </div>

      {/* Main KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendido no Mês</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSoldMonth)}</div>
            <p className="text-xs text-muted-foreground">{monthlySales.length} venda{monthlySales.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comissão Gerada</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(commissionGenerated)}</div>
            <p className="text-xs text-muted-foreground">Margem média: {commissionMargin}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10">
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpensesMonth)}</div>
            <p className="text-xs text-muted-foreground">
              Fixas: {formatCurrency(fixedExpenses)} · Variáveis: {formatCurrency(variableExpenses)}
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
            <div className={cn("text-2xl font-bold", currentProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
              {formatCurrency(currentProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Comissões - Despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Break-Even & Goal Progress */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Break-Even */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Ponto de Equilíbrio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Precisa vender</span>
              <span className="font-semibold">{formatCurrency(breakEvenSales)}</span>
            </div>
            <Progress
              value={breakEvenSales > 0 ? Math.min(100, (totalSoldMonth / breakEvenSales) * 100) : 100}
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Vendido: {formatCurrency(totalSoldMonth)}</span>
              {reachedBreakEven ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Atingido!
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Faltam {formatCurrency(breakEvenSales - totalSoldMonth)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Goal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Meta de Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {profitGoal > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Meta: {formatCurrency(profitGoal)}</span>
                  <span className="font-semibold">Vender: {formatCurrency(salesNeededForGoal)}</span>
                </div>
                <Progress value={goalProgress} className="h-3" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{goalProgress.toFixed(0)}% concluído</span>
                  {goalProgress >= 100 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Meta atingida!
                    </span>
                  ) : (
                    <span>Faltam {formatCurrency(salesRemainingForGoal)}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground mb-2">Defina uma meta de lucro mensal</p>
                <Button variant="outline" size="sm" onClick={openGoalDialog}>
                  <Target className="h-4 w-4 mr-2" />
                  Definir Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projection */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Projeção do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Média diária</p>
              <p className="text-lg font-semibold">{formatCurrency(dailyAvg)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Vendas projetadas</p>
              <p className="text-lg font-semibold">{formatCurrency(projectedMonthSales)}</p>
            </div>
            <div className={cn("rounded-lg p-3 text-center", projectedProfit >= 0 ? "bg-emerald-500/5" : "bg-destructive/5")}>
              <p className="text-xs text-muted-foreground">Lucro projetado</p>
              <p className={cn("text-lg font-semibold", projectedProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                {formatCurrency(projectedProfit)}
              </p>
            </div>
          </div>
          {currentDay > 1 && (
            <p className="text-xs text-muted-foreground mt-3 text-center italic">
              {projectedProfit >= 0
                ? `Mantendo esse ritmo, você deve fechar o mês com ${formatCurrency(projectedProfit)} de lucro.`
                : `No ritmo atual, o mês pode fechar com prejuízo de ${formatCurrency(Math.abs(projectedProfit))}.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Entradas */}
      {(() => {
        const today = new Date().toISOString().split("T")[0];
        const incomeReceived = incomeEntries
          .filter(e => ((e as any).status === "received" || !(e as any).status) && e.entry_date >= monthStart)
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const incomePending = incomeEntries
          .filter(e => (e as any).status === "pending")
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const incomeOverdue = incomeEntries
          .filter(e => (e as any).status === "pending" && (e as any).expected_date && (e as any).expected_date < today)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  💰 Já no bolso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(incomeReceived + totalReceivedMonth)}</div>
                <p className="text-xs text-muted-foreground">recebido este mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-amber-500" />
                  ⏳ A caminho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(incomePending + bookingCommissionsPending)}</div>
                <p className="text-xs text-muted-foreground">previsto para entrar</p>
              </CardContent>
            </Card>
            <Card className={cn(incomeOverdue > 0 && "ring-1 ring-destructive/30")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  🚨 Atrasadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn("text-xl font-bold", incomeOverdue > 0 ? "text-destructive" : "text-muted-foreground")}>{formatCurrency(incomeOverdue)}</div>
                <p className="text-xs text-muted-foreground">cobrar urgente</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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
                placeholder="Ex: 10000"
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
                min={0}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Percentual médio que você recebe de comissão sobre as vendas.
                {goalForm.commission_margin > 0 && goalForm.profit_goal > 0 && (
                  <span className="block mt-1 font-medium text-foreground">
                    Você precisará vender {formatCurrency((totalExpensesMonth + goalForm.profit_goal) / (goalForm.commission_margin / 100))} para atingir essa meta.
                  </span>
                )}
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
