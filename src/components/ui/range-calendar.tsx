import * as React from "react";
import { addMonths, startOfMonth } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Quantidade de meses exibida pelos calendários de intervalo.
 * Reativo a resize/orientação: nunca um cálculo único de matchMedia.
 */
export function useResponsiveCalendarMonths(): 1 | 2 {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      mql.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isDesktop ? 2 : 1;
}

/** Limiar mínimo e predominância horizontal para não brigar com a rolagem. */
const SWIPE_THRESHOLD_PX = 48;
const HORIZONTAL_DOMINANCE = 1.4;

export interface RangeCalendarProps extends Omit<CalendarProps, "mode" | "numberOfMonths" | "selected" | "onSelect"> {
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
  /** Dica contextual compacta de ida/volta. Desligada quando o consumidor já tem a sua. */
  hint?: boolean;
  /** Rótulos da dica contextual, quando o fluxo usa outra nomenclatura. */
  hintLabels?: { start: string; end: string };
  className?: string;
  wrapperClassName?: string;
}

/**
 * Calendário de intervalo compartilhado: um mês no celular, dois no desktop,
 * setas sempre visíveis com rótulos acessíveis e swipe horizontal
 * (esquerda avança, direita retorna) sem afetar rolagem ou toque nos dias.
 */
export function RangeCalendar({
  selected,
  onSelect,
  hint,
  hintLabels,
  className,
  wrapperClassName,
  defaultMonth,
  ...props
}: RangeCalendarProps) {
  const numberOfMonths = useResponsiveCalendarMonths();
  const [month, setMonth] = React.useState<Date>(() =>
    startOfMonth(selected?.from ?? defaultMonth ?? new Date()),
  );
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);

  // Segue a ida escolhida (inclusive quando o valor vem de fora), sem travar a
  // navegação manual por setas/swipe depois disso.
  const fromTime = selected?.from ? startOfMonth(selected.from).getTime() : null;
  const lastFromTime = React.useRef(fromTime);
  React.useEffect(() => {
    if (fromTime !== null && fromTime !== lastFromTime.current) {
      setMonth(new Date(fromTime));
    }
    lastFromTime.current = fromTime;
  }, [fromTime]);

  const goToMonth = (delta: number) => setMonth((current) => addMonths(current, delta));

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (numberOfMonths !== 1 || event.touches.length !== 1) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return;
    goToMonth(dx < 0 ? 1 : -1);
  };

  const hintText = hint
    ? selected?.from && !selected?.to
      ? `Agora selecione a ${hintLabels?.end ?? "data de volta"}`
      : `Selecione a ${hintLabels?.start ?? "data de ida"}`
    : null;

  return (
    <div
      data-range-calendar
      data-months={numberOfMonths}
      className={cn("max-w-[calc(100vw-2rem)] touch-pan-y", wrapperClassName)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Calendar
        {...props}
        mode="range"
        numberOfMonths={numberOfMonths}
        month={month}
        onMonthChange={setMonth}
        selected={selected}
        onSelect={onSelect}
        labels={{
          labelPrevious: () => "Mês anterior",
          labelNext: () => "Próximo mês",
          ...props.labels,
        }}
        classNames={{
          nav_button: "h-11 w-11 rounded-md border border-input bg-background p-0 opacity-100 hover:bg-accent md:h-9 md:w-9",
          ...props.classNames,
        }}
        className={cn("p-3 pointer-events-auto", className)}
      />
      {hintText ? (
        <p className="border-t px-3 py-2 text-xs text-muted-foreground" data-range-calendar-hint>
          {hintText}
        </p>
      ) : null}
    </div>
  );
}

export default RangeCalendar;
