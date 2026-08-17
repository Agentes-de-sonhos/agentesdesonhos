import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchLocations, type LocationKind, type LocationSuggestion } from "@/lib/locationSearch";

export interface LocationSearchInputProps {
  id: string;
  label: string;
  kind: LocationKind;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  help?: string;
  required?: boolean;
  editorial?: boolean;
  className?: string;
}

/**
 * Campo de busca estruturada de locais (cidade, aeroporto ou porto) usado por
 * TODOS os formulários iniciais dos sites white label. Digitação livre continua
 * permitida; as sugestões reais aparecem logo abaixo do campo e podem ser
 * escolhidas por clique ou teclado.
 */
export function LocationSearchInput({
  id, label, kind, value, onChange, placeholder, error, help, required, editorial, className,
}: LocationSearchInputProps) {
  const listId = `${useId()}-list`;
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);
  const skipRef = useRef(false);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const run = useCallback(
    (term: string) => {
      const ticket = ++requestRef.current;
      setLoading(true);
      searchLocations(kind, term, 8)
        .then((found) => {
          if (ticket !== requestRef.current) return;
          setItems(found);
          setActive(-1);
          setOpen(found.length > 0);
        })
        .catch(() => {
          if (ticket === requestRef.current) setItems([]);
        })
        .finally(() => {
          if (ticket === requestRef.current) setLoading(false);
        });
    },
    [kind],
  );

  const handleChange = (next: string) => {
    onChange(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (next.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => run(next), 300);
  };

  const choose = (item: LocationSuggestion) => {
    skipRef.current = true;
    onChange(item.value);
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

  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;

  return (
    <div className={cn("relative min-w-0", className)}>
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

      <div className="relative">
        <Input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn("mt-2 bg-card", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl", error && "border-destructive")}
          placeholder={placeholder}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (items.length) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {loading && (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </div>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {items.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  index === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                )}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{item.primary}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.secondary}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1 text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}