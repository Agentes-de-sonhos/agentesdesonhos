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

  const getDaysRemainingBadge = (days: number) => {
    if (days <= 2) {
      return <Badge variant="destructive">{days} dia{days !== 1 ? "s" : ""}</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive" className="opacity-80">{days} dias</Badge>;
    }
    if (days <= 15) {
      return <Badge variant="outline" className="border-primary text-primary">{days} dias</Badge>;
    }
    return <Badge variant="secondary">{days} dias</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Próximas Viagens e Lembretes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Próximas Viagens e Lembretes
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Próximas Viagens e Lembretes
            <Badge variant="outline" className="ml-2">
              {reminders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {reminders.slice(0, 10).map((reminder) => (
              <div
                key={reminder.id}
                className={cn(
                  "border rounded-lg p-4 space-y-3 transition-colors",
                  reminder.daysRemaining <= 2
                    ? "border-destructive/50 bg-destructive/5"
                    : reminder.daysRemaining <= 7
                    ? "border-primary/50 bg-primary/5"
                    : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{reminder.trip?.client_name}</span>
                      {getDaysRemainingBadge(reminder.daysRemaining)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{reminder.trip?.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {reminder.trip?.start_date &&
                          format(new Date(reminder.trip.start_date), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
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
            ))}
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
