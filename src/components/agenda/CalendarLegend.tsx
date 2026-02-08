import { eventTypeColors, eventTypeLabels } from "@/types/agenda";

const legendItems = [
  { type: 'compromisso', label: 'Compromisso' },
  { type: 'trade', label: 'Evento do Trade' },
  { type: 'venda', label: 'Venda' },
  { type: 'lembrete', label: 'Lembrete' },
  { type: 'reuniao', label: 'Reunião' },
  { type: 'viagem', label: 'Viagem' },
  { type: 'aniversario', label: 'Aniversário' },
  { type: 'feriado', label: 'Feriado' },
  { type: 'comemorativo', label: 'Data Comemorativa' },
  { type: 'treinamento', label: 'Treinamento' },
];

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 p-3 bg-muted/30 rounded-lg">
      <span className="text-xs font-medium text-muted-foreground w-full sm:w-auto">Legenda:</span>
      {legendItems.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: eventTypeColors[type] }}
          />
          <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
