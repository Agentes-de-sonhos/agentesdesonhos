import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EDITORIAL_ROOT_CLASS } from "@/lib/agencySiteTheme";

/** "YYYY-MM-DD" -> Date local (nunca UTC, para não deslocar um dia). */
export function parseYMD(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function toYMD(date?: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatPtBR(value?: string | null): string {
  const date = parseYMD(value);
  return date ? format(date, "dd 'de' MMM 'de' yyyy", { locale: ptBR }) : "";
}

export interface TripDatePickerProps {
  id: string;
  label: string;
  /** `range` = período único de ida e volta; `single` = somente ida. */
  mode: "range" | "single";
  start: string;
  end?: string;
  onChange: (next: { start: string; end: string }) => void;
  editorial?: boolean;
  error?: string;
  help?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
}

/**
 * Um único controle visual de datas da viagem, com Popover + Calendar.
 * Em `range`, o primeiro clique define a ida e o segundo a volta; em desktop
 * mostramos 2 meses e em mobile 1, sempre gravando em `data_ida`/`data_volta`
 * (formato "YYYY-MM-DD") para manter a compatibilidade do payload.
 */
export function TripDatePicker({
  id, label, mode, start, end, onChange, editorial, error, help, required,
  className, triggerClassName, placeholder,
}: TripDatePickerProps) {
  const [open, setOpen] = useState(false);
  const startDate = useMemo(() => parseYMD(start), [start]);
  const endDate = useMemo(() => parseYMD(end), [end]);

  const months = typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)")?.matches ? 2 : 1;
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  const summary =
    mode === "range"
      ? startDate
        ? endDate
          ? `${formatPtBR(start)} — ${formatPtBR(end)}`
          : `${formatPtBR(start)} — selecione a volta`
        : ""
      : startDate
      ? formatPtBR(start)
      : "";

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className={
          editorial
            ? "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            : "block text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        }
      >
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
      </label>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "mt-2 w-full justify-start rounded-lg bg-card px-3 text-left font-normal",
              editorial ? "h-12" : "h-11",
              !summary && "text-muted-foreground",
              error && "border-destructive",
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
            <span className="truncate">
              {summary || placeholder || (mode === "range" ? "Selecione ida e volta" : "Selecione a data")}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0",
            editorial && EDITORIAL_ROOT_CLASS,
          )}
        >
          {mode === "range" ? (
            <Calendar
              mode="range"
              numberOfMonths={months}
              defaultMonth={startDate}
              selected={{ from: startDate, to: endDate } as DateRange}
              onSelect={(range) => {
                const next = (range ?? {}) as DateRange;
                onChange({ start: toYMD(next.from), end: toYMD(next.to) });
                if (next.from && next.to) setOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          ) : (
            <Calendar
              mode="single"
              numberOfMonths={months}
              defaultMonth={startDate}
              selected={startDate}
              onSelect={(date) => {
                onChange({ start: toYMD(date ?? undefined), end: "" });
                if (date) setOpen(false);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          )}
        </PopoverContent>
      </Popover>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}