import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  UserCheck,
  UserPlus,
  Heart,
  Kanban,
  Briefcase,
  DollarSign,
  Target,
  Plane,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClients, useOpportunities, useSalesGoals, useSalesStats } from "@/hooks/useCRM";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useOperations } from "@/hooks/useOperations";
import { OPERATION_STAGES, getStageMeta } from "@/types/operations";
import { getStageTokens, CLIENT_STATUS_LABELS } from "@/types/crm";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function DashboardModule() {
  const navigate = useNavigate();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { clients, isLoading: loadingClients } = useClients();
  const { opportunities, isLoading: loadingOpps } = useOpportunities();
  const { stages, isLoading: loadingStages } = usePipelineStages();
  const { operations, isLoading: loadingOps } = useOperations();
  const { goal } = useSalesGoals(month, year);
  const { stats } = useSalesStats(month, year);

  const loading = loadingClients || loadingOpps || loadingStages || loadingOps;

  const kpis = useMemo(() => {
    const total = clients.length;
    const ativos = clients.filter((c) => c.status === "cliente_ativo").length;
    const leads = clients.filter((c) => c.status === "lead").length;
    const fidelizados = clients.filter((c) => c.status === "fidelizado").length;
    const oppsAtivas = opportunities.filter((o) => o.stage !== "closed" && o.stage !== "lost").length;
    const opsAtivas = operations.filter((o) => o.stage !== "finalizado").length;
    return { total, ativos, leads, fidelizados, oppsAtivas, opsAtivas };
  }, [clients, opportunities, operations]);

  const totalSold = stats?.totalSold || 0;
  const target = goal?.target_amount || 0;
  const goalPct = target > 0 ? Math.min(100, (totalSold / target) * 100) : 0;

  // Pipeline funnel data (dynamic stages)
  const pipelineData = useMemo(() => {
    return stages.map((stage) => {
      const opps = opportunities.filter(
        (o) => o.stage_id === stage.id || (!o.stage_id && o.stage === stage.legacy_key)
      );
      const value = opps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
      return { stage, count: opps.length, value };
    });
  }, [stages, opportunities]);
  const maxPipelineCount = Math.max(1, ...pipelineData.map((p) => p.count));

  // Conversion rate
  const closedCount = opportunities.filter((o) => o.stage === "closed").length;
  const totalOppsAll = opportunities.length || 1;
  const conversionRate = (closedCount / totalOppsAll) * 100;

  // Operations funnel
  const opsData = useMemo(
    () =>
      OPERATION_STAGES.map((s) => ({
        ...s,
        count: operations.filter((o) => o.stage === s.key).length,
      })),
    [operations]
  );

  // Operational alerts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming7 = operations.filter((o) => {
    const d = daysUntil(o.travel_start_date);
    return d !== null && d >= 0 && d <= 7 && o.stage !== "finalizado";
  });
  const pendingPayments = operations.filter((o) => o.payment_status !== "pago" && o.stage !== "finalizado");
  const travelingToday = operations.filter((o) => {
    const ds = daysUntil(o.travel_start_date);
    const de = daysUntil(o.travel_end_date);
    return ds !== null && de !== null && ds <= 0 && de >= 0;
  });

  // Stale opportunities (no movement in 5+ days)
  const fiveDaysAgo = Date.now() - 5 * 86400000;
  const staleOpps = opportunities.filter(
    (o) => o.stage !== "closed" && o.stage !== "lost" && new Date(o.stage_entered_at).getTime() < fiveDaysAgo
  );

  // Birthdays this month
  const birthdays = clients.filter((c) => c.birthday_month === month);

  // Recent
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.last_interaction_at).getTime() - new Date(a.last_interaction_at).getTime())
    .slice(0, 5);
  const recentOpps = [...opportunities]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Total de Clientes", value: kpis.total, icon: Users, color: "text-blue-600", bg: "bg-blue-100", onClick: () => navigate("/gestao-clientes/clientes") },
    { label: "Clientes Ativos", value: kpis.ativos, icon: UserCheck, color: "text-green-600", bg: "bg-green-100", onClick: () => navigate("/gestao-clientes/clientes") },
    { label: "Leads", value: kpis.leads, icon: UserPlus, color: "text-amber-600", bg: "bg-amber-100", onClick: () => navigate("/gestao-clientes/clientes") },
    { label: "Fidelizados", value: kpis.fidelizados, icon: Heart, color: "text-purple-600", bg: "bg-purple-100", onClick: () => navigate("/gestao-clientes/clientes") },
    { label: "Oportunidades", value: kpis.oppsAtivas, icon: Kanban, color: "text-violet-600", bg: "bg-violet-100", onClick: () => navigate("/gestao-clientes/funil") },
    { label: "Operações em Andamento", value: kpis.opsAtivas, icon: Briefcase, color: "text-sky-600", bg: "bg-sky-100", onClick: () => navigate("/gestao-clientes/operacoes") },
    { label: "Vendas do Mês", value: formatCurrency(totalSold), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100", onClick: () => navigate("/gestao-clientes/metas") },
    { label: "Meta do Mês", value: `${goalPct.toFixed(0)}%`, icon: Target, color: "text-rose-600", bg: "bg-rose-100", subtitle: target ? formatCurrency(target) : "Sem meta", onClick: () => navigate("/gestao-clientes/metas") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Visão geral</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {format(now, "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate("/gestao-clientes/clientes")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Cliente
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/gestao-clientes/funil")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Oportunidade
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/gestao-clientes/operacoes")}>
            <Plus className="h-4 w-4 mr-1" /> Nova Operação
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <button
            key={k.label}
            onClick={k.onClick}
            className="text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg"
          >
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg shrink-0", k.bg)}>
                    <k.icon className={cn("h-5 w-5", k.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                    <p className="text-2xl font-bold truncate">{k.value}</p>
                    {k.subtitle && <p className="text-xs text-muted-foreground truncate">{k.subtitle}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Goal progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-rose-600" /> Meta de Vendas
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/gestao-clientes/metas")}>
              Detalhes <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold break-words">{formatCurrency(totalSold)}</span>
            <span className="text-sm text-muted-foreground">
              de {formatCurrency(target)} ({goalPct.toFixed(0)}%)
            </span>
          </div>
          <Progress value={goalPct} className="h-3" />
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center text-sm pt-1">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Vendido</p>
              <p className="font-semibold text-emerald-600 text-xs sm:text-sm break-words">{formatCurrency(totalSold)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Restante</p>
              <p className="font-semibold text-orange-600 text-xs sm:text-sm break-words">{formatCurrency(Math.max(0, target - totalSold))}</p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Vendas</p>
              <p className="font-semibold">{stats?.salesCount || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funnels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Opportunities funnel */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Kanban className="h-5 w-5 text-violet-600" /> Funil de Oportunidades
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" /> {conversionRate.toFixed(1)}% conv.
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pipelineData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sem etapas configuradas.</p>
            ) : (
              pipelineData.map(({ stage, count, value }) => {
                const tokens = getStageTokens(stage.color);
                const pct = (count / maxPipelineCount) * 100;
                return (
                  <div key={stage.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium truncate">
                        <span className={cn("h-2 w-2 rounded-full", tokens.dot)} />
                        {stage.name}
                      </span>
                      <span className="text-muted-foreground tabular-nums shrink-0">
                        {count} · {formatCurrency(value)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all", tokens.bar)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Operations funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-sky-600" /> Funil de Operações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opsData.every((s) => s.count === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma operação ainda.</p>
            ) : (
              opsData.map((s) => {
                const max = Math.max(1, ...opsData.map((x) => x.count));
                const pct = (s.count / max) * 100;
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground tabular-nums">{s.count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all", s.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AlertCard
          icon={Plane}
          label="Embarques em 7 dias"
          value={upcoming7.length}
          color="text-sky-700"
          bg="bg-sky-50 border-sky-200"
        />
        <AlertCard
          icon={AlertTriangle}
          label="Pagamentos pendentes"
          value={pendingPayments.length}
          color="text-orange-700"
          bg="bg-orange-50 border-orange-200"
        />
        <AlertCard
          icon={Plane}
          label="Viajando hoje"
          value={travelingToday.length}
          color="text-emerald-700"
          bg="bg-emerald-50 border-emerald-200"
        />
        <AlertCard
          icon={Clock}
          label="Oportunidades paradas (5+ dias)"
          value={staleOpps.length}
          color="text-rose-700"
          bg="bg-rose-50 border-rose-200"
        />
      </div>

      {/* Lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Clientes recentes</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/gestao-clientes/clientes")}>
              Ver todos <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum cliente ainda.</p>
            ) : (
              recentClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b last:border-0 gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.city || "—"} · {CLIENT_STATUS_LABELS[c.status] || c.status}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(c.last_interaction_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Oportunidades recentes</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => navigate("/gestao-clientes/funil")}>
              Ver funil <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentOpps.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma oportunidade ainda.</p>
            ) : (
              recentOpps.map((o) => {
                const stage = stages.find((s) => s.id === o.stage_id || s.legacy_key === o.stage);
                const tokens = getStageTokens(stage?.color);
                return (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {o.client?.name || "Cliente"} — {o.destination}
                      </p>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <span className={cn("h-2 w-2 rounded-full", tokens.dot)} />
                        {stage?.name || o.stage}
                      </p>
                    </div>
                    <span className="text-sm font-semibold shrink-0">
                      {formatCurrency(o.estimated_value || 0)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming travels & birthdays */}
      {(upcoming7.length > 0 || birthdays.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {upcoming7.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plane className="h-5 w-5 text-sky-600" /> Próximos embarques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcoming7.slice(0, 5).map((o) => {
                  const d = daysUntil(o.travel_start_date);
                  return (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{o.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {o.destination || "—"} · {getStageMeta(o.stage).label}
                        </p>
                      </div>
                      <Badge variant={d === 0 ? "default" : "secondary"} className="shrink-0">
                        {d === 0 ? "hoje" : `em ${d}d`}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
          {birthdays.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" /> Aniversariantes do mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {birthdays.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {String(c.birthday_day).padStart(2, "0")}/{String(c.birthday_month).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function AlertCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: typeof Plane;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4 flex items-center gap-3", bg)}>
      <Icon className={cn("h-5 w-5 shrink-0", color)} />
      <div className="min-w-0">
        <p className={cn("text-2xl font-bold leading-tight", color)}>{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}