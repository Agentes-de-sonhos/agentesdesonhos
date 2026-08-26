import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Calendar,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAgencyTeamDirectory, useTravelFilesPage } from "@/hooks/useTravelFiles";
import {
  FILE_STATUS_LABELS,
  RESERVAS_FILTERS,
  type ReservasFilterId,
} from "@/lib/travelFiles";
import { isFileOverdue } from "@/lib/travelFileWorkflow";
import type { TravelFileListItem } from "@/types/travelFile";
import { useAdminNav } from "@/lib/agencyAdminNav";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

/** Datas no fuso local: "YYYY-MM-DD" é montado manualmente. */
const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const periodLabel = (file: TravelFileListItem): string => {
  const start = parseLocalDate(file.start_date);
  const end = parseLocalDate(file.end_date);
  if (!start && !end) return "Período a definir";
  const fmt = (d: Date) => format(d, "dd/MM/yyyy", { locale: ptBR });
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  return fmt((start || end) as Date);
};

function StatusPill({ status }: { status: TravelFileListItem["status"] }) {
  const tone =
    status === "cancelled"
      ? "bg-rose-50 text-rose-700 ring-rose-200/70"
      : status === "sale_confirmed" || status === "trip_completed"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200/70"
        : status === "request_received"
          ? "bg-primary/10 text-primary ring-primary/20"
          : "bg-amber-50 text-amber-700 ring-amber-200/70";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tone,
      )}
    >
      {FILE_STATUS_LABELS[status]}
    </span>
  );
}

const PAGE_SIZE = 20;

export function ReservasTab() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { members } = useAgencyTeamDirectory();
  const [filter, setFilter] = useState<ReservasFilterId>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [responsible, setResponsible] = useState("all");
  const [page, setPage] = useState(1);

  // Busca no servidor: aguarda o usuário parar de digitar.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const statuses = useMemo(() => {
    const found = RESERVAS_FILTERS.find((f) => f.id === filter);
    return found && found.statuses.length > 0 ? found.statuses : null;
  }, [filter]);

  const { items, total, counts, can, isLoading, isFetching } = useTravelFilesPage({
    search: debouncedSearch,
    statuses,
    from: from || null,
    to: to || null,
    responsibleTeamMemberId: responsible === "all" ? null : responsible,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const kpis = [
    { label: "Novas solicitações", value: counts.new, tone: "text-primary" },
    { label: "Aguardando reconfirmação", value: counts.awaiting_reconfirmation, tone: "text-amber-600" },
    { label: "Aguardando cliente", value: counts.awaiting_client, tone: "text-amber-600" },
    { label: "Confirmadas", value: counts.confirmed, tone: "text-emerald-600" },
    { label: "Em operação", value: counts.in_operation, tone: "text-foreground" },
  ];

  /** Somatórios da página atual — só aparecem com permissão financeira. */
  const pageAmounts = useMemo(() => {
    let requested = 0;
    let confirmed = 0;
    let currency = "BRL";
    for (const f of items) {
      currency = f.currency || currency;
      if (f.status === "cancelled") continue;
      requested += Number(f.requested_amount) || 0;
      if (f.status === "sale_confirmed" || f.status === "in_operation" || f.status === "trip_completed") {
        confirmed += Number(f.final_sale_amount ?? f.reconfirmed_amount ?? f.requested_amount) || 0;
      }
    }
    return { requested, confirmed, currency };
  }, [items]);

  const resetFilters = () => {
    setFilter("all");
    setSearch("");
    setFrom("");
    setTo("");
    setResponsible("all");
    setPage(1);
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="min-w-0 rounded-xl border border-border/60 bg-card px-3 py-2.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </p>
            <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", kpi.tone)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {can.revenue && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Valor solicitado (página atual)
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">
              {money(pageAmounts.requested, pageAmounts.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Vendas confirmadas (página atual)
            </p>
            <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">
              {money(pageAmounts.confirmed, pageAmounts.currency)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nº do file, cliente, destino ou serviço..."
            className="h-10 rounded-lg bg-background pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-2"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-3">
          <div className="min-w-0">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Viagem a partir de
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-9 bg-background"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Viagem até
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-9 bg-background"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Responsável
            </label>
            <Select
              value={responsible}
              onValueChange={(v) => {
                setResponsible(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="mt-1 h-9 bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>
      )}

      <div className="flex w-full min-w-0 flex-wrap gap-2">
        {RESERVAS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFilter(f.id);
              setPage(1);
            }}
            aria-pressed={filter === f.id}
            className={cn(
              "inline-flex h-auto items-center gap-1.5 whitespace-normal rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/60",
            )}
          >
            {f.label}
            <span className="tabular-nums opacity-70">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Ticket className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search || filter !== "all"
                ? "Nenhum processo encontrado"
                : "Nenhuma solicitação de reserva ainda"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search || filter !== "all"
                ? "Ajuste a busca ou os filtros para encontrar o processo desejado."
                : "Quando um cliente escolher os serviços no orçamento web, o processo de reserva aparece aqui."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => navigate(nav.reservas(file.id))}
                className="flex w-full min-w-0 flex-col gap-2 px-4 py-4 text-left transition-colors hover:bg-muted/40 md:px-5"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                    File nº {file.file_number_display}
                  </span>
                  {file.unread && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Nova</Badge>
                  )}
                  <StatusPill status={file.status} />
                  {file.revision > 1 && (
                    <span className="text-[11px] text-muted-foreground">Revisão {file.revision}</span>
                  )}
                  {isFileOverdue(file) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200/70">
                      <AlertTriangle className="h-3 w-3" />
                      Aguardando tratamento
                    </span>
                  )}
                </div>

                <p className="min-w-0 text-sm font-medium text-foreground [overflow-wrap:anywhere]">
                  {file.clientName || "Cliente do orçamento"}
                </p>

                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="[overflow-wrap:anywhere]">
                      {file.primary_destination || "Destino a definir"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {periodLabel(file)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {file.passengers_count} passageiro{file.passengers_count === 1 ? "" : "s"}
                  </span>
                  <span>
                    {file.servicesCount} serviço{file.servicesCount === 1 ? "" : "s"} solicitado
                    {file.servicesCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <UserRound className="h-3.5 w-3.5 shrink-0" />
                    {file.responsibleName || "Sem responsável"}
                  </span>
                </div>

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  {can.revenue && (
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {money(
                        file.final_sale_amount ?? file.reconfirmed_amount ?? file.requested_amount,
                        file.currency,
                      )}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Solicitado em {format(new Date(file.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {total} processo{total === 1 ? "" : "s"} · página {page} de {totalPages}
            {isFetching ? " · atualizando..." : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
