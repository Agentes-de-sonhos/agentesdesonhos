import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useAgenda } from "@/hooks/useAgenda";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function UpcomingAgendaEventsCard() {
  const navigate = useNavigate();
  const { getUpcomingEvents, isLoading } = useAgenda();

  const upcomingEvents = getUpcomingEvents(10);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="text-base font-semibold">Minha Agenda</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/agenda")}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Ver todos
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum evento próximo</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/agenda")}
            >
              Criar evento
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => {
              const eventDate = parseISO(event.event_date);
              const daysUntil = differenceInDays(eventDate, new Date());
              
              let daysLabel = "";
              if (daysUntil === 0) daysLabel = "Hoje";
              else if (daysUntil === 1) daysLabel = "Amanhã";
              else if (daysUntil < 7) daysLabel = `Em ${daysUntil} dias`;
              else daysLabel = format(eventDate, "dd/MM");

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate("/agenda")}
                >
                  <div
                    className="w-1 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(eventDate, "EEEE, d 'de' MMM", { locale: ptBR })}
                      {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                      daysUntil === 0 && "bg-primary/10 text-primary",
                      daysUntil === 1 && "bg-warning/10 text-warning",
                      daysUntil > 1 && "bg-muted text-muted-foreground"
                    )}
                  >
                    {daysLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
