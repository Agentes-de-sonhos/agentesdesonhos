import { useMemo, useRef } from "react";
import { format, getDaysInMonth, getDay, isWeekend, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/types/agenda";
import { EventTag } from "./EventTag";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface AnnualCalendarProps {
  year: number;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onYearChange: (year: number) => void;
}

const dayLetters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function AnnualCalendar({
  year,
  events,
  onDayClick,
  onEventClick,
  onYearChange,
}: AnnualCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      const date = event.event_date;
      if (!map[date]) map[date] = [];
      map[date].push(event);
    });
    return map;
  }, [events]);

  // Generate days for each month
  const monthsData = useMemo(() => {
    return months.map((monthName, monthIndex) => {
      const daysInMonth = getDaysInMonth(new Date(year, monthIndex, 1));
      const days = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = getDay(date);
        
        days.push({
          day,
          dateStr,
          dayOfWeek,
          dayLetter: dayLetters[dayOfWeek],
          isWeekend: isWeekend(date),
          isToday: isSameDay(date, today),
          events: eventsByDate[dateStr] || [],
        });
      }
      
      return {
        name: monthName,
        index: monthIndex,
        days,
      };
    });
  }, [year, eventsByDate]);

  const scrollToMonth = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onYearChange(year - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold text-foreground">{year}</h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onYearChange(year + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Scroll Navigation Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToMonth('left')}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Anterior
        </Button>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToMonth('right')}
          className="shrink-0"
        >
          Próximo
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="relative border rounded-xl overflow-hidden bg-card">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ scrollBehavior: 'smooth' }}
        >
          {monthsData.map((month) => (
            <div
              key={month.index}
              className="flex-shrink-0 w-[180px] sm:w-[200px] border-r last:border-r-0"
            >
              {/* Month Header */}
              <div className="sticky top-0 z-10 bg-primary text-primary-foreground py-2 px-3 text-center font-semibold text-sm">
                {month.name}
              </div>

              {/* Days */}
              <div className="divide-y divide-border/50">
                {month.days.map((day) => (
                  <div
                    key={day.dateStr}
                    onClick={() => onDayClick(day.dateStr)}
                    className={cn(
                      "min-h-[48px] px-2 py-1 cursor-pointer transition-colors hover:bg-accent/50",
                      day.isWeekend && "bg-muted/30",
                      day.isToday && "bg-primary/10 ring-2 ring-inset ring-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className={cn(
                          "text-xs font-medium w-5 text-center rounded",
                          day.isToday && "bg-primary text-primary-foreground",
                          day.isWeekend && !day.isToday && "text-muted-foreground"
                        )}
                      >
                        {day.day}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] text-muted-foreground",
                          day.isWeekend && "text-muted-foreground/70"
                        )}
                      >
                        {day.dayLetter}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="space-y-0.5">
                      {day.events.slice(0, 2).map((event) => (
                        <EventTag
                          key={event.id}
                          event={event}
                          compact
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                      {day.events.length > 2 && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{day.events.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
