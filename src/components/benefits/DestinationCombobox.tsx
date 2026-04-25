import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DestinationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Creatable autocomplete for benefit destinations.
 * Suggests destinations already saved in the benefits table and lets the user
 * type any new value freely.
 */
export function DestinationCombobox({ value, onChange, placeholder = "Digite ou selecione um destino" }: DestinationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: existing = [] } = useQuery({
    queryKey: ["benefit-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("destination")
        .not("destination", "is", null);
      if (error) return [] as string[];
      const set = new Set<string>();
      (data as { destination: string | null }[]).forEach((r) => {
        const v = (r.destination || "").trim();
        if (v) set.add(v);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    staleTime: 5 * 60 * 1000,
  });

  const normalized = query.trim();
  const showCreate = useMemo(
    () => normalized.length > 0 && !existing.some((d) => d.toLowerCase() === normalized.toLowerCase()),
    [normalized, existing]
  );

  const select = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value || placeholder}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Buscar ou criar destino..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {normalized ? (
                <button
                  type="button"
                  onClick={() => select(normalized)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Criar "{normalized}"
                </button>
              ) : (
                <span className="px-3 py-2 text-sm text-muted-foreground">Digite para buscar destinos</span>
              )}
            </CommandEmpty>
            {existing.length > 0 && (
              <CommandGroup heading="Destinos já cadastrados">
                {existing.map((d) => (
                  <CommandItem key={d} value={d} onSelect={() => select(d)}>
                    <Check className={cn("mr-2 h-4 w-4", value === d ? "opacity-100" : "opacity-0")} />
                    {d}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup heading="Novo">
                <CommandItem value={`__create__${normalized}`} onSelect={() => select(normalized)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar "{normalized}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Returns the list of unique destinations already saved across all benefits,
 * suitable for filter chips.
 */
export function useBenefitDestinations() {
  return useQuery({
    queryKey: ["benefit-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("destination")
        .not("destination", "is", null);
      if (error) return [] as string[];
      const set = new Set<string>();
      (data as { destination: string | null }[]).forEach((r) => {
        const v = (r.destination || "").trim();
        if (v) set.add(v);
      });
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Re-export Input so consumers can import a controlled fallback if needed.
export { Input };