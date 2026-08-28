import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  KanbanSquare,
  Loader2,
  Map,
  MapPin,
  Plane,
  Plus,
  RefreshCw,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAdminNav } from "@/lib/agencyAdminNav";
import { useWorkspace } from "@/workspace/WorkspaceProvider";
import { useViewport } from "@/lib/agencyAdminDensity";
import { QuickAddClientDialog } from "@/components/crm/QuickAddClientDialog";
import { CreateOperationDialog } from "@/components/crm/operations/CreateOperationDialog";
import { useFinancial } from "@/hooks/useFinancial";
import { useCommissionsReceivable } from "@/hooks/useCommissionsReceivable";
import { computeMonthIncomeSummary } from "@/lib/financialMonthSummary";
import {
  useAgencyAdminDashboard,
  type AdminActivityItem,
  type AdminRecentItem,
} from "@/hooks/useAgencyAdminDashboard";
import { brandAccent, brandCssVars, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";

/**
 * Home operacional do painel administrativo white label.
 *
 * Painel de ação e navegação: saudação com resumo real do dia, atalhos
 * compactos, indicadores clicáveis, agenda de hoje e dos próximos dias,
 * próximas viagens, resumo financeiro do mês e trabalho recente.
 *
 * Exclusiva do painel da agência: Comunidade, Academy, Notícias e gamificação
 * ficam fora do escopo. Os dados operacionais vêm de uma única função segura
 * no servidor, que aplica as permissões da equipe. Os valores financeiros
 * reutilizam as mesmas consultas e regras da Visão Geral da Gestão Financeira.
 */

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Datas "YYYY-MM-DD" montadas manualmente para respeitar o fuso local. */
function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const dateLabel = (value?: string | null) => {
  const d = parseLocalDate(value);
  return d ? format(d, "dd/MM", { locale: ptBR }) : "—";
};

const weekdayLabel = (value?: string | null) => {
  const d = parseLocalDate(value);
  return d ? format(d, "EEE", { locale: ptBR }).replace(".", "") : "";
};

const timeLabel = (value?: string | null) => (value ? value.slice(0, 5) : null);

const money = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

/** Cartão padrão das seções: título com ícone, linha da marca e ação opcional. */
function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
  extra,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  action?: { label: string; to: string; onClick?: () => void };
  children: React.ReactNode;
  className?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 rounded-2xl border-border/60 bg-card p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className="h-4 w-4" style={{ color: "var(--wl-accent)" }} />
            {title}
          </h2>
          <span
            aria-hidden
            className="mt-1.5 block h-[2px] w-8 rounded-full"
            style={{ backgroundColor: "var(--wl-accent)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          {extra}
          {action && (
            <Button
              variant="ghost"
              size="sm"
              className="-mr-1 h-7 gap-1 px-2 text-xs hover:bg-transparent"
              style={{ color: "var(--wl-accent)" }}
              onClick={action.onClick}
              asChild={!action.onClick}
            >
              {action.onClick ? (
                <span className="inline-flex items-center gap-1">
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              ) : (
                <Link to={action.to} style={{ color: "var(--wl-accent)" }}>
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </Button>
          )}
        </div>
      </div>
      {children}
    </Card>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-3 py-6 text-center">
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

/** Paginação interna: nunca usamos barras de rolagem nos blocos. */
function Pager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {page + 1} / {pages}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label="Anterior"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label="Próximo"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/** Botão de atalho: só ícone, tooltip, cor da agência e inversão no hover. */
function IconAction({
  label,
  icon: Icon,
  create,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  create?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-transparent focus-visible:border-transparent focus-visible:outline-none xl:h-14 xl:w-14"
          style={{ color: "var(--wl-accent)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--wl-accent)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "";
            e.currentTarget.style.color = "var(--wl-accent)";
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = "var(--wl-accent)";
            e.currentTarget.style.color = "#fff";
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = "";
            e.currentTarget.style.color = "var(--wl-accent)";
          }}
        >
          <Icon className="h-6 w-6 xl:h-[26px] xl:w-[26px]" />
          {create && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border/70 xl:h-5 xl:w-5"
              /* O "+" nunca herda o branco do ícone principal. */
              style={{ color: "var(--wl-accent)" }}
            >
              <Plus className="h-3 w-3 xl:h-3.5 xl:w-3.5" strokeWidth={2.5} />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}


const RECENT_LABELS: Record<string, string> = {
  quote: "Orçamento",
  itinerary: "Roteiro",
  wallet: "Carteira digital",
  opportunity: "Oportunidade",
  operation: "Operação",
};

type RecentTab = "projetos" | "oportunidades" | "operacoes";

export default function AgencyAdminHome({ info }: { info: AgencyAdminPortalInfo }) {
  const { user } = useAuth();
  const nav = useAdminNav();
  const navigate = useNavigate();
  const workspace = useWorkspace();
  const { width } = useViewport();
  const brand = brandAccent(info.primary_color);
  const { data, isLoading, isError, error, refetch } = useAgencyAdminDashboard();
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newOperationOpen, setNewOperationOpen] = useState(false);
  const [todayPage, setTodayPage] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(0);
  const [tripsPage, setTripsPage] = useState(0);
  const [recentTab, setRecentTab] = useState<RecentTab>("projetos");

  const { data: profileName } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });
  const firstName = (profileName?.name || "").trim().split(" ")[0] || "";

  const can = data?.can;

  /** Abre ou ativa a aba interna correspondente ao destino. */
  const openTab = useCallback(
    (to: string, title: string) => {
      if (workspace) workspace.openOrActivateTab(to, title);
      else navigate(to);
    },
    [navigate, workspace],
  );

  /* ------------------------- Atalhos (somente ícones) ------------------------ */
  const actions = useMemo(() => {
    const list: {
      label: string;
      icon: typeof Users;
      create?: boolean;
      onClick: () => void;
    }[] = [];
    if (!can || can.clients_create)
      list.push({ label: "Criar cliente", icon: Users, create: true, onClick: () => setNewClientOpen(true) });
    if (!can || can.quotes_create)
      list.push({
        label: "Criar orçamento",
        icon: FileText,
        create: true,
        onClick: () => openTab(nav.quote(), "Novo orçamento"),
      });
    if (!can || can.itineraries_create)
      list.push({
        label: "Criar roteiro",
        icon: Map,
        create: true,
        onClick: () => openTab(nav.itinerary(), "Novo roteiro"),
      });
    if (!can || can.wallet_create)
      list.push({
        label: "Criar carteira digital",
        icon: Wallet,
        create: true,
        onClick: () => openTab(nav.wallet(), "Nova carteira digital"),
      });
    if (!can || can.opportunities)
      list.push({
        label: "Criar oportunidade",
        icon: KanbanSquare,
        create: true,
        onClick: () => openTab(`${nav.crm("funil")}?new=1`, "Nova oportunidade"),
      });
    if (can?.operations_create)
      list.push({
        label: "Criar operação",
        icon: Briefcase,
        create: true,
        onClick: () => setNewOperationOpen(true),
      });
    return list;
  }, [can, nav, openTab]);

  const financialMenu = useMemo(
    () => [
      { label: "Vendas", tab: "vendas" },
      { label: "Entradas", tab: "entradas" },
      { label: "Despesas", tab: "despesas" },
      { label: "Comissões", tab: "comissoes" },
      { label: "Notas fiscais", tab: "faturas" },
    ],
    [],
  );

  /* --------------------------- Indicadores (3) ------------------------------ */
  const counters = useMemo(() => {
    const c = data?.counters;
    if (!c) return [];
    return [
      {
        label: "Novas oportunidades",
        hint: "Solicitações recebidas e ainda não tratadas",
        value: c.opportunities_new,
        icon: Sparkles,
        to: `${nav.crm("funil")}?filtro=novas`,
        title: "Oportunidades",
      },
      {
        label: "Oportunidades abertas",
        hint: "Todas que ainda não foram encerradas",
        value: c.opportunities_open,
        icon: KanbanSquare,
        to: `${nav.crm("funil")}?filtro=abertas`,
        title: "Oportunidades",
      },
      {
        label: "Operações ativas",
        hint: "Todas que ainda não foram concluídas ou canceladas",
        value: c.operations_active,
        icon: Briefcase,
        to: `${nav.crm("operacoes")}?filtro=ativas`,
        title: "Operações",
      },
    ].filter((item) => item.value != null);
  }, [data?.counters, nav]);

  /* ------------------------------- Agenda ---------------------------------- */
  const todayItems = data?.todayItems ?? [];
  const upcomingItems = data?.upcomingItems ?? [];
  const PAGE = 5;
  const todayPages = Math.max(1, Math.ceil(todayItems.length / PAGE));
  const upcomingPages = Math.max(1, Math.ceil(upcomingItems.length / PAGE));
  const todaySlice = todayItems.slice(todayPage * PAGE, todayPage * PAGE + PAGE);
  const upcomingSlice = upcomingItems.slice(upcomingPage * PAGE, upcomingPage * PAGE + PAGE);

  const activityLink = (item: AdminActivityItem) =>
    item.kind === "followup"
      ? `${nav.crm("funil")}?opportunity=${item.link_id}`
      : nav.agenda;

  /* ------------------------------- Viagens --------------------------------- */
  const trips = data?.trips ?? [];
  const tripsPerPage = width >= 1536 ? 5 : 4;
  const tripsPages = Math.max(1, Math.ceil(trips.length / tripsPerPage));
  const tripsSlice = trips.slice(tripsPage * tripsPerPage, tripsPage * tripsPerPage + tripsPerPage);

  /* ---------------------------- Resumo financeiro -------------------------- */
  const canFinancial = can?.financial !== false;
  const { incomeEntries } = useFinancial();
  const { data: commissions = [] } = useCommissionsReceivable();
  const now = new Date();
  const finance = useMemo(
    () =>
      computeMonthIncomeSummary(
        incomeEntries as any[],
        now.getMonth() + 1,
        now.getFullYear(),
        new Date().toISOString().slice(0, 10),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [incomeEntries],
  );
  const pendingInvoices = useMemo(
    () =>
      (commissions as any[]).filter(
        (c) => c.status !== "cancelado" && c.requires_invoice && c.invoice_status === "a_emitir",
      ).length,
    [commissions],
  );

  /* --------------------------- Trabalho recente ---------------------------- */
  const recentProjects = data?.recentProjects ?? [];
  const recentOpportunities = data?.recentOpportunities ?? [];
  const recentOperations = data?.recentOperations ?? [];

  const recentTabs: { key: RecentTab; label: string; items: AdminRecentItem[]; to: string; title: string }[] = [
    { key: "projetos", label: "Projetos", items: recentProjects, to: nav.projects(), title: "Meus projetos" },
    { key: "oportunidades", label: "Oportunidades", items: recentOpportunities, to: nav.crm("funil"), title: "Oportunidades" },
    { key: "operacoes", label: "Operações", items: recentOperations, to: nav.crm("operacoes"), title: "Operações" },
  ];
  const activeRecent = recentTabs.find((t) => t.key === recentTab) ?? recentTabs[0];

  const recentLink = (item: AdminRecentItem): string => {
    switch (item.kind) {
      case "quote":
        return nav.quote(item.id);
      case "itinerary":
        return nav.itinerary(item.id);
      case "wallet":
        return nav.wallet(item.id);
      case "opportunity":
        return `${nav.crm("funil")}?opportunity=${item.id}`;
      case "operation":
        return `${nav.crm("operacoes")}?operation=${item.id}`;
      default:
        return nav.home;
    }
  };

  /* ----------------------- Frase de resumo do dia -------------------------- */
  /** Diagnóstico: a mensagem técnica do banco fica só no console. */
  useEffect(() => {
    if (isError && error) console.error("[agency-admin-dashboard]", error);
  }, [isError, error]);

  const summarySentence = useMemo(() => {
    const acts = todayItems.length;
    const news = data?.counters?.opportunities_new ?? 0;
    const parts: string[] = [];
    if (acts > 0) parts.push(`${acts} ${acts === 1 ? "atividade hoje" : "atividades hoje"}`);
    if (news > 0)
      parts.push(`${news} ${news === 1 ? "nova oportunidade" : "novas oportunidades"}`);
    if (parts.length === 0) return "Nenhuma atividade para hoje. Bom momento para prospectar.";
    if (parts.length === 1) return `Você tem ${parts[0]}.`;
    return `Você tem ${parts[0]} e ${parts[1]}.`;
  }, [todayItems.length, data?.counters?.opportunities_new]);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="w-full min-w-0 space-y-4 animate-fade-in sm:space-y-5"
        style={brandCssVars(brand) as React.CSSProperties}
      >
        {/* Saudação + atalhos compactos */}
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {greeting()}
              {firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{summarySentence}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 xl:gap-3">
            {actions.map((a) => (
              <IconAction
                key={a.label}
                label={a.label}
                icon={a.icon}
                create={a.create}
                onClick={a.onClick}
              />
            ))}
            {canFinancial && (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Gestão financeira"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm transition-colors hover:border-transparent focus-visible:outline-none xl:h-14 xl:w-14"
                        style={{ color: "var(--wl-accent)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--wl-accent)";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "";
                          e.currentTarget.style.color = "var(--wl-accent)";
                        }}
                      >
                        <DollarSign className="h-6 w-6 xl:h-[26px] xl:w-[26px]" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Gestão financeira</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="min-w-[11rem]">
                  {financialMenu.map((m) => (
                    <DropdownMenuItem
                      key={m.tab}
                      className="cursor-pointer"
                      onSelect={() => openTab(`${nav.financeiro}?tab=${m.tab}`, m.label)}
                    >
                      {m.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Formulários abertos direto do painel da agência */}
        <QuickAddClientDialog open={newClientOpen} onOpenChange={setNewClientOpen} />
        <CreateOperationDialog open={newOperationOpen} onOpenChange={setNewOperationOpen} />

        {isError ? (
          <Card className="min-w-0 rounded-2xl border-border/60 p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Não foi possível carregar o resumo operacional
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Tente novamente em alguns instantes.
            </p>
            <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Indicadores operacionais */}
            {counters.length > 0 && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {counters.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => openTab(item.to, item.title)}
                      title={item.hint}
                      className="group relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card px-3 py-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ backgroundColor: "var(--wl-accent)" }}
                      />
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--wl-accent)" }} />
                        <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-1 text-2xl font-semibold leading-none tabular-nums text-foreground">
                        {item.value}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Meu dia + Próximos dias */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="Meu dia"
                icon={CalendarDays}
                action={can?.agenda ? { label: "Agenda", to: nav.agenda } : undefined}
              >
                {todayItems.length === 0 ? (
                  <EmptyLine>Nenhuma atividade para hoje.</EmptyLine>
                ) : (
                  <>
                    <ul className="divide-y divide-border/50">
                      {todaySlice.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <Link
                            to={activityLink(item)}
                            className="-mx-2 flex min-w-0 items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                          >
                            <span className="mt-0.5 w-10 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                              {item.all_day ? "Dia" : timeLabel(item.activity_time) || "--:--"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="min-w-0 text-sm font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                                {item.title}
                              </p>
                              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2">
                                <span
                                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: "var(--wl-tint)",
                                    color: "var(--wl-accent)",
                                  }}
                                >
                                  {item.type_label || "Atividade"}
                                </span>
                                {item.overdue && (
                                  <span className="text-[11px] font-medium text-rose-600">
                                    Vencido em {dateLabel(item.activity_date)}
                                  </span>
                                )}
                                {item.subtitle && (
                                  <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                                    {item.subtitle}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Pager page={todayPage} pages={todayPages} onPage={setTodayPage} />
                  </>
                )}
              </SectionCard>

              <SectionCard
                title="Próximos dias"
                icon={CalendarClock}
                action={can?.agenda ? { label: "Agenda", to: nav.agenda } : undefined}
              >
                {upcomingItems.length === 0 ? (
                  <EmptyLine>Nenhuma atividade agendada para os próximos dias.</EmptyLine>
                ) : (
                  <>
                    <ul className="divide-y divide-border/50">
                      {upcomingSlice.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <Link
                            to={activityLink(item)}
                            className="-mx-2 flex min-w-0 items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                          >
                            <span className="mt-0.5 w-14 shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                              {dateLabel(item.activity_date)}
                              <span className="block text-[10px] font-normal capitalize">
                                {weekdayLabel(item.activity_date)}
                              </span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="min-w-0 text-sm font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                                {item.title}
                              </p>
                              <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2">
                                <span
                                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: "var(--wl-tint)",
                                    color: "var(--wl-accent)",
                                  }}
                                >
                                  {item.type_label || "Atividade"}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {item.all_day
                                    ? "Dia inteiro"
                                    : timeLabel(item.activity_time) || "Horário a definir"}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Pager page={upcomingPage} pages={upcomingPages} onPage={setUpcomingPage} />
                  </>
                )}
              </SectionCard>
            </div>

            {/* Próximas viagens (largura total) */}
            <SectionCard
              title="Próximas viagens"
              icon={Plane}
              action={can?.wallet ? { label: "Ver todas", to: nav.projects("carteiras") } : undefined}
            >
              {trips.length === 0 ? (
                <EmptyLine>Nenhuma viagem nos próximos 60 dias.</EmptyLine>
              ) : (
                <>
                  <div
                    className={cn(
                      "grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4",
                      tripsPerPage === 5 && "2xl:grid-cols-5",
                    )}
                  >
                    {tripsSlice.map((trip) => (
                      <div
                        key={trip.id}
                        className="flex min-w-0 flex-col justify-between rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() =>
                            trip.operation_id
                              ? openTab(
                                  `${nav.crm("operacoes")}?operation=${trip.operation_id}`,
                                  "Operações",
                                )
                              : openTab(nav.wallet(trip.id), "Carteira digital")
                          }
                        >
                          <p className="min-w-0 truncate text-sm font-medium text-foreground">
                            {trip.client_name || trip.trip_title || "Viagem"}
                          </p>
                          <p className="mt-0.5 inline-flex min-w-0 max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {trip.destination || "Destino a definir"}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                            Partida {dateLabel(trip.start_date)}
                            {" · "}
                            {trip.days_remaining <= 0
                              ? "embarca hoje"
                              : `faltam ${trip.days_remaining} dia${trip.days_remaining === 1 ? "" : "s"}`}
                          </p>
                          <span
                            className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: "var(--wl-tint)",
                              color: "var(--wl-accent)",
                            }}
                          >
                            {trip.operation_status || "Sem operação"}
                          </span>
                        </button>
                        {trip.operation_id && trip.has_wallet && (
                          <button
                            type="button"
                            className="mt-2 self-start text-[11px] font-medium underline-offset-2 hover:underline"
                            style={{ color: "var(--wl-accent)" }}
                            onClick={() => openTab(nav.wallet(trip.id), "Carteira digital")}
                          >
                            Abrir carteira
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Pager page={tripsPage} pages={tripsPages} onPage={setTripsPage} />
                </>
              )}
            </SectionCard>

            {/* Resumo financeiro do mês (mesmas consultas da Visão Geral) */}
            {canFinancial && (
              <SectionCard
                title="Resumo financeiro do mês"
                icon={DollarSign}
                action={{
                  label: "Visão geral",
                  to: `${nav.financeiro}?tab=dashboard`,
                  onClick: () => openTab(`${nav.financeiro}?tab=dashboard`, "Gestão Financeira"),
                }}
              >
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground">Recebido</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">
                      {money(finance.received)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 px-3 py-2.5">
                    <p className="text-[11px] font-medium text-muted-foreground">A receber</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-amber-600">
                      {money(finance.pending)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl border px-3 py-2.5",
                      finance.overdue > 0 ? "border-destructive/40" : "border-border/60",
                    )}
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">Em atraso</p>
                    <p
                      className={cn(
                        "mt-1 text-xl font-semibold tabular-nums",
                        finance.overdue > 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {money(finance.overdue)}
                    </p>
                  </div>
                </div>
                {pendingInvoices > 0 && (
                  <button
                    type="button"
                    onClick={() => openTab(`${nav.financeiro}?tab=comissoes`, "Comissões")}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: "var(--wl-tint)", color: "var(--wl-accent)" }}
                  >
                    <FileText className="h-3 w-3" />
                    {pendingInvoices} nota{pendingInvoices === 1 ? "" : "s"} fiscal
                    {pendingInvoices === 1 ? "" : "is"} a emitir
                  </button>
                )}
              </SectionCard>
            )}

            {/* Continue de onde parou */}
            <SectionCard
              title="Continue de onde parou"
              icon={FileText}
              action={{
                label: "Ver todos",
                to: activeRecent.to,
                onClick: () => openTab(activeRecent.to, activeRecent.title),
              }}
              extra={
                <div className="flex flex-wrap items-center gap-1">
                  {recentTabs.map((t) => {
                    const active = t.key === recentTab;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setRecentTab(t.key)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                          active ? "" : "text-muted-foreground hover:bg-muted",
                        )}
                        style={
                          active
                            ? { backgroundColor: "var(--wl-accent)", color: "#fff" }
                            : undefined
                        }
                      >
                        {t.label} ({t.items.length})
                      </button>
                    );
                  })}
                </div>
              }
            >
              {activeRecent.items.length === 0 ? (
                <EmptyLine>Nenhum registro recente por aqui.</EmptyLine>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeRecent.items.slice(0, 4).map((item) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onClick={() =>
                        openTab(recentLink(item), RECENT_LABELS[item.kind] || "Registro")
                      }
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <span
                          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                          style={{ backgroundColor: "var(--wl-tint)", color: "var(--wl-accent)" }}
                        >
                          {RECENT_LABELS[item.kind] || item.kind}
                        </span>
                        <p className="mt-1 min-w-0 text-sm font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                          {item.subtitle || "—"}
                          {item.status ? ` · ${item.status}` : ""} ·{" "}
                          {format(new Date(item.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {item.responsible_name && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <UserRound className="h-3 w-3" />
                            {item.responsible_name}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
