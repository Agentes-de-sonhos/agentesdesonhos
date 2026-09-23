import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, Plane } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchAirports, type AirportSuggestion } from "@/lib/airports";

export interface AirportSelection {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export interface AirportSearchInputProps {
  /** Código IATA persistido (fonte da verdade do campo). */
  value: string;
  /** Digitação livre continua permitida: recebe o texto cru em maiúsculas. */
  onChange: (value: string) => void;
  /** Disparado apenas quando o usuário escolhe um aeroporto real da lista. */
  onSelect?: (airport: AirportSelection) => void;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Campo de aeroporto com busca por código IATA, cidade ou nome do aeroporto.
 * Reaproveita a base local (`public/data/airports.csv`) já usada pelos sites
 * white label — sem chamada externa, sem custo e funcionando offline.
 *
 * Persistência: o campo grava sempre o código IATA; `onSelect` entrega também
 * nome, cidade e país para que o formulário guarde os dados estruturados.
 */
export function AirportSearchInput({
  value, onChange, onSelect, placeholder, className, id, invalid, describedBy,
  "aria-label": ariaLabel,
}: AirportSearchInputProps) {
  const listId = `${useId()}-airports`;
  const [items, setItems] = useState<AirportSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticketRef = useRef(0);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const run = useCallback((term: string) => {
    const ticket = ++ticketRef.current;
    setLoading(true);
    searchAirports(term, 8)
      .then((found) => {
        if (ticket !== ticketRef.current) return;
        setItems(found);
        setActive(-1);
        setOpen(found.length > 0);
      })
      .catch(() => {
        // Falha na base local não apaga o que o usuário digitou.
        if (ticket === ticketRef.current) setItems([]);
      })
      .finally(() => {
        if (ticket === ticketRef.current) setLoading(false);
      });
  }, []);

  const handleChange = (raw: string) => {
    const next = raw.toUpperCase();
    onChange(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const term = raw.trim();
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => run(term), 300);
  };

  const choose = (airport: AirportSuggestion) => {
    onChange(airport.iata);
    onSelect?.({ iata: airport.iata, name: airport.name, city: airport.city, country: airport.country });
    setOpen(false);
    setItems([]);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((prev) => (prev + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative min-w-0">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          autoComplete="off"
          autoCapitalize="characters"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={placeholder || "GRU, São Paulo ou Guarulhos"}
          value={value || ""}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (items.length) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          className={cn("h-8 text-sm", className)}
        />
        {loading && (
          <Loader2
            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full min-w-[16rem] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {items.map((airport, index) => (
            <li key={airport.iata} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(airport)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex min-h-11 w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  index === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {airport.iata} · {airport.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[airport.city, airport.country].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
