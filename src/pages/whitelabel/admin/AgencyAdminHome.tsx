import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Clock,
  FileText,
  KanbanSquare,
  Loader2,
  Map,
  MapPin,
  Plane,
  RefreshCw,
  Ticket,
  UserPlus,
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
import { cn } from "@/lib/utils";
import { useAdminNav } from "@/lib/agencyAdminNav";
import { QuickAddClientDialog } from "@/components/crm/QuickAddClientDialog";
import { CreateOperationDialog } from "@/components/crm/operations/CreateOperationDialog";
import {
  useAgencyAdminDashboard,
  type AdminAttentionItem,
  type AdminRecentItem,
} from "@/hooks/useAgencyAdminDashboard";
import { brandAccent, brandCssVars, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { AgencyUserBadge } from "@/components/whitelabel/admin/AgencyUserBadge";

/**
 * Home operacional do painel administrativo white label.
 *
 * Exclusiva do painel da agência: Comunidade, Academy, Notícias e gamificação
 * ficam fora do escopo. Todos os dados vêm de uma única função segura no
 * servidor, que já aplica as permissões da equipe e não devolve valores
 * financeiros. Esta camada é puramente visual — nenhuma consulta, critério
 * ou destino de link foi alterado.
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

const timeLabel = (value?: string | null) => (value ? value.slice(0, 5) : null);

/** Cartão padrão das seções: título com ícone, linha da marca e ação opcional. */
function SectionCard({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  action?: { label: string; to: string };
  children: React.ReactNode;
  className?: string;
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
        {action && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-mr-1 h-7 gap-1 px-2 text-xs hover:bg-transparent"
          >
            <Link to={action.to} style={{ color: "var(--wl-accent)" }}>
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
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

const ATTENTION_VISIBLE = 6;

export default function AgencyAdminHome({ info }: { info: AgencyAdminPortalInfo }) {
  const { user } = useAuth();
  const nav = useAdminNav();
  const brand = brandAccent(info.primary_color);
  const { data, isLoading, isError, error, refetch } = useAgencyAdminDashboard();
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newOperationOpen, setNewOperationOpen] = useState(false);
  const [showAllAttention, setShowAllAttention] = useState(false);

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

  /**
   * Atalhos reais: os de criação abrem o fluxo completo (cliente e operação
   * abrem o próprio formulário aqui mesmo, sem sair do painel da agência).
   */
  const shortcuts = useMemo(() => {
    const list: {
      label: string;
      icon: typeof FileText;
      to?: string;
      onClick?: () => void;
    }[] = [];
    if (!can || can.clients_create)
      list.push({ label: "Novo cliente", icon: UserPlus, onClick: () => setNewClientOpen(true) });
    if (!can || can.quotes_create) list.push({ label: "Novo orçamento", to: nav.quote(), icon: FileText });
    if (!can || can.wallet_create) list.push({ label: "Nova carteira digital", to: nav.wallet(), icon: Wallet });
    if (!can || can.itineraries_create) list.push({ label: "Novo roteiro", to: nav.itinerary(), icon: Map });
    if (can?.operations_create)
      list.push({
        label: "Abrir operação",
        icon: Briefcase,
        onClick: () => setNewOperationOpen(true),
      });
    if (can?.reservations) list.push({ label: "Central de Reservas", to: nav.reservas(), icon: Ticket });
    if (!can || can.clients) list.push({ label: "Clientes", to: nav.crm("clientes"), icon: Users });
    return list.slice(0, 6);
  }, [can, nav]);

  const counters = useMemo(() => {
    const c = data?.counters;
    if (!c) return [];
    return [
      { label: "Reservas em andamento", value: c.reservations_pending, to: nav.reservas(), icon: Ticket },
      { label: "Oportunidades abertas", value: c.opportunities_open, to: nav.crm("funil"), icon: KanbanSquare },
      { label: "Operações ativas", value: c.operations_active, to: nav.crm("operacoes"), icon: Briefcase },
      {
        label: "Viagens em 30 dias",
        value: c.trips_next_30_days,
        to: nav.projects("carteiras"),
        icon: Plane,
      },
    ].filter((item) => item.value != null);
  }, [data?.counters, nav]);

  const attentionLink = (item: AdminAttentionItem): string => {
    if (item.kind === "reservation") return nav.reservas(item.id);
    if (item.kind === "followup") return `${nav.crm("funil")}?opportunity=${item.id}`;
    if (item.kind === "operation") return `${nav.crm("operacoes")}?operation=${item.id}`;
    return nav.home;
  };

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

  const RECENT_LABELS: Record<string, string> = {
    quote: "Orçamento",
    itinerary: "Roteiro",
    wallet: "Carteira digital",
    opportunity: "Oportunidade",
    operation: "Operação",
  };

  const attention = data?.attention ?? [];
  const visibleAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_VISIBLE);

  return (
    <div
      className="w-full min-w-0 space-y-4 animate-fade-in sm:space-y-5"
      style={brandCssVars(brand) as React.CSSProperties}
    >
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data?.attentionTotal
              ? `${data.attentionTotal} ${data.attentionTotal === 1 ? "item precisa" : "itens precisam"} da sua atenção hoje.`
              : "Aqui está o resumo operacional da sua agência."}
          </p>
        </div>
        {/* Identificação do usuário: exclusiva da página inicial. */}
        <AgencyUserBadge agencyName={agencyDisplayName(info)} />
      </header>

      {/* Atalhos rápidos */}
      {shortcuts.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {shortcuts.map(({ label, to, onClick, icon: Icon }) => {
            const body = (
              <>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                  style={{ backgroundColor: "var(--wl-tint)", color: "var(--wl-accent)" }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 text-[13px] font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                  {label}
                </span>
              </>
            );
            const shell =
              "group flex min-w-0 items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md";
            const hoverBorder = { ["--tw-ring-color" as string]: "var(--wl-accent)" };
            return to ? (
              <Link
                key={label}
                to={to}
                className={cn(shell, "hover:ring-1")}
                style={hoverBorder as React.CSSProperties}
              >
                {body}
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={cn(shell, "hover:ring-1")}
                style={hoverBorder as React.CSSProperties}
              >
                {body}
              </button>
            );
          })}
        </div>
      )}

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
            {error?.message || "Tente novamente em alguns instantes."}
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
          {/* Indicadores (somente contagens) */}
          {counters.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              {counters.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="group relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card px-3 py-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
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
                  </Link>
                );
              })}
            </div>
          )}

          {/* Precisa da sua atenção */}
          <SectionCard
            title="Precisa da sua atenção"
            icon={AlertTriangle}
            action={can?.reservations ? { label: "Reservas", to: nav.reservas() } : undefined}
          >
            {attention.length === 0 ? (
              <EmptyLine>Nada pendente por aqui. Tudo em dia.</EmptyLine>
            ) : (
              <>
                <ul className="divide-y divide-border/50">
                  {visibleAttention.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        to={attentionLink(item)}
                        className="-mx-2 flex min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "h-8 w-[3px] shrink-0 rounded-full",
                            item.priority === 1 ? "bg-rose-500" : "bg-amber-400",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="min-w-0 text-sm font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                            {item.title}
                          </p>
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                                item.priority === 1
                                  ? "bg-rose-50 text-rose-700 ring-rose-200/70"
                                  : "bg-amber-50 text-amber-700 ring-amber-200/70",
                              )}
                            >
                              {item.reason}
                            </span>
                            {item.subtitle && (
                              <span className="text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
                                {item.subtitle}
                              </span>
                            )}
                            {item.responsible_name && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <UserRound className="h-3 w-3" />
                                {item.responsible_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      </Link>
                    </li>
                  ))}
                </ul>
                {attention.length > ATTENTION_VISIBLE && (
                  <button
                    type="button"
                    onClick={() => setShowAllAttention((v) => !v)}
                    className="mt-2 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "var(--wl-accent)" }}
                  >
                    {showAllAttention
                      ? "Ver menos"
                      : `Ver tudo (${attention.length})`}
                  </button>
                )}
              </>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Meu dia */}
            <SectionCard
              title="Meu dia"
              icon={CalendarDays}
              action={can?.agenda ? { label: "Agenda", to: nav.agenda } : undefined}
            >
              <div className="space-y-2">
                {(data?.agenda ?? []).length === 0 && (data?.followups ?? []).length === 0 ? (
                  <EmptyLine>Nenhum compromisso ou follow-up para hoje.</EmptyLine>
                ) : (
                  <>
                    {(data?.agenda ?? []).map((event) => (
                      <div key={event.id} className="flex min-w-0 items-start gap-2.5 py-0.5">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm leading-tight text-foreground [overflow-wrap:anywhere]">
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {event.all_day
                              ? "Dia inteiro"
                              : timeLabel(event.event_time) || "Horário a definir"}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(data?.followups ?? []).map((fu) => (
                      <Link
                        key={fu.id}
                        to={`${nav.crm("funil")}?opportunity=${fu.opportunity_id}`}
                        className="-mx-2 flex min-w-0 items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm leading-tight text-foreground [overflow-wrap:anywhere]">
                            {fu.client_name || "Oportunidade"}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 text-[11px]",
                              fu.overdue ? "text-rose-600" : "text-muted-foreground",
                            )}
                          >
                            {fu.overdue ? "Follow-up vencido" : "Follow-up hoje"} ·{" "}
                            {dateLabel(fu.follow_up_date)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </>
                )}
              </div>
            </SectionCard>

            {/* Próximas viagens */}
            <SectionCard
              title="Próximas viagens"
              icon={Plane}
              action={
                can?.wallet ? { label: "Carteiras", to: nav.projects("carteiras") } : undefined
              }
            >
              {(data?.trips ?? []).length === 0 ? (
                <EmptyLine>Nenhuma viagem próxima registrada.</EmptyLine>
              ) : (
                <ul className="space-y-1">
                  {(data?.trips ?? []).map((trip) => (
                    <li key={trip.id}>
                      <Link
                        to={nav.wallet(trip.id)}
                        className="-mx-2 flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm font-medium leading-tight text-foreground [overflow-wrap:anywhere]">
                            {trip.client_name || trip.trip_title || "Viagem"}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {trip.destination || "Destino a definir"} · {dateLabel(trip.start_date)}
                          </p>
                        </div>
                        <span
                          className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: "var(--wl-tint)",
                            color: "var(--wl-accent)",
                          }}
                        >
                          {trip.days_remaining < 0
                            ? "Em viagem"
                            : trip.days_remaining === 0
                              ? "Embarca hoje"
                              : `${trip.days_remaining} dia${trip.days_remaining === 1 ? "" : "s"}`}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          {/* Continue de onde parou */}
          <SectionCard
            title="Continue de onde parou"
            icon={FileText}
            action={{ label: "Meus projetos", to: nav.projects() }}
          >
            {(data?.recent ?? []).length === 0 ? (
              <EmptyLine>Nenhum trabalho recente por aqui.</EmptyLine>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {(data?.recent ?? []).map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    to={recentLink(item)}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
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
                        {item.subtitle || "—"} ·{" "}
                        {format(new Date(item.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
