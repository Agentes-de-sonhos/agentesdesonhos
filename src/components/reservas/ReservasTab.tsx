import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  RefreshCw,
  Search,
  SlidersHorizontal,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TRAVEL_FILES_SORTS,
  useAgencyTeamDirectory,
  useTravelFilesPage,
  type TravelFilesSort,
} from "@/hooks/useTravelFiles";
import {
  FILE_STATUS_LABELS,
  RESERVAS_FILTERS,
  reservasFilterCount,
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
const FILTER_IDS = RESERVAS_FILTERS.map((f) => f.id) as string[];
const SORT_IDS = TRAVEL_FILES_SORTS.map((s) => s.value) as string[];

/** Chaves usadas na URL — o restante da query string é sempre preservado. */
type ParamKey = "q" | "status" | "from" | "to" | "resp" | "unread" | "sort" | "page";

export function ReservasTab() {
  const navigate = useNavigate();
  const nav = useAdminNav();
  const { members } = useAgencyTeamDirectory();
  const [params, setParams] = useSearchParams();

  // A URL é a fonte da verdade: busca, filtros, ordenação e página podem ser
  // compartilhados e sobrevivem ao recarregamento da página.
  const statusParam = params.get("status") || "all";
  const filter: ReservasFilterId = (FILTER_IDS.includes(statusParam) ? statusParam : "all") as ReservasFilterId;
  const urlSearch = params.get("q") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const responsible = params.get("resp") || "all";
  const unreadOnly = params.get("unread") === "1";
  const sortParam = params.get("sort") || "recent";
  const sort: TravelFilesSort = (SORT_IDS.includes(sortParam) ? sortParam : "recent") as TravelFilesSort;
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  const [search, setSearch] = useState(urlSearch);
  const [showAdvanced, setShowAdvanced] = useState(!!(from || to || responsible !== "all" || unreadOnly));

  /** Valores padrão nunca poluem a URL (o parâmetro é removido). */
  const DEFAULTS: Record<ParamKey, string> = {
    q: "",
    status: "all",
    from: "",
    to: "",
    resp: "all",
    unread: "0",
    sort: "recent",
    page: "1",
  };

  const patch = useCallback(
    (changes: Partial<Record<ParamKey, string | null>>, resetPage = true) => {
      const next = new URLSearchParams(params);
      const entries = { ...changes } as Partial<Record<ParamKey, string | null>>;
      if (resetPage && !("page" in changes)) entries.page = null;
      for (const [key, value] of Object.entries(entries) as [ParamKey, string | null][]) {
        if (!value || value === DEFAULTS[key]) next.delete(key);
        else next.set(key, value);
      }
      setParams(next, { replace: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, setParams],
  );

  // Busca no servidor: aguarda o usuário parar de digitar e reflete na URL.
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => patch({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, patch]);

  // Mantém o campo sincronizado quando a URL muda por fora (voltar/avançar).
  useEffect(() => {
    setSearch((current) => (current.trim() === urlSearch ? current : urlSearch));
  }, [urlSearch]);

  const statuses = useMemo(() => {
    const found = RESERVAS_FILTERS.find((f) => f.id === filter);
    return found && found.statuses.length > 0 ? found.statuses : null;
  }, [filter]);

  const { items, total, pages, counts, can, isLoading, isFetching, isError, error, refetch } =
    useTravelFilesPage({
      search: urlSearch,
      statuses,
      from: from || null,
      to: to || null,
      responsibleTeamMemberId: responsible === "all" ? null : responsible,
      unreadOnly,
      page,
      pageSize: PAGE_SIZE,
      sort,
    });

  // O servidor ajusta a página quando ela passa do total: refletir na URL.
  useEffect(() => {
    if (!isLoading && page > pages) patch({ page: pages > 1 ? String(pages) : null }, false);
  }, [isLoading, page, pages, patch]);

  const kpis = [
    { label: "Novas solicitações", value: counts.new, tone: "text-primary" },
    {
      label: "Aguardando reconfirmação",
      value: counts.awaiting_reconfirmation + counts.partially_available,
      tone: "text-amber-600",
    },
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

  const hasFilters = !!(urlSearch || filter !== "all" || from || to || responsible !== "all" || unreadOnly);

  const resetFilters = () => {
    setSearch("");
    const next = new URLSearchParams(params);
    for (const key of ["q", "status", "from", "to", "resp", "unread", "page", "sort"]) next.delete(key);
    setParams(next, { replace: true });
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
            placeholder="Buscar por nº do file, cliente, destino, serviço ou fornecedor..."
            className="h-10 rounded-lg bg-background pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => patch({ sort: v })}>
          <SelectTrigger className="h-10 w-full bg-background sm:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAVEL_FILES_SORTS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={unreadOnly ? "default" : "outline"}
          size="sm"
          className="h-10 gap-2"
          aria-pressed={unreadOnly}
          onClick={() => patch({ unread: unreadOnly ? null : "1" })}
        >
          Não lidas
          <span className="tabular-nums opacity-80">{counts.unread}</span>
        </Button>
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
              onChange={(e) => patch({ from: e.target.value || null })}
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
              onChange={(e) => patch({ to: e.target.value || null })}
              className="mt-1 h-9 bg-background"
            />
          </div>
          <div className="min-w-0">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Responsável
            </label>
            <Select value={responsible} onValueChange={(v) => patch({ resp: v === "all" ? null : v })}>
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
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={!hasFilters}>
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
            onClick={() => patch({ status: f.id === "all" ? null : f.id })}
            aria-pressed={filter === f.id}
            className={cn(
              "inline-flex h-auto items-center gap-1.5 whitespace-normal rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/60",
            )}
          >
            {f.label}
            <span className="tabular-nums opacity-70">{reservasFilterCount(counts, f.id)}</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {isError ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Não foi possível carregar as reservas
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {error?.message || "Tente novamente em alguns instantes."}
            </p>
            <Button size="sm" variant="outline" className="mt-4 gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Ticket className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {hasFilters ? "Nenhum processo encontrado" : "Nenhuma solicitação de reserva ainda"}
            </p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {hasFilters
                ? "Ajuste a busca ou os filtros para encontrar o processo desejado."
                : "Quando um cliente escolher os serviços no orçamento web, o processo de reserva aparece aqui."}
            </p>
            {hasFilters && (
              <Button size="sm" variant="outline" className="mt-4" onClick={resetFilters}>
                Limpar filtros
              </Button>
            )}
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

      {total > 0 && !isError && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {total} processo{total === 1 ? "" : "s"} · página {page} de {pages}
            {isFetching ? " · atualizando..." : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => patch({ page: page - 1 <= 1 ? null : String(page - 1) }, false)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages || isFetching}
              onClick={() => patch({ page: String(Math.min(pages, page + 1)) }, false)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
