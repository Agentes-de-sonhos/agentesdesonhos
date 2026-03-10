import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useAgenda } from "@/hooks/useAgenda";
import { format, differenceInCalendarDays, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function UpcomingAgendaEventsCard() {
  const navigate = useNavigate();
  const { getUpcomingEvents, highlightedEventIds, isLoading } = useAgenda();

  // Use local date components to avoid UTC shift
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Filter: user-created events (current month) + ALL highlighted events (any date)
  const upcomingEvents = getUpcomingEvents(50)
    .filter((event) => {
      const isHighlighted = highlightedEventIds.has(event.id);
      // Highlighted events always show, regardless of month
      if (isHighlighted) return true;
      // User-created events: only current month
      const [y, m, d] = event.event_date.split('-').map(Number);
      const evDate = new Date(y, m - 1, d);
      const isCurrentMonth = isSameMonth(evDate, todayLocal);
      const isUserEvent = !event.isPreset;
      return isCurrentMonth && isUserEvent;
    })
    .slice(0, 6);

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
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-base font-semibold">Minha Agenda</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum evento programado para este mês</p>
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
               // Parse date using local components to avoid UTC timezone shift
               const [y, m, d] = event.event_date.split('-').map(Number);
               const eventDate = new Date(y, m - 1, d);
               const daysUntil = differenceInCalendarDays(eventDate, todayLocal);
               
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

            <div className="pt-3 border-t">
              <Button
                variant="ghost"
                className="w-full text-[hsl(var(--section-events))] hover:text-[hsl(var(--section-events))] hover:bg-[hsl(var(--section-events))]/5"
                onClick={() => navigate("/agenda")}
              >
                Ver todos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}