import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import type { RaffleCapabilities, RaffleFilters } from "@/lib/raffle/types";

interface Options {
  states: string[];
  cities: string[];
  countries: string[];
  agencies: string[];
}

interface Props {
  filters: RaffleFilters;
  onChange: (patch: Partial<RaffleFilters>) => void;
  onReset: () => void;
  options: Options;
  capabilities: RaffleCapabilities;
}

function MultiSelect({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (!values.length) {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Sem dados disponíveis nesta origem.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{label}</p>
      <ScrollArea className="h-32 rounded-md border p-2">
        <div className="space-y-1.5">
          {values.map((value) => {
            const id = `${label}-${value}`;
            return (
              <div key={value} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(value)}
                  onCheckedChange={() => onToggle(value)}
                />
                <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
                  {value}
                </Label>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function RaffleFiltersPanel({
  filters,
  onChange,
  onReset,
  options,
  capabilities,
}: Props) {
  const toggleList = (key: "states" | "cities" | "countries" | "agencies", value: string) => {
    const current = filters[key];
    onChange({
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    } as Partial<RaffleFilters>);
  };

  const booleanFilters: Array<{
    key: keyof RaffleFilters;
    label: string;
    available: boolean;
    hint?: string;
  }> = [
    { key: "onlyConfirmed", label: "Apenas confirmados", available: true },
    {
      key: "onlyAttended",
      label: "Apenas presentes",
      available: capabilities.attendance,
      hint: "Sem dado de presença nesta origem",
    },
    {
      key: "excludeCancelled",
      label: "Excluir cancelados",
      available: capabilities.registrationStatus,
      hint: "Sem status de inscrição nesta origem",
    },
    { key: "excludeDuplicateEmails", label: "Excluir duplicados por e-mail", available: true },
    { key: "excludePreviousWinners", label: "Excluir vencedores anteriores", available: true },
    {
      key: "onlySurveyAnswered",
      label: "Apenas quem respondeu pesquisa",
      available: capabilities.survey,
      hint: "Sem dado de pesquisa nesta origem",
    },
    {
      key: "onlySubscribers",
      label: "Apenas assinantes Agentes de Sonhos",
      available: capabilities.subscribers,
      hint: "Integração futura",
    },
  ];

  const activeCount =
    booleanFilters.filter((f) => filters[f.key] === true).length +
    filters.states.length +
    filters.cities.length +
    filters.countries.length +
    filters.agencies.length +
    (filters.minWatchedMinutes !== null ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Buscar por nome, e-mail, agência ou cidade"
          className="pl-9"
          aria-label="Buscar participantes"
        />
      </div>

      <Accordion type="multiple" defaultValue={["eligibility"]}>
        <AccordionItem value="eligibility">
          <AccordionTrigger className="text-sm">
            Elegibilidade
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-3">
            {booleanFilters.map((f) => (
              <div key={String(f.key)} className="flex items-start gap-2">
                <Checkbox
                  id={`flt-${String(f.key)}`}
                  checked={filters[f.key] === true}
                  disabled={!f.available}
                  onCheckedChange={(v) =>
                    onChange({ [f.key]: v === true } as Partial<RaffleFilters>)
                  }
                />
                <Label
                  htmlFor={`flt-${String(f.key)}`}
                  className="cursor-pointer text-xs font-normal leading-tight"
                >
                  {f.label}
                  {!f.available && (
                    <span className="block text-[11px] text-muted-foreground">{f.hint}</span>
                  )}
                </Label>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="flt-minutes" className="text-xs">
                Permaneceu ao menos (minutos)
              </Label>
              <Input
                id="flt-minutes"
                type="number"
                min={0}
                inputMode="numeric"
                disabled={!capabilities.watchedMinutes}
                value={filters.minWatchedMinutes ?? ""}
                onChange={(e) =>
                  onChange({
                    minWatchedMinutes: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                  })
                }
                placeholder={capabilities.watchedMinutes ? "Ex.: 30" : "Indisponível nesta origem"}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger className="text-sm">Localização</AccordionTrigger>
          <AccordionContent className="space-y-3">
            <MultiSelect
              label="Estado"
              values={options.states}
              selected={filters.states}
              onToggle={(v) => toggleList("states", v)}
            />
            <MultiSelect
              label="Cidade"
              values={options.cities}
              selected={filters.cities}
              onToggle={(v) => toggleList("cities", v)}
            />
            <MultiSelect
              label="País"
              values={options.countries}
              selected={filters.countries}
              onToggle={(v) => toggleList("countries", v)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="agency">
          <AccordionTrigger className="text-sm">Agência</AccordionTrigger>
          <AccordionContent>
            <MultiSelect
              label="Agências"
              values={options.agencies}
              selected={filters.agencies}
              onToggle={(v) => toggleList("agencies", v)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button variant="ghost" size="sm" onClick={onReset} className="w-full gap-2">
        <X className="h-3.5 w-3.5" /> Limpar filtros
      </Button>
    </div>
  );
}