import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, CalendarIcon, Search, Lightbulb, X } from "lucide-react";
import { useAirports } from "@/hooks/useAirports";
import { getAirportsMap } from "@/lib/airports";

interface BlockSearchFormProps {
  searchTerm: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onSearchTermChange: (v: string) => void;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onSearch: () => void;
}

export function BlockSearchForm({
  searchTerm, dateFrom, dateTo,
  onSearchTermChange, onDateFromChange, onDateToChange, onSearch,
}: BlockSearchFormProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ code: string; city: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { loaded } = useAirports();

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2 || !loaded) {
      setSuggestions([]);
      return;
    }
    const lower = searchTerm.toLowerCase();
    getAirportsMap().then((map) => {
      const results: { code: string; city: string; name: string }[] = [];
      map.forEach((info, code) => {
        if (
          code.toLowerCase().includes(lower) ||
          info.city.toLowerCase().includes(lower) ||
          info.name.toLowerCase().includes(lower)
        ) {
          results.push({ code, city: info.city, name: info.name });
        }
        if (results.length >= 8) return;
      });
      setSuggestions(results.slice(0, 8));
      setShowSuggestions(results.length > 0);
    });
  }, [searchTerm, loaded]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (code: string) => {
    onSearchTermChange(code);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowSuggestions(false);
      onSearch();
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Smart Search */}
          <div className="relative lg:col-span-2">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--section-flights))]" />
            <Input
              ref={inputRef}
              placeholder="Buscar por cidade, aeroporto ou código (ex: São Paulo, GRU)"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => onSearchTermChange("")}
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
                    onClick={() => handleSelectSuggestion(s.code)}
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

        {/* Search button */}
        <Button onClick={onSearch} className="w-full sm:w-auto bg-[hsl(var(--section-flights))] hover:bg-[hsl(var(--section-flights))]/90">
          <Search className="h-4 w-4 mr-2" />
          Buscar bloqueios
        </Button>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Dica: busque por cidade (ex: "Porto Alegre"), sigla (ex: "POA") ou nome do aeroporto. A busca verifica origem e destino, ida e volta 😉
        </p>
      </CardContent>
    </Card>
  );
}
