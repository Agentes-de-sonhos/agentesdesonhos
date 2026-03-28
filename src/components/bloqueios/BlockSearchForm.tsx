import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MapPin, CalendarIcon, Search, Lightbulb } from "lucide-react";

interface BlockSearchFormProps {
  origin: string;
  destination: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  onOriginChange: (v: string) => void;
  onDestinationChange: (v: string) => void;
  onDateFromChange: (d: Date | undefined) => void;
  onDateToChange: (d: Date | undefined) => void;
  onSearch: () => void;
}

export function BlockSearchForm({
  origin, destination, dateFrom, dateTo,
  onOriginChange, onDestinationChange, onDateFromChange, onDateToChange, onSearch,
}: BlockSearchFormProps) {
  return (
    <Card className="border-0 shadow-md">
      <CardContent className="pt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Origin */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Origem (cidade ou aeroporto)"
              value={origin}
              onChange={(e) => onOriginChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Destination */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--section-flights))]" />
            <Input
              placeholder="Destino (ou deixe vazio para todos)"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              className="pl-10"
            />
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
              <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} locale={ptBR} disabled={(d) => dateFrom ? d < dateFrom : false} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Search button */}
          <Button onClick={onSearch} className="w-full bg-[hsl(var(--section-flights))] hover:bg-[hsl(var(--section-flights))]/90">
            <Search className="h-4 w-4 mr-2" />
            Buscar bloqueios
          </Button>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          Dica: os bloqueios têm datas fixas — busque por período para encontrar mais opções 😉
        </p>
      </CardContent>
    </Card>
  );
}
