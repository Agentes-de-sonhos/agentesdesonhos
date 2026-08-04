import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSpreadsheet, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RaffleSource } from "@/lib/raffle/types";

interface Props {
  value: RaffleSource;
  onChange: (value: RaffleSource) => void;
  academyAvailable: boolean;
  academyDisabledHint?: string;
}

export function RaffleSourceSelector({
  value,
  onChange,
  academyAvailable,
  academyDisabledHint,
}: Props) {
  const options: Array<{
    id: RaffleSource;
    title: string;
    description: string;
    icon: typeof FileSpreadsheet;
    disabled?: boolean;
  }> = [
    {
      id: "academy_event",
      title: "Evento da EducaTravel Academy",
      description: academyAvailable
        ? "Carrega automaticamente os inscritos do evento."
        : academyDisabledHint || "Disponível apenas para administradores.",
      icon: GraduationCap,
      disabled: !academyAvailable,
    },
    {
      id: "file",
      title: "Arquivo CSV/Excel",
      description: "Importe a planilha de participantes como antes.",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <fieldset>
      <legend className="text-sm font-semibold mb-3">Origem dos participantes</legend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as RaffleSource)}
        className="grid gap-3 sm:grid-cols-2"
      >
        {options.map((opt) => (
          <Label
            key={opt.id}
            htmlFor={`source-${opt.id}`}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
              value === opt.id ? "border-primary bg-primary/5" : "hover:bg-accent",
              opt.disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem
              id={`source-${opt.id}`}
              value={opt.id}
              disabled={opt.disabled}
              className="mt-1"
            />
            <span className="space-y-1">
              <span className="flex items-center gap-2 font-medium">
                <opt.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                {opt.title}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}