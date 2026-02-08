import { useMemo } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addHours,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/types/agenda";
import { EventTag } from "./EventTag";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeeklyCalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
}

export function WeeklyCalendar({
  currentDate,
  events,
  onDayClick,
  onEventClick,
  onNavigate,
  onToday,
}: WeeklyCalendarProps) {
  const today = new Date();

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const date = event.event_date;
      if (!map[date]) map[date] = [];
      map[date].push(event);
    });
    return map;
  }, [events]);

  // Generate week days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => onNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMMM", { locale: ptBR })}
        </h2>
        <div className="w-[120px]" /> {/* Spacer for alignment */}
      </div>

      {/* Week Grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="grid grid-cols-7">
          {weekDays.map((day, index) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateStr] || [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={index}
                className={cn(
                  "border-r last:border-r-0",
                  isToday && "bg-primary/5"
                )}
              >
                {/* Day Header */}
                <div
                  className={cn(
                    "py-3 px-2 text-center border-b bg-muted",
                    isToday && "bg-primary/10"
                  )}
                >
                  <div className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-bold mt-1 w-9 h-9 mx-auto flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>

                {/* Day Content */}
                <div
                  onClick={() => onDayClick(dateStr)}
                  className="min-h-[300px] p-2 cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <div className="space-y-1">
                    {dayEvents.map((event) => (
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
