import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane, Search, ArrowRight, Loader2, Users, Calendar as CalendarIcon, PlaneTakeoff, PlaneLanding } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { AirportInput } from "@/components/bloqueios/BlockSearchForm";

export function BloqueiosAereosStartCard() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [range, setRange] = useState<DateRange | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["air-blocks-start-summary"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("air_blocks")
          .select("origin,destination,departure_date,seats_available")
          .order("departure_date", { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (data || []).filter((b) => (b.departure_date || "") >= today);
  const totalSeats = upcoming.reduce(
    (sum, b) => sum + (b.seats_available || 0),
    0
  );
  const totalBlocks = upcoming.length;

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (origin) params.set("origin", origin);
    if (destination) params.set("destination", destination);
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (range?.from) params.set("dateFrom", toIso(range.from));
    if (range?.to) params.set("dateTo", toIso(range.to));
    const qs = params.toString();
    navigate(`/bloqueios-aereos${qs ? `?${qs}` : ""}`);
  };

  const handleViewAll = () => navigate("/bloqueios-aereos");

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Plane className="h-5 w-5 text-[hsl(var(--section-flights))]" />
              Bloqueios Aéreos
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-flights))]" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="text-[hsl(var(--section-flights))] hover:text-[hsl(var(--section-flights))]/80"
          >
            Ver todos
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Stats + Search — aligned single row on desktop */}
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 xl:flex xl:shrink-0">
            {[
              { icon: Users, label: "Lugares disponíveis", value: totalSeats },
              { icon: Plane, label: "Bloqueios ativos", value: totalBlocks },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="h-11 rounded-lg border border-border bg-muted/30 px-3 flex items-center gap-2.5 min-w-0"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))]">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex flex-col leading-none">
                  <span className="text-[10px] font-medium text-muted-foreground truncate">
                    {label}
                  </span>
                  <span className="font-display text-base font-bold text-foreground tabular-nums mt-0.5">
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      value.toLocaleString("pt-BR")
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Divider on desktop */}
          <div className="hidden xl:block h-8 w-px bg-border shrink-0" />

          {/* Search controls */}
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-1 xl:min-w-0 xl:items-center">
            <AirportInput
              value={origin}
              onChange={setOrigin}
              placeholder="Origem (ex: São Paulo, GRU)"
              icon={PlaneTakeoff}
              className="xl:flex-1 xl:min-w-0"
              inputClassName="h-11"
            />
            <AirportInput
              value={destination}
              onChange={setDestination}
              placeholder="Destino (ex: Salvador, SSA)"
              icon={PlaneLanding}
              className="xl:flex-1 xl:min-w-0"
              inputClassName="h-11"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 px-3 justify-start text-left font-normal sm:col-span-2 xl:col-span-1 xl:flex-1 xl:min-w-0",
                    !range?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {range?.from ? (
                      range.to ? (
                        <>
                          {format(range.from, "dd/MM/yy", { locale: ptBR })} – {format(range.to, "dd/MM/yy", { locale: ptBR })}
                        </>
                      ) : (
                        format(range.from, "dd/MM/yy", { locale: ptBR })
                      )
                    ) : (
                      "Período"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  numberOfMonths={2}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button
              onClick={handleSearch}
              className="h-11 px-5 sm:col-span-2 xl:col-span-1 xl:shrink-0"
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
