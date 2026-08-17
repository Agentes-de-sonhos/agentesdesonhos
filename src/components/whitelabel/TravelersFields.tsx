import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CHILD_AGE_HELP, CHILD_AGE_OPTIONS, MAX_ADULTS, MAX_CHILDREN } from "@/lib/agencyQuoteJourney";

export interface TravelersFieldsProps {
  idPrefix: string;
  adults: string;
  children: string;
  /** Uma idade por criança ("0".."17"), sempre com `children` itens. */
  ages: string[];
  onAdultsChange: (value: string) => void;
  onChildrenChange: (value: string) => void;
  onAgeChange: (index: number, value: string) => void;
  errors?: Record<string, string>;
  editorial?: boolean;
  className?: string;
  /** Renderiza o bloco de idades (padrão: sim, quando houver crianças). */
  showAges?: boolean;
}

/**
 * Controle compartilhado de viajantes: Adultos, Crianças e uma idade por
 * criança (aparece somente quando há crianças). Usado nos oito serviços dos
 * sites white label, no lugar de campos genéricos de "passageiros".
 */
export function TravelersFields({
  idPrefix, adults, children, ages, onAdultsChange, onChildrenChange, onAgeChange,
  errors = {}, editorial, className, showAges = true,
}: TravelersFieldsProps) {
  const count = Math.max(0, Math.min(MAX_CHILDREN, Number(children) || 0));
  const labelCls = editorial
    ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
    : "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground";
  const inputCls = cn("mt-2 bg-card", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl");

  return (
    <>
      <div className={cn("min-w-0", className)}>
        <Label htmlFor={`${idPrefix}-adultos`} className={labelCls}>
          Adultos<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-adultos`}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_ADULTS}
          className={cn(inputCls, errors.adultos && "border-destructive")}
          value={adults}
          aria-invalid={!!errors.adultos}
          aria-describedby={errors.adultos ? `${idPrefix}-adultos-error` : undefined}
          onChange={(event) => onAdultsChange(event.target.value)}
        />
        {errors.adultos && (
          <p id={`${idPrefix}-adultos-error`} role="alert" className="mt-1 text-xs text-destructive">
            {errors.adultos}
          </p>
        )}
      </div>

      <div className="min-w-0">
        <Label htmlFor={`${idPrefix}-criancas`} className={labelCls}>Crianças</Label>
        <Input
          id={`${idPrefix}-criancas`}
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_CHILDREN}
          className={cn(inputCls, errors.criancas && "border-destructive")}
          value={children}
          aria-invalid={!!errors.criancas}
          onChange={(event) => onChildrenChange(event.target.value)}
        />
      </div>

      {showAges && count > 0 && (
        <fieldset className="min-w-0 md:col-span-full">
          <legend className={labelCls}>
            Idade das crianças<span aria-hidden="true" className="ml-0.5 text-destructive">*</span>
          </legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: count }, (_, index) => {
              const id = `${idPrefix}-idade-${index}`;
              const ageError = errors[`child_age_${index}`];
              return (
                <div key={id} className="min-w-0">
                  <Label htmlFor={id} className="text-xs text-muted-foreground">
                    Idade da criança {index + 1}
                  </Label>
                  <Select value={ages[index] ?? ""} onValueChange={(value) => onAgeChange(index, value)}>
                    <SelectTrigger
                      id={id}
                      aria-invalid={!!ageError}
                      aria-describedby={ageError ? `${id}-error` : undefined}
                      className={cn("mt-1.5 bg-card", editorial ? "h-12 rounded-lg" : "h-11 rounded-xl", ageError && "border-destructive")}
                    >
                      <SelectValue placeholder="Idade" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHILD_AGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {ageError && (
                    <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{ageError}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{CHILD_AGE_HELP}</p>
        </fieldset>
      )}
    </>
  );
}