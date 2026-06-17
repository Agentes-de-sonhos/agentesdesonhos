import { useEffect, useMemo, useState } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DayWeather } from "@/hooks/useTripWeather";

interface TripCalendarProps {
  startDate: Date;
  endDate: Date;
  /** Set of "yyyy-MM-dd" strings that have an itinerary day */
  itineraryDates?: Set<string>;
  /** Called when user clicks a date that has an itinerary entry */
  onDayClick?: (dateStr: string) => void;
  /** Map of "yyyy-MM-dd" -> weather data from Open-Meteo */
  weatherByDate?: Record<string, DayWeather>;
  /** IANA timezone of destination (e.g. "Europe/Paris") */
  timezone?: string;
  /** Human-readable destination label, used as clock subtitle */
  destinationLabel?: string;
  compact?: boolean;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function LocalClock({
  timezone,
  destinationLabel,
  weatherByDate,
  standalone = false,
  compact = false,
}: {
  timezone: string;
  destinationLabel?: string;
  weatherByDate?: Record<string, DayWeather>;
  /** When true, renders with its own rounded card; otherwise as a header strip. */
  standalone?: boolean;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  let timeStr = "";
  let dateStr = "";
  let tzShort = "";
  let todayKey = "";
  try {
    timeStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    dateStr = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(now);
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: timezone,
      timeZoneName: "short",
    }).formatToParts(now);
    tzShort = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    const dParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const y = dParts.find((p) => p.type === "year")?.value;
    const m = dParts.find((p) => p.type === "month")?.value;
    const d = dParts.find((p) => p.type === "day")?.value;
    if (y && m && d) todayKey = `${y}-${m}-${d}`;
  } catch {
    return null;
  }
  const cityLabel = destinationLabel?.split(",")[0]?.trim();
  const wxToday = weatherByDate?.[todayKey];
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 bg-gradient-to-r from-primary/10 to-primary/5",
        compact ? "px-3 py-2" : "px-4 py-2.5",
        standalone
          ? cn("border border-primary/15 shadow-sm", compact ? "rounded-xl" : "rounded-2xl")
          : "border-b border-primary/10"
      )}
    >
      {/* Top row: clock + temperature */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <div className="text-base font-bold tabular-nums text-foreground tracking-tight leading-none">
            {timeStr}
          </div>
          <div className="text-[9px] uppercase tracking-[0.18em] text-primary/70 font-semibold leading-none truncate">
            Hora local{cityLabel ? ` · ${cityLabel}` : ""}
          </div>
        </div>
        <div className="text-sm font-bold tabular-nums text-foreground leading-none shrink-0">
          {dateStr}
        </div>
        {wxToday && (() => {
          const WxIcon = weatherIconFor(wxToday.code);
          return (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/70 border border-primary/10 shrink-0">
              <WxIcon className="h-3.5 w-3.5 text-primary/80" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tabular-nums text-foreground leading-none">
                {wxToday.tmin}° / {wxToday.tmax}°C
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function weatherIconFor(code: number) {
  // Open-Meteo WMO weather codes
  if (code === 0) return Sun;
  if (code === 1 || code === 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code === 45 || code === 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function TripCalendar({
  startDate,
  endDate,
  itineraryDates,
  onDayClick,
  weatherByDate,
  timezone,
  destinationLabel,
  compact = false,
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
    <div className={cn(
      "border border-primary/15 bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden",
      compact ? "rounded-xl" : "rounded-2xl"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10",
        compact ? "px-3 py-2" : "px-4 py-3"
      )}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("rounded-full hover:bg-primary/10", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={() => setCursor((c) => subMonths(c, 1))}
          aria-label="Mês anterior"
        >
          <ChevronLeft className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </Button>
        <div className="flex flex-col items-center">
          <span className={cn("uppercase tracking-[0.2em] text-primary/70 font-semibold", compact ? "text-[10px]" : "text-xs")}>
            Calendário da viagem
          </span>
          <span className={cn("font-bold text-foreground capitalize", compact ? "text-[13px]" : "text-sm")}>
            {format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("rounded-full hover:bg-primary/10", compact ? "h-7 w-7" : "h-8 w-8")}
          onClick={() => setCursor((c) => addMonths(c, 1))}
          aria-label="Próximo mês"
        >
          <ChevronRight className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
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
          const wx = inTrip ? weatherByDate?.[dateStr] : undefined;
          const WxIcon = wx ? weatherIconFor(wx.code) : null;

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
                wx
                  ? `${format(day, "dd/MM")} • ${wx.tmin}°/${wx.tmax}°C${
                      clickable ? " — clique para ver o roteiro" : ""
                    }`
                  : clickable
                  ? `Ver roteiro de ${format(day, "dd/MM")}`
                  : inTrip
                  ? format(day, "dd/MM")
                  : undefined
              }
            >
              <span className={cn(WxIcon && "leading-none")}>{format(day, "d")}</span>
              {WxIcon && (
                <WxIcon
                  className={cn(
                    "absolute top-0.5 right-0.5 h-2.5 w-2.5",
                    isStart || isEnd ? "text-white/90" : "text-primary/70"
                  )}
                  strokeWidth={2.5}
                />
              )}
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
        {weatherByDate && Object.keys(weatherByDate).length > 0 && (
          <span className="flex items-center gap-1.5">
            <Sun className="h-2.5 w-2.5 text-primary/70" /> Clima
          </span>
        )}
      </div>
    </div>
  );
}