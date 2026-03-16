import { useState } from "react";
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
import { cn } from "@/lib/utils";

export function TripRemindersCard() {
  const navigate = useNavigate();
  const { reminders, isLoading, updateFollowUp, markCompleted, isUpdating } = useReminders();
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [followUpText, setFollowUpText] = useState("");

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

  const getReminderLabel = (daysBefore: number) => {
    switch (daysBefore) {
      case 7:
        return <Badge variant="outline" className="border-primary text-primary">Faltam 7 dias</Badge>;
      case 3:
        return <Badge variant="destructive" className="opacity-90">Faltam 3 dias</Badge>;
      case 1:
        return <Badge variant="destructive">Falta 1 dia</Badge>;
      case 0:
        return <Badge variant="destructive" className="animate-pulse">✈️ Viaja hoje!</Badge>;
      case -1:
        return <Badge className="bg-accent text-accent-foreground">🏠 Retorno hoje</Badge>;
      default:
        return <Badge variant="secondary">{daysBefore} dias</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="mb-4">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Plane className="h-5 w-5 text-[hsl(var(--section-reminders))]" />
              Próximas Viagens
            </h2>
            <div className="mt-2 h-1 w-16 rounded-full bg-[hsl(var(--section-reminders))]" />
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
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                <Plane className="h-5 w-5 text-[hsl(var(--section-reminders))]" />
                Próximas Viagens
              </h2>
              <div className="mt-2 h-1 w-16 rounded-full bg-[hsl(var(--section-reminders))]" />
            </div>
            <Badge variant="outline" className="text-[hsl(var(--section-reminders))] border-[hsl(var(--section-reminders))]">
              {reminders.length} lembrete{reminders.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {reminders.slice(0, 10).map((reminder) => {
              const isReturn = reminder.days_before === -1;
              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "border rounded-lg p-4 space-y-3 transition-colors",
                    isReturn
                      ? "border-accent/50 bg-accent/10"
                      : reminder.daysRemaining <= 1
                      ? "border-destructive/50 bg-destructive/5"
                      : reminder.daysRemaining <= 3
                      ? "border-primary/50 bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{reminder.trip?.client_name}</span>
                        {getDaysRemainingBadge(reminder.daysRemaining, isReturn)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{reminder.trip?.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
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
                    <div className="bg-muted/50 rounded p-2 text-sm">
                      <span className="text-muted-foreground">Follow-up: </span>
                      {reminder.follow_up_note}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditFollowUp(reminder.id, reminder.follow_up_note)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/ferramentas-ia/trip-wallet/${reminder.trip_id}`)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Abrir Viagem
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      onClick={() => handleMarkCompleted(reminder.id)}
                      disabled={isUpdating}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Concluir
                    </Button>
                  </div>
                </div>
              );
            })}
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
