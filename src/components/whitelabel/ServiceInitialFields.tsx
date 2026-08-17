import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TripDatePicker } from "@/components/whitelabel/TripDatePicker";
import { LocationSearchInput } from "@/components/whitelabel/LocationSearchInput";
import { DestinationTagsInput } from "@/components/whitelabel/DestinationTagsInput";
import { TravelersFields } from "@/components/whitelabel/TravelersFields";
import {
  initialBlockFields, periodFieldNames, periodMode,
  type RequestService, type ServiceValues,
} from "@/lib/agencySiteRequests";

export interface ServiceInitialFieldsProps {
  service: RequestService;
  values: ServiceValues;
  /** Uma idade por criança, mantida pelo container. */
  ages: string[];
  errors?: Record<string, string>;
  editorial?: boolean;
  idPrefix: string;
  onValue: (name: string, value: string) => void;
  onDates: (next: { start: string; end: string }) => void;
  onAgeChange: (index: number, value: string) => void;
  /** Campos que o container renderiza por conta própria (ex.: rota do aéreo). */
  hidden?: string[];
  showAges?: boolean;
}

/**
 * BLOCO INICIAL compartilhado dos oito serviços dos sites white label.
 *
 * Uma única implementação, reutilizada por qualquer white label atual ou
 * futuro: período em um só campo/calendário, Adultos + Crianças com idades
 * condicionais, buscas estruturadas (cidade, aeroporto, porto) e destinos em
 * etiquetas. Os nomes de campo e o formato dos valores continuam idênticos ao
 * payload atual da solicitação.
 */
export function ServiceInitialFields({
  service, values, ages, errors = {}, editorial, idPrefix,
  onValue, onDates, onAgeChange, hidden = [], showAges = true,
}: ServiceInitialFieldsProps) {
  const skip = new Set(hidden);
  const period = periodMode(service, values);
  const periodNames = periodFieldNames(service);
  const labelCls = editorial
    ? "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
    : "text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground";
  const controlCls = editorial ? "mt-2 h-12 rounded-lg bg-card" : "mt-2 h-11 rounded-xl bg-card";

  return (
    <>
      {initialBlockFields(service).map((field) => {
        if (skip.has(field.name)) return null;

        // Datas do período: um único campo visual no lugar do primeiro campo.
        if (periodNames.includes(field.name)) {
          if (!service.period || field.name !== service.period.start || !period) return null;
          const single = period === "single";
          // Sem texto auxiliar de intervalo aqui: ele desalinhava a linha única
          // do bloco inicial (o calendário já é autoexplicativo).
          return (
            <TripDatePicker
              key="periodo"
              id={`${idPrefix}-periodo`}
              label={single ? service.period.singleLabel ?? service.period.label : service.period.label}
              mode={period}
              start={String(values[service.period.start] ?? "")}
              end={String(values[service.period.end] ?? "")}
              onChange={onDates}
              editorial={editorial}
              required
              error={errors.periodo || errors[service.period.start] || errors[service.period.end] || undefined}
              className="md:col-span-2 lg:col-span-1"
            />
          );
        }

        // Viajantes: Adultos + Crianças + idades condicionais (controle único).
        if (field.name === "criancas") return null;
        if (field.name === "adultos") {
          return (
            <TravelersFields
              key="viajantes"
              idPrefix={idPrefix}
              adults={String(values.adultos ?? "")}
              children={String(values.criancas ?? "")}
              ages={ages}
              onAdultsChange={(value) => onValue("adultos", value)}
              onChildrenChange={(value) => onValue("criancas", value)}
              onAgeChange={onAgeChange}
              errors={errors}
              editorial={editorial}
              showAges={showAges}
            />
          );
        }

        const id = `${idPrefix}-${field.name}`;
        const value = String(values[field.name] ?? "");
        const error = errors[field.name];
        const spanCls = field.span === 2 ? "md:col-span-2 lg:col-span-1" : undefined;

        if (field.search) {
          return (
            <LocationSearchInput
              key={field.name}
              id={id}
              label={field.label}
              kind={field.search}
              value={value}
              onChange={(next) => onValue(field.name, next)}
              placeholder={field.placeholder}
              error={error}
              help={field.help}
              required={field.required}
              editorial={editorial}
              className={spanCls}
            />
          );
        }

        if (field.type === "tags") {
          return (
            <DestinationTagsInput
              key={field.name}
              id={id}
              label={field.label}
              value={value}
              onChange={(next) => onValue(field.name, next)}
              placeholder={field.placeholder}
              error={error}
              help={field.help}
              required={field.required}
              editorial={editorial}
              className={spanCls}
            />
          );
        }

        if (field.type === "date") {
          return (
            <TripDatePicker
              key={field.name}
              id={id}
              label={field.label}
              mode="single"
              start={value}
              onChange={({ start }) => onValue(field.name, start)}
              editorial={editorial}
              required={field.required}
              help={field.help}
              error={error}
              className={spanCls}
            />
          );
        }

        return (
          <div key={field.name} className={cn("relative min-w-0", spanCls)}>
            <Label htmlFor={id} className={labelCls}>
              {field.label}
              {field.required && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
            </Label>
            {field.type === "select" ? (
              <Select value={value} onValueChange={(next) => onValue(field.name, next)}>
                <SelectTrigger
                  id={id}
                  aria-invalid={!!error}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className={cn(controlCls, error && "border-destructive")}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(field.options ?? []).map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                className={cn(controlCls, error && "border-destructive")}
                type={field.type === "number" ? "number" : field.type}
                inputMode={field.type === "number" ? "numeric" : undefined}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                value={value}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : field.help ? `${id}-help` : undefined}
                onChange={(event) => onValue(field.name, event.target.value)}
              />
            )}
            {error ? (
              <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">{error}</p>
            ) : field.help ? (
              <p
                id={`${id}-help`}
                className="mt-1 text-xs text-muted-foreground lg:absolute lg:left-0 lg:top-full lg:mt-1 lg:whitespace-nowrap"
              >
                {field.help}
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}