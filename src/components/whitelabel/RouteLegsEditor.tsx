import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TripDatePicker } from "@/components/whitelabel/TripDatePicker";
import { MIN_ROUTE_LEGS, type RouteLeg } from "@/lib/agencyQuoteJourney";

export interface RouteLegsEditorProps {
  legs: RouteLeg[];
  onChange: (legs: RouteLeg[]) => void;
  errors?: Record<string, string>;
  editorial?: boolean;
  className?: string;
  idPrefix?: string;
}

/**
 * Editor compacto e estruturado de "Destinos da viagem" (aéreo multidestinos).
 * Começa com 2 destinos após a origem, permite adicionar/remover linhas
 * (mínimo 2) e cada linha tem destino + data.
 */
export function RouteLegsEditor({
  legs, onChange, errors = {}, editorial, className, idPrefix = "rota",
}: RouteLegsEditorProps) {
  const update = (index: number, patch: Partial<RouteLeg>) => {
    onChange(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  };

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend
        className={
          editorial
            ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            : "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
        }
      >
        Destinos da viagem
        <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
      </legend>

      <div className="mt-2 space-y-3">
        {legs.map((leg, index) => {
          const destinoId = `${idPrefix}-destino-${index}`;
          const destinoError = errors[`leg_${index}_destino`];
          const dataError = errors[`leg_${index}_data`];
          return (
            <div key={destinoId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <div className="min-w-0">
                <Label htmlFor={destinoId} className="text-xs text-muted-foreground">
                  Destino {index + 1}
                </Label>
                <Input
                  id={destinoId}
                  className={cn("mt-1.5 bg-card", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl")}
                  placeholder="Cidade ou aeroporto"
                  value={leg.destino}
                  aria-invalid={!!destinoError}
                  aria-describedby={destinoError ? `${destinoId}-error` : undefined}
                  onChange={(e) => update(index, { destino: e.target.value })}
                />
                {destinoError && (
                  <p id={`${destinoId}-error`} role="alert" className="mt-1 text-xs text-destructive">
                    {destinoError}
                  </p>
                )}
              </div>

              <TripDatePicker
                id={`${idPrefix}-data-${index}`}
                label={`Data ${index + 1}`}
                mode="single"
                start={leg.data}
                onChange={({ start }) => update(index, { data: start })}
                editorial={editorial}
                error={dataError}
                className="[&>label]:normal-case [&>label]:tracking-normal [&>label]:text-xs [&>label]:font-normal"
                placeholder="Selecione"
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn("mt-1 h-10 shrink-0 justify-start px-2 sm:mt-0", editorial ? "sm:h-12" : "sm:h-11")}
                onClick={() => onChange(legs.filter((_, i) => i !== index))}
                disabled={legs.length <= MIN_ROUTE_LEGS}
                aria-label={`Remover destino ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span className="ml-1.5 sm:hidden">Remover</span>
              </Button>
            </div>
          );
        })}
      </div>

      {errors.rota && (
        <p role="alert" className="mt-2 text-xs text-destructive">{errors.rota}</p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => onChange([...legs, { destino: "", data: "" }])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Adicionar destino
      </Button>
    </fieldset>
  );
}