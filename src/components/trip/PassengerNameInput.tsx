import { useState, useRef, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { usePassengerPool } from "./PassengerPoolContext";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PassengerNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectPassenger?: (name: string, type?: "adulto" | "crianca" | "bebe") => void;
  placeholder?: string;
  className?: string;
  excludeNames?: string[]; // names already added in this service to filter out
}

/**
 * Text input with autocomplete suggestions sourced from passengers
 * already used in OTHER services of the same Trip Wallet.
 * Falls back to a plain input when there are no suggestions.
 */
export const PassengerNameInput = forwardRef<HTMLInputElement, PassengerNameInputProps>(
  ({ value, onChange, onSelectPassenger, placeholder = "Nome completo", className, excludeNames = [] }, ref) => {
    const { passengers } = usePassengerPool();
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const excludeSet = new Set(excludeNames.map((n) => n.trim().toLowerCase()));

    const query = value.trim().toLowerCase();
    const suggestions = passengers
      .filter((p) => !excludeSet.has(p.name.toLowerCase()))
      .filter((p) => (query ? p.name.toLowerCase().includes(query) : true))
      .slice(0, 8);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      if (open) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const handleSelect = (name: string, type?: "adulto" | "crianca" | "bebe") => {
      onChange(name);
      onSelectPassenger?.(name, type);
      setOpen(false);
    };

    const showSuggestions = open && suggestions.length > 0;

    return (
      <div ref={wrapperRef} className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!showSuggestions) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const s = suggestions[highlighted];
              if (s) handleSelect(s.name, s.type);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {showSuggestions && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              Passageiros desta carteira
            </div>
            {suggestions.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s.name, s.type)}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2",
                  i === highlighted && "bg-accent"
                )}
              >
                <span className="truncate">{s.name}</span>
                {s.type && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
                    {s.type === "adulto" ? "Adulto" : s.type === "crianca" ? "Criança" : "Bebê"}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

PassengerNameInput.displayName = "PassengerNameInput";