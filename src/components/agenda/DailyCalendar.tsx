import { useMemo } from "react";
import { format, isSameDay, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/types/agenda";
import { EventTag } from "./EventTag";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyCalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onNavigate: (direction: "prev" | "next") => void;
  onToday: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DailyCalendar({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onNavigate,
  onToday,
}: DailyCalendarProps) {
  const today = new Date();
  const isToday = isSameDay(currentDate, today);
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const dayEvents = useMemo(
    () => events.filter((e) => e.event_date === dateStr),
    [events, dateStr]
  );

  // Events with time, grouped by hour
  const eventsByHour = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    dayEvents.forEach((event) => {
      if (event.event_time) {
        const hour = parseInt(event.event_time.split(":")[0], 10);
        if (!map[hour]) map[hour] = [];
        map[hour].push(event);
      }
    });
    return map;
  }, [dayEvents]);

  // Events without time (all-day)
  const allDayEvents = useMemo(
    () => dayEvents.filter((e) => !e.event_time),
    [dayEvents]
  );

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onNavigate("next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground capitalize">
          {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
        </h2>
        <div className="w-[120px]" />
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="border-b bg-muted/30 p-3">
            <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Dia inteiro
            </div>
            <div className="flex flex-wrap gap-2">
              {allDayEvents.map((event) => (
                <EventTag
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hourly grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((hour) => {
            const hourEvents = eventsByHour[hour] || [];
            const now = new Date();
            const isCurrentHour =
              isToday && now.getHours() === hour;

            return (
              <div
                key={hour}
                onClick={() => onDayClick(dateStr)}
                className={cn(
                  "flex border-b last:border-b-0 cursor-pointer hover:bg-accent/20 transition-colors min-h-[56px]",
                  isCurrentHour && "bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "w-16 sm:w-20 flex-shrink-0 py-2 px-2 text-right text-sm border-r",
                    isCurrentHour
                      ? "text-primary font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
                <div className="flex-1 p-2">
                  <div className="space-y-1">
                    {hourEvents.map((event) => (
                      <EventTag
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
