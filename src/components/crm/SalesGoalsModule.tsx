import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  Trophy,
  ArrowUp,
  ArrowDown,
  Edit2,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSalesGoals, useSalesStats } from "@/hooks/useCRM";
import { cn } from "@/lib/utils";

export function SalesGoalsModule() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const { goal, setGoal, isSettingGoal } = useSalesGoals(currentMonth, currentYear);
  const { stats, isLoading } = useSalesStats(currentMonth, currentYear);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState(goal?.target_amount?.toString() || "");

  const monthName = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });

  const totalSold = stats?.totalSold || 0;
  const targetValue = goal?.target_amount || 0;
  const remaining = Math.max(0, targetValue - totalSold);
  const percentage = targetValue > 0 ? Math.min(100, (totalSold / targetValue) * 100) : 0;
  const isGoalMet = totalSold >= targetValue && targetValue > 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleSetGoal = async () => {
    const value = parseFloat(targetAmount) || 0;
    await setGoal(value);
    setIsDialogOpen(false);
  };

  const previousMonthComparison =
    stats?.previousMonthTotal && stats.previousMonthTotal > 0
      ? ((totalSold - stats.previousMonthTotal) / stats.previousMonthTotal) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Header with Goal Setting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold capitalize">Meta de {monthName}</h2>
          <p className="text-muted-foreground">Acompanhe seu progresso de vendas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              {goal ? "Editar Meta" : "Definir Meta"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir Meta Mensal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Meta de Faturamento ({monthName})</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSetGoal} disabled={isSettingGoal}>
                  Salvar Meta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Progress Card */}
      <Card className={cn("border-2", isGoalMet && "border-green-500 bg-green-50/50")}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-3 rounded-xl",
                  isGoalMet ? "bg-green-100" : "bg-primary/10"
                )}
              >
                <Target
                  className={cn("h-6 w-6", isGoalMet ? "text-green-600" : "text-primary")}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso da Meta</p>
                <p className="text-3xl font-bold">
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
            {isGoalMet && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700">
                <Trophy className="h-5 w-5" />
                <span className="font-medium">Meta Atingida!</span>
              </div>
            )}
          </div>

          <Progress value={percentage} className="h-4 mb-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Vendido</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalSold)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meta</p>
              <p className="text-xl font-bold">{formatCurrency(targetValue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Falta</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(remaining)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas no Mês</p>
                <p className="text-2xl font-bold">{stats?.salesCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maior Venda</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats?.biggestSale || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Melhor Cliente</p>
                <p className="text-lg font-bold truncate">
                  {stats?.topClient || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  previousMonthComparison >= 0 ? "bg-green-100" : "bg-red-100"
                )}
              >
                {previousMonthComparison >= 0 ? (
                  <ArrowUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">vs. Mês Anterior</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    previousMonthComparison >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {previousMonthComparison >= 0 ? "+" : ""}
                  {previousMonthComparison.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Sales */}
      {stats?.dailySales && stats.dailySales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Vendas por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.dailySales.slice(0, 10).map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-sm text-muted-foreground">
                      {format(new Date(day.date), "dd/MM", { locale: ptBR })}
                    </div>
                    <div className="flex-1 h-2 bg-muted rounded-full max-w-[200px]">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(100, (day.total / (stats.biggestSale || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{day.count} vendas</span>
                    <span className="font-medium">{formatCurrency(day.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
