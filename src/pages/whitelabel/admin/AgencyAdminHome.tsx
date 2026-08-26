import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Map,
  MapPin,
  Plane,
  Ticket,
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
import {
  useAgencyAdminDashboard,
  type AdminAttentionItem,
  type AdminRecentItem,
} from "@/hooks/useAgencyAdminDashboard";
import { brandAccent, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";

/**
 * Home operacional do painel administrativo white label.
 *
 * Exclusiva do painel da agência: Comunidade, Academy, Notícias e gamificação
 * ficam fora do escopo. Todos os dados vêm de uma única função segura no
 * servidor, que já aplica as permissões da equipe e não devolve valores
 * financeiros.
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

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 rounded-2xl border-border/60 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        {action && (
          <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
            <Link to={action.to}>
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
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default function AgencyAdminHome({ info }: { info: AgencyAdminPortalInfo }) {
  const { user } = useAuth();
  const nav = useAdminNav();
  const brand = brandAccent(info.primary_color);
  const { data, isLoading } = useAgencyAdminDashboard();

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

  const shortcuts = useMemo(() => {
    const list: { label: string; to: string; icon: typeof FileText }[] = [];
    if (!can || can.quotes_create) list.push({ label: "Novo orçamento", to: nav.quote(), icon: FileText });
    if (!can || can.wallet_create) list.push({ label: "Nova carteira digital", to: nav.wallet(), icon: Wallet });
    if (!can || can.itineraries_create) list.push({ label: "Novo roteiro", to: nav.itinerary(), icon: Map });
    if (!can || can.clients) list.push({ label: "Clientes", to: nav.crm("clientes"), icon: Users });
    if (can?.reservations) list.push({ label: "Central de Reservas", to: nav.reservas(), icon: Ticket });
    return list.slice(0, 4);
  }, [can, nav]);

  const counters = useMemo(() => {
    const c = data?.counters;
    if (!c) return [];
    return [
      { label: "Reservas em andamento", value: c.reservations_pending, to: nav.reservas() },
      { label: "Oportunidades abertas", value: c.opportunities_open, to: nav.crm("funil") },
      { label: "Operações ativas", value: c.operations_active, to: nav.crm("operacoes") },
      { label: "Viagens em 30 dias", value: c.trips_next_30_days, to: nav.projects("carteiras") },
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

  return (
    <div className="w-full min-w-0 space-y-6 animate-fade-in">
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.attentionTotal
            ? `${data.attentionTotal} ${data.attentionTotal === 1 ? "item precisa" : "itens precisam"} da sua atenção hoje.`
            : "Aqui está o resumo operacional da sua agência."}
        </p>
      </header>

      {/* Atalhos de criação */}
      {shortcuts.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {shortcuts.map(({ label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/60"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: brand.tint, color: brand.accent }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                {label}
              </span>
            </Link>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Panorama operacional (somente contagens) */}
          {counters.length > 0 && (
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {counters.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="min-w-0 rounded-xl border border-border/60 bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                    {item.value}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Precisa de atenção */}
          <SectionCard
            title="Precisa da sua atenção"
            icon={AlertTriangle}
            action={can?.reservations ? { label: "Reservas", to: nav.reservas() } : undefined}
          >
            {(data?.attention ?? []).length === 0 ? (
              <EmptyLine>Nada pendente por aqui. Tudo em dia.</EmptyLine>
            ) : (
              <ul className="divide-y divide-border/50">
                {(data?.attention ?? []).map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    <Link
                      to={attentionLink(item)}
                      className="-mx-2 flex min-w-0 flex-col gap-1 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                            item.priority === 1
                              ? "bg-rose-50 text-rose-700 ring-rose-200/70"
                              : "bg-amber-50 text-amber-700 ring-amber-200/70",
                          )}
                        >
                          {item.reason}
                        </span>
                        {item.subtitle && (
                          <span className="text-[11px] text-muted-foreground">{item.subtitle}</span>
                        )}
                      </div>
                      <p className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                        {item.title}
                      </p>
                      {item.responsible_name && (
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5" />
                          {item.responsible_name}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Meu dia */}
            <SectionCard
              title="Meu dia"
              icon={CalendarDays}
              action={can?.agenda ? { label: "Agenda", to: nav.agenda } : undefined}
            >
              <div className="space-y-3">
                {(data?.agenda ?? []).length === 0 && (data?.followups ?? []).length === 0 ? (
                  <EmptyLine>Nenhum compromisso ou follow-up para hoje.</EmptyLine>
                ) : (
                  <>
                    {(data?.agenda ?? []).map((event) => (
                      <div key={event.id} className="flex min-w-0 items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere]">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                        className="-mx-2 flex min-w-0 items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm text-foreground [overflow-wrap:anywhere]">
                            {fu.client_name || "Oportunidade"}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                <ul className="space-y-3">
                  {(data?.trips ?? []).map((trip) => (
                    <li key={trip.id}>
                      <Link
                        to={nav.wallet(trip.id)}
                        className="-mx-2 flex min-w-0 items-start justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                            {trip.client_name || trip.trip_title || "Viagem"}
                          </p>
                          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {trip.destination || "Destino a definir"} · {dateLabel(trip.start_date)}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
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
                    className="min-w-0 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {RECENT_LABELS[item.kind] || item.kind}
                    </p>
                    <p className="mt-0.5 min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                      {item.subtitle || "—"} ·{" "}
                      {format(new Date(item.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
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
