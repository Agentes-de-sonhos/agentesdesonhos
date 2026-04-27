import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, CalendarIcon, Search, Lightbulb, X, PlaneTakeoff, PlaneLanding, Plane } from "lucide-react";
import { useAirports } from "@/hooks/useAirports";
import { getAirportsMap } from "@/lib/airports";

interface BlockSearchFormProps {
  originTerm: string;
  destinationTerm: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onSearch: () => void;
  showEmptyHint?: boolean;
}

type Suggestion = { code: string; city: string; name: string };

function AirportInput({
  value,
  onChange,
  placeholder,
  icon: Icon,
  iconColor,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: typeof MapPin;
  iconColor?: string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [displayValue, setDisplayValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { loaded } = useAirports();
  const isSelectingRef = useRef(false);

  // Sync display value from parent code (e.g. initial value)
  useEffect(() => {
    if (isSelectingRef.current) return;
    if (value && loaded) {
      getAirportsMap().then((map) => {
        const info = map.get(value.toUpperCase());
        setDisplayValue(info ? `${value.toUpperCase()} — ${info.city}` : value);
      });
    } else if (!value) {
      setDisplayValue("");
    }
  }, [value, loaded]);

  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }
    const raw = displayValue;
    if (!raw || raw.length < 2 || !loaded) {
      setSuggestions([]);
      return;
    }

    const searchTerm = raw.includes("—") ? raw.split("—")[0].trim() : raw.trim();
    if (searchTerm.length < 2) { setSuggestions([]); return; }

    const upper = searchTerm.toUpperCase();
    const lower = searchTerm.toLowerCase();
    const isLikelyIATA = /^[A-Za-z]{3}$/.test(searchTerm);

    getAirportsMap().then((map) => {
      if (isLikelyIATA) {
        if (map.has(upper)) {
          const info = map.get(upper)!;
          setSuggestions([{ code: upper, city: info.city, name: info.name }]);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
        return;
      }

      const exact: Suggestion[] = [];
      const partial: Suggestion[] = [];
      map.forEach((info, code) => {
        if (exact.length + partial.length >= 8) return;
        const cityL = info.city.toLowerCase();
        const nameL = info.name.toLowerCase();
        if (cityL === lower || nameL === lower) {
          exact.push({ code, city: info.city, name: info.name });
        } else if (cityL.includes(lower) || nameL.includes(lower) || code.toLowerCase().includes(lower)) {
          partial.push({ code, city: info.city, name: info.name });
        }
      });
      const results = [...exact, ...partial].slice(0, 8);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    });
  }, [displayValue, loaded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: Suggestion) => {
    isSelectingRef.current = true;
    onChange(s.code);
    setDisplayValue(`${s.code} — ${s.city}`);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <Icon className={cn("absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2", iconColor || "text-[hsl(var(--section-flights))]")} />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setDisplayValue(e.target.value);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => {
          if (displayValue.includes("—")) {
            setTimeout(() => inputRef.current?.select(), 0);
          }
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        className="pl-10 pr-8"
      />
      {displayValue && (
        <button
          onClick={() => { onChange(""); setDisplayValue(""); setSuggestions([]); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-lg shadow-lg max-h-[240px] overflow-y-auto"
        >
          {suggestions.map((s) => (
            <button
              key={s.code}
              onClick={() => handleSelect(s)}
              className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 text-sm"
            >
              <span className="font-mono font-semibold text-[hsl(var(--section-flights))]">{s.code}</span>
              <span className="text-muted-foreground">–</span>
              <span>{s.city}</span>
              <span className="text-xs text-muted-foreground truncate ml-auto">{s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BlockSearchForm({
  originTerm, destinationTerm, dateFrom, dateTo,
  onOriginChange, onDestinationChange, onDateFromChange, onDateToChange, onSearch, showEmptyHint,
}: BlockSearchFormProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="pt-6">
        <div className={cn("grid gap-6", showEmptyHint ? "lg:grid-cols-5" : "grid-cols-1")}>
          {/* Left column: form */}
          <div className={cn("space-y-4", showEmptyHint && "lg:col-span-3")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Origin */}
              <AirportInput
                value={originTerm}
                onChange={onOriginChange}
                placeholder="Origem (ex: São Paulo, GRU)"
                icon={PlaneTakeoff}
              />

              {/* Destination */}
              <AirportInput
                value={destinationTerm}
                onChange={onDestinationChange}
                placeholder="Destino (ex: Salvador, SSA)"
                icon={PlaneLanding}
              />

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} locale={ptBR} defaultMonth={dateFrom} disabled={(d) => dateFrom ? d < dateFrom : false} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={onSearch} className="w-full sm:w-auto bg-[hsl(var(--section-flights))] hover:bg-[hsl(var(--section-flights))]/90">
              <Search className="h-4 w-4 mr-2" />
              Buscar bloqueios
            </Button>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              Dica: busque por cidade (ex: "Porto Alegre"), sigla (ex: "POA") ou nome do aeroporto. Origem e destino podem ser preenchidos separadamente 😉
            </p>
          </div>

          {/* Right column: highlighted empty hint */}
          {showEmptyHint && (
            <div className="lg:col-span-2 flex items-center justify-center rounded-xl border border-dashed bg-gradient-to-br from-[hsl(var(--section-flights))]/5 to-transparent p-6 text-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3 max-w-sm">
                <div className="p-4 rounded-full bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
                  <Plane className="h-10 w-10" />
                </div>
                <p className="text-lg font-semibold text-foreground leading-snug">
                  Faça uma busca para visualizar os bloqueios
                </p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Informe origem, destino ou datas.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
