import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Calendar,
  MapPin,
  User,
  Check,
  Edit2,
  ExternalLink,
  Loader2,
  Clock,
  Plane,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useReminders } from "@/hooks/useReminders";
import { SectionCtaLink } from "@/components/dashboard/SectionCtaLink";
import { useAdaptivePageSize } from "@/hooks/useAdaptivePageSize";
import { cn } from "@/lib/utils";

/** Approximate rendered height of one compact reminder card (card + gap). */
const ROW_HEIGHT = 168;

export function TripRemindersCard() {
  const navigate = useNavigate();
  const { reminders, isLoading, updateFollowUp, markCompleted, isUpdating } = useReminders();
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");
  const [page, setPage] = useState(0);
  const { ref: listRef, pageSize } = useAdaptivePageSize<HTMLDivElement>({
    rowHeight: ROW_HEIGHT,
    min: 1,
    max: 3,
    fallback: 2,
  });

  const total = reminders.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const startIdx = safePage * pageSize;
  const pageReminders = reminders.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    setPage((prev) => Math.max(0, Math.min(prev, totalPages - 1)));
  }, [totalPages]);

  const handleEditFollowUp = (reminderId: string, currentNote: string | null) => {
    setEditingReminder(reminderId);
    setFollowUpText(currentNote || "");
  };

  const handleSaveFollowUp = async () => {
    if (editingReminder) {
      await updateFollowUp({ id: editingReminder, follow_up_note: followUpText });
      setEditingReminder(null);
      setFollowUpText("");
    }
  };

  const handleMarkCompleted = async (reminderId: string) => {
    await markCompleted(reminderId);
  };

  const getReminderLabel = (daysRemaining: number, isReturn: boolean) => {
    if (isReturn) {
      if (daysRemaining === 0) {
        return <Badge className="bg-accent text-accent-foreground">🏠 Retorno hoje</Badge>;
      }
      if (daysRemaining === 1) {
        return <Badge className="bg-accent text-accent-foreground">🏠 Retorno amanhã</Badge>;
      }
      if (daysRemaining > 1) {
        return <Badge className="bg-accent text-accent-foreground">🏠 Retorno em {daysRemaining} dias</Badge>;
      }
      return <Badge className="bg-accent text-accent-foreground">🏠 Retornou há {Math.abs(daysRemaining)} dia{Math.abs(daysRemaining) !== 1 ? "s" : ""}</Badge>;
    }
    if (daysRemaining === 0) {
      return <Badge variant="destructive" className="animate-pulse">✈️ Viaja hoje!</Badge>;
    }
    if (daysRemaining === 1) {
      return <Badge variant="destructive">Falta 1 dia</Badge>;
    }
    if (daysRemaining <= 3) {
      return <Badge variant="destructive" className="opacity-90">Faltam {daysRemaining} dias</Badge>;
    }
    return <Badge variant="outline" className="border-primary text-primary">{daysRemaining} dias</Badge>;
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md h-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="border-0 shadow-md h-full">
        <CardContent className="pt-6 h-full">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Plane className="h-5 w-5 text-[hsl(var(--section-reminders))]" />
                Próximas Viagens
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-reminders))]" />
            </div>
            <SectionCtaLink
              to="/proximas-viagens"
              label="Ver todas"
              shortLabel="Ver todas"
              tabTitle="Próximas Viagens"
              className="text-[hsl(var(--section-reminders))]"
            />
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum lembrete pendente</p>
            <p className="text-sm mt-1">
              Cadastre viagens na Carteira Digital para receber lembretes automáticos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-md h-full flex flex-col min-h-0 overflow-hidden">
        <CardContent className="pt-4 @[26rem]:pt-6 flex-1 min-h-0 flex flex-col @container overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-3 flex-shrink-0">
            <div className="w-fit">
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Plane className="h-5 w-5 text-[hsl(var(--section-reminders))]" />
                Próximas Viagens
              </h2>
              <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-reminders))]" />
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <SectionCtaLink
                to="/proximas-viagens"
                label="Ver todas"
                shortLabel="Ver todas"
                tabTitle="Próximas Viagens"
                className="text-[hsl(var(--section-reminders))]"
              />
              <Badge variant="outline" className="whitespace-nowrap text-[hsl(var(--section-reminders))] border-[hsl(var(--section-reminders))]">
                {reminders.length} lembrete{reminders.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
          <div ref={listRef} className="space-y-3 flex-1 min-h-0 overflow-hidden">
            {pageReminders.map((reminder) => {
              const isReturn = reminder.days_before === -1;
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "border rounded-lg p-2.5 @[26rem]:p-3 space-y-2 transition-colors overflow-hidden",
                    isReturn
                      ? "border-accent/50 bg-accent/10"
                      : reminder.daysRemaining <= 1
                      ? "border-destructive/50 bg-destructive/5"
                      : reminder.daysRemaining <= 3
                      ? "border-primary/50 bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate whitespace-nowrap">{reminder.trip?.client_name}</span>
                        <span className="shrink-0">{getReminderLabel(reminder.daysRemaining, isReturn)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate whitespace-nowrap">{reminder.trip?.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate whitespace-nowrap">
                          {isReturn ? "Retorno: " : ""}
                          {reminder.trip?.start_date &&
                            (() => {
                              const d = (isReturn ? reminder.trip.end_date : reminder.trip.start_date);
                              const [y,m,day] = d.split('-').map(Number);
                              return format(new Date(y, m-1, day), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                            })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {reminder.follow_up_note && (
                    <div className="bg-muted/50 rounded p-2 text-xs truncate whitespace-nowrap">
                      <span className="text-muted-foreground">Follow-up: </span>
                      {reminder.follow_up_note}
                    </div>
                  )}

                  <div className="flex flex-nowrap items-center gap-1 @[26rem]:gap-2 overflow-hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => handleEditFollowUp(reminder.id, reminder.follow_up_note)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1 shrink-0" />
                      Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={() => navigate(`/ferramentas-ia/trip-wallet/${reminder.trip_id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1 shrink-0" />
                      <span className="hidden @[24rem]:inline">Abrir Viagem</span>
                      <span className="@[24rem]:hidden">Abrir</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => handleMarkCompleted(reminder.id)}
                      disabled={isUpdating}
                    >
                      <Check className="h-3.5 w-3.5 mr-1 shrink-0" />
                      Concluir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação adaptativa — nunca rolagem */}
          <div className="pt-2 mt-1 border-t flex flex-col @[26rem]:flex-row items-center justify-between gap-1 @[26rem]:gap-2 shrink-0">
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              Mostrando <span className="font-medium text-foreground">{startIdx + 1}–{Math.min(startIdx + pageSize, total)}</span> de{" "}
              <span className="font-medium text-foreground">{total}</span> viagens
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                aria-label="Página anterior"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-1 tabular-nums whitespace-nowrap">
                {safePage + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                aria-label="Próxima página"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingReminder} onOpenChange={() => setEditingReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Follow-up</DialogTitle>
          </DialogHeader>
          <Textarea
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            placeholder="Adicione notas de follow-up para este lembrete..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReminder(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFollowUp} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
