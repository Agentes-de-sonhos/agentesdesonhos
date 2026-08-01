import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, MapPin, User, Calendar, Edit2, ExternalLink, Loader2, Search, Clock, AlertCircle, RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpcomingTrips, parseLocalDate, type UpcomingTrip } from "@/hooks/useUpcomingTrips";
import { useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";

export type PeriodFilter = "all" | "7" | "30";
export type StatusFilter = "all" | "future" | "in_progress";

/** Shared search + filter + ordering rules (pure, kept for tests). */
export function filterUpcomingTrips(
  trips: UpcomingTrip[],
  { search, period, status }: { search: string; period: PeriodFilter; status: StatusFilter },
): UpcomingTrip[] {
  const term = search.trim().toLowerCase();
  return trips
    .filter((t) => {
      if (status === "future" && t.inProgress) return false;
      if (status === "in_progress" && !t.inProgress) return false;
      if (period !== "all" && t.daysRemaining > Number(period)) return false;
      if (!term) return true;
      const haystack = [t.client_name, t.trip_title, t.destination]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

function formatLocal(value?: string | null): string | null {
  const date = parseLocalDate(value);
  return date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
}

function countdownLabel(trip: UpcomingTrip): string {
  if (trip.inProgress) return "Em andamento";
  if (trip.daysRemaining === 0) return "Embarque hoje";
  if (trip.daysRemaining === 1) return "Embarque amanhã";
  return `Embarque em ${trip.daysRemaining} dias`;
}

export default function ProximasViagens() {
  const navigate = useNavigate();
  const { trips, isLoading, isError, error, refetch } = useUpcomingTrips();
  const { updateFollowUp, isUpdating } = useReminders();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");

  const rows = useMemo(
    () => filterUpcomingTrips(trips, { search, period, status }),
    [trips, search, period, status],
  );

  const handleSaveFollowUp = async () => {
    if (!editingReminder) return;
    await updateFollowUp({ id: editingReminder, follow_up_note: followUpText });
    await refetch();
    setEditingReminder(null);
    setFollowUpText("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <div className="w-fit">
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
              <Plane className="h-6 w-6 text-[hsl(var(--section-reminders))]" />
              Próximas Viagens
            </h1>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-reminders))]" />
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Todas as viagens futuras e em andamento dos seus clientes, com contagem regressiva, follow-up e acesso rápido à carteira digital.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, viagem ou destino"
              aria-label="Buscar próximas viagens"
              className="pl-9"
            />
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              <SelectItem value="7">Próximos 7 dias</SelectItem>
              <SelectItem value="30">Próximos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Futuras e em andamento</SelectItem>
              <SelectItem value="future">Somente futuras</SelectItem>
              <SelectItem value="in_progress">Somente em andamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : isError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="py-14 text-center space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-medium text-foreground">Não foi possível carregar suas viagens</p>
              <p className="text-sm text-muted-foreground">
                {error?.message || "Tente novamente em alguns instantes."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {trips.length === 0 ? "Nenhuma viagem futura por aqui" : "Nenhuma viagem encontrada"}
              </p>
              <p className="text-sm mt-1">
                {trips.length === 0
                  ? "Cadastre viagens na Carteira Digital para acompanhar embarques e retornos."
                  : "Ajuste a busca ou os filtros para ver outras viagens."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((trip) => {
              const startLabel = formatLocal(trip.start_date);
              const endLabel = formatLocal(trip.end_date);
              return (
                <Card
                  key={trip.id}
                  className={cn(
                    "border shadow-sm",
                    trip.inProgress
                      ? "border-accent/50 bg-accent/5"
                      : trip.daysRemaining <= 1
                        ? "border-destructive/50 bg-destructive/5"
                        : trip.daysRemaining <= 3
                          ? "border-primary/50 bg-primary/5"
                          : "border-border",
                  )}
                >
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate">{trip.client_name || "Cliente"}</span>
                        </div>
                        {trip.trip_title && (
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{trip.trip_title}</p>
                        )}
                      </div>
                      <Badge
                        variant={!trip.inProgress && trip.daysRemaining <= 1 ? "destructive" : "outline"}
                        className="shrink-0"
                      >
                        {countdownLabel(trip)}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{trip.destination || "Destino não informado"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          Início: {startLabel || "—"}
                          {endLabel ? ` • Fim: ${endLabel}` : ""}
                        </span>
                      </p>
                    </div>

                    {trip.followUpNote && (
                      <div className="rounded bg-muted/50 p-2 text-sm">
                        <span className="text-muted-foreground">Follow-up: </span>
                        {trip.followUpNote}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {trip.reminderId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReminder(trip.reminderId);
                            setFollowUpText(trip.followUpNote || "");
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" /> Follow-up
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ferramentas-ia/trip-wallet/${trip.id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir Viagem
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editingReminder} onOpenChange={() => setEditingReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Follow-up</DialogTitle>
          </DialogHeader>
          <Textarea
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            placeholder="Adicione notas de follow-up para esta viagem..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReminder(null)}>Cancelar</Button>
            <Button onClick={handleSaveFollowUp} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
