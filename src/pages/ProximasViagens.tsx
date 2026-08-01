import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plane, MapPin, User, Calendar, Check, Edit2, ExternalLink, Loader2, Search, Clock,
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
import { useReminders } from "@/hooks/useReminders";
import { cn } from "@/lib/utils";

export type PeriodFilter = "all" | "7" | "30";
export type KindFilter = "all" | "departure" | "return";

interface TripRow {
  id: string;
  trip_id: string;
  daysRemaining: number;
  days_before: number;
  follow_up_note: string | null;
  trip?: {
    client_name?: string | null;
    destination?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
}

/** Shared search + filter + ordering rules (kept pure for tests). */
export function filterUpcomingTrips(
  rows: TripRow[],
  { search, period, kind }: { search: string; period: PeriodFilter; kind: KindFilter },
): TripRow[] {
  const term = search.trim().toLowerCase();
  return rows
    .filter((r) => {
      const isReturn = r.days_before === -1;
      if (kind === "departure" && isReturn) return false;
      if (kind === "return" && !isReturn) return false;
      if (period !== "all" && r.daysRemaining > Number(period)) return false;
      if (!term) return true;
      const haystack = [r.trip?.client_name, r.trip?.destination].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatLocal(value?: string | null): string | null {
  const date = parseLocalDate(value);
  return date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : null;
}

export default function ProximasViagens() {
  const navigate = useNavigate();
  const { reminders, isLoading, updateFollowUp, markCompleted, isUpdating } = useReminders();
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");

  const rows = useMemo(
    () => filterUpcomingTrips(reminders as unknown as TripRow[], { search, period, kind }),
    [reminders, search, period, kind],
  );

  const handleSaveFollowUp = async () => {
    if (!editingReminder) return;
    await updateFollowUp({ id: editingReminder, follow_up_note: followUpText });
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
            Acompanhe todas as viagens futuras dos seus clientes, com contagem regressiva, follow-up e acesso rápido à carteira digital.
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
          <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
            <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Embarques e retornos</SelectItem>
              <SelectItem value="departure">Somente embarques</SelectItem>
              <SelectItem value="return">Somente retornos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Card className="border-0 shadow-md">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : rows.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {reminders.length === 0 ? "Nenhuma viagem futura por aqui" : "Nenhuma viagem encontrada"}
              </p>
              <p className="text-sm mt-1">
                {reminders.length === 0
                  ? "Cadastre viagens na Carteira Digital para acompanhar embarques e retornos."
                  : "Ajuste a busca ou os filtros para ver outras viagens."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((reminder) => {
              const isReturn = reminder.days_before === -1;
              const dateLabel = formatLocal(isReturn ? reminder.trip?.end_date : reminder.trip?.start_date);
              const endLabel = formatLocal(reminder.trip?.end_date);
              return (
                <Card
                  key={reminder.id}
                  className={cn(
                    "border shadow-sm",
                    isReturn
                      ? "border-accent/50 bg-accent/5"
                      : reminder.daysRemaining <= 1
                        ? "border-destructive/50 bg-destructive/5"
                        : reminder.daysRemaining <= 3
                          ? "border-primary/50 bg-primary/5"
                          : "border-border",
                  )}
                >
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{reminder.trip?.client_name || "Cliente"}</span>
                      </div>
                      <Badge
                        variant={!isReturn && reminder.daysRemaining <= 1 ? "destructive" : "outline"}
                        className="shrink-0"
                      >
                        {isReturn ? "Retorno" : "Embarque"}
                        {reminder.daysRemaining === 0
                          ? " hoje"
                          : reminder.daysRemaining === 1
                            ? " amanhã"
                            : ` em ${reminder.daysRemaining} dias`}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="truncate">{reminder.trip?.destination || "Destino não informado"}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {isReturn ? "Retorno: " : "Início: "}
                          {dateLabel || "—"}
                          {!isReturn && endLabel ? ` • Fim: ${endLabel}` : ""}
                        </span>
                      </p>
                    </div>

                    {reminder.follow_up_note && (
                      <div className="rounded bg-muted/50 p-2 text-sm">
                        <span className="text-muted-foreground">Follow-up: </span>
                        {reminder.follow_up_note}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingReminder(reminder.id);
                          setFollowUpText(reminder.follow_up_note || "");
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Follow-up
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ferramentas-ia/trip-wallet/${reminder.trip_id}`)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir Viagem
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                        disabled={isUpdating}
                        onClick={() => markCompleted(reminder.id)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Concluir
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
