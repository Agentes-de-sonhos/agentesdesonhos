import { TripDatePicker, parseYMD, toYMD, formatShortPtBR } from "@/components/whitelabel/TripDatePicker";

export { parseYMD, toYMD, formatShortPtBR };

export interface TripPeriodFieldProps {
  id: string;
  /** Rótulo em português: "Período da viagem", "Período da hospedagem", etc. */
  label?: string;
  /** "YYYY-MM-DD" ou vazio. */
  start: string;
  end?: string;
  onChange: (next: { start: string; end: string }) => void;
  required?: boolean;
  error?: string;
  help?: string;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  /** Preserva regras de datas desabilitadas já existentes no formulário. */
  disabledDates?: (date: Date) => boolean;
  defaultMonth?: Date;
}

/**
 * Campo único de período contínuo usado pelos módulos internos (CRM, reservas,
 * orçamentos, carteira, roteiros). É apenas uma variante de formulário do
 * seletor compartilhado `TripDatePicker`, portanto não existe segunda lógica de
 * calendário: primeiro clique define o início, o segundo o fim, mesmo dia é
 * permitido e "Limpar período" devolve strings vazias — o chamador converte
 * para null/undefined conforme o payload atual do seu fluxo.
 */
export function TripPeriodField({
  id,
  label = "Período da viagem",
  start,
  end,
  onChange,
  required,
  error,
  help,
  className,
  triggerClassName,
  placeholder,
  disabledDates,
  defaultMonth,
}: TripPeriodFieldProps) {
  return (
    <TripDatePicker
      id={id}
      label={label}
      mode="range"
      start={start}
      end={end}
      onChange={onChange}
      required={required}
      error={error}
      help={help}
      className={className}
      triggerClassName={triggerClassName}
      placeholder={placeholder ?? "Selecione o período"}
      labelVariant="form"
      dateFormat="short"
      allowClear
      disabledDates={disabledDates}
      defaultMonth={defaultMonth}
    />
  );
}

export default TripPeriodField;
