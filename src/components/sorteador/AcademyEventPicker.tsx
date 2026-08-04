import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check, ChevronsUpDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAcademyEventLabel, type AcademyRaffleEvent } from "@/hooks/useAcademyRaffle";

interface Props {
  events: AcademyRaffleEvent[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (event: AcademyRaffleEvent) => void;
}

export function AcademyEventPicker({
  events,
  isLoading,
  isError,
  onRetry,
  selectedId,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = events.find((e) => e.training_id === selectedId) || null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar os eventos</AlertTitle>
        <AlertDescription className="flex items-center gap-3">
          Verifique sua conexão e tente novamente.
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!events.length) {
    return (
      <Alert>
        <AlertTitle>Nenhum evento encontrado</AlertTitle>
        <AlertDescription>
          Ainda não há eventos da EducaTravel Academy com participantes. Use a origem
          "Arquivo CSV/Excel" enquanto isso.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="academy-event-trigger">Evento da EducaTravel Academy</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="academy-event-trigger"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-left font-normal"
          >
            <span className="truncate">
              {selected ? formatAcademyEventLabel(selected) : "Selecione um evento…"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(36rem,90vw)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nome, trilha ou destino…" />
            <CommandList>
              <CommandEmpty>Nenhum evento correspondente.</CommandEmpty>
              <CommandGroup>
                {events.map((e) => (
                  <CommandItem
                    key={e.training_id}
                    value={`${e.title} ${e.trail_name ?? ""} ${e.destination ?? ""}`}
                    onSelect={() => {
                      onSelect(e);
                      setOpen(false);
                    }}
                    className="flex items-start gap-2"
                  >
                    <Check
                      className={cn(
                        "mt-1 h-4 w-4",
                        selectedId === e.training_id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {formatAcademyEventLabel(e)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[e.trail_name, e.destination].filter(Boolean).join(" • ") || "Sem trilha"}
                      </span>
                    </span>
                    {!e.is_active && (
                      <Badge variant="outline" className="shrink-0">
                        Inativo
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}