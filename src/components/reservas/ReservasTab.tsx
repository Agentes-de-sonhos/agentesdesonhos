import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Loader2, MapPin, Users, Search, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTravelFiles } from "@/hooks/useTravelFiles";
import {
  FILE_STATUS_LABELS,
  RESERVAS_FILTERS,
  filterTravelFiles,
  type ReservasFilterId,
} from "@/lib/travelFiles";
import type { TravelFileListItem } from "@/types/travelFile";

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

export function ReservasTab() {
  const navigate = useNavigate();
  const { files, isLoading } = useTravelFiles();
  const [filter, setFilter] = useState<ReservasFilterId>("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => filterTravelFiles(files, { filter, search }),
    [files, filter, search],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of RESERVAS_FILTERS) {
      map[f.id] = filterTravelFiles(files, { filter: f.id }).length;
    }
    return map;
  }, [files]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="relative sm:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nº do file, cliente, destino ou status..."
          className="h-10 rounded-lg bg-background pl-9"
        />
      </div>

      <div className="flex w-full min-w-0 flex-wrap gap-2">
        {RESERVAS_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
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
        ) : visible.length === 0 ? (
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
            {visible.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => navigate(`/reservas/${file.id}`)}
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
                </div>

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {money(file.requested_amount, file.currency)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Solicitado em {format(new Date(file.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
