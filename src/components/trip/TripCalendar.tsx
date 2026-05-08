import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TripCalendarProps {
  startDate: Date;
  endDate: Date;
  /** Set of "yyyy-MM-dd" strings that have an itinerary day */
  itineraryDates?: Set<string>;
  /** Called when user clicks a date that has an itinerary entry */
  onDayClick?: (dateStr: string) => void;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function TripCalendar({
  startDate,
  endDate,
  itineraryDates,
  onDayClick,
}: TripCalendarProps) {
  const [cursor, setCursor] = useState<Date>(startOfMonth(startDate));

  const days = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const today = new Date();

  return (
    <div className="rounded-2xl border border-primary/15 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="text-xs uppercase tracking-[0.2em] text-primary/70 font-semibold">
            Calendário da viagem
          </span>
          <span className="text-sm font-bold text-foreground capitalize">
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary/10"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 px-2 pt-2">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="text-[10px] font-semibold text-muted-foreground text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 px-2 pb-3">
        {days.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, cursor);
          const inTrip = isWithinInterval(day, { start: startDate, end: endDate });
          const isStart = isSameDay(day, startDate);
          const isEnd = isSameDay(day, endDate);
          const isToday = isSameDay(day, today);
          const hasItinerary = itineraryDates?.has(dateStr);
          const clickable = inTrip && hasItinerary;

          return (
            <button
              type="button"
              key={i}
              disabled={!clickable}
              onClick={() => clickable && onDayClick?.(dateStr)}
              className={cn(
                "relative aspect-square flex items-center justify-center text-xs rounded-lg transition-all duration-150",
                !inMonth && "text-muted-foreground/40",
                inMonth && !inTrip && "text-foreground/70",
                inTrip && !isStart && !isEnd && "bg-primary/15 text-primary font-semibold",
                (isStart || isEnd) && "bg-primary text-primary-foreground font-bold shadow-sm",
                isToday && !inTrip && "ring-1 ring-primary/40",
                clickable && "cursor-pointer hover:scale-105 hover:shadow-md",
                !clickable && "cursor-default"
              )}
              title={
                clickable
                  ? `Ver roteiro de ${format(day, "dd/MM")}`
                  : inTrip
                  ? format(day, "dd/MM")
                  : undefined
              }
            >
              {format(day, "d")}
              {hasItinerary && inTrip && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full",
                    isStart || isEnd ? "bg-white" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 px-4 py-2 text-[10px] text-muted-foreground border-t border-border/40 bg-muted/30">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Início/Fim
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/15" /> Período
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Roteiro
        </span>
      </div>
    </div>
  );
}