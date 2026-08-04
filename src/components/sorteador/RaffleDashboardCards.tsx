import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RaffleDashboard } from "@/lib/raffle/eligibility";

interface Props {
  dashboard: RaffleDashboard;
  className?: string;
}

export function RaffleDashboardCards({ dashboard, className }: Props) {
  const cards: Array<{ label: string; value: string; hint?: string }> = [
    { label: "Total de inscritos", value: String(dashboard.total) },
    { label: "Total presentes", value: String(dashboard.attended) },
    { label: "Total confirmados", value: String(dashboard.confirmed) },
    { label: "Elegíveis para sorteio", value: String(dashboard.eligible) },
    { label: "Duplicidades", value: String(dashboard.duplicates) },
    { label: "Estados representados", value: String(dashboard.states) },
    { label: "Agências representadas", value: String(dashboard.agencies) },
    {
      label: "Assinantes Agentes de Sonhos",
      value: dashboard.subscribers === null ? "—" : String(dashboard.subscribers),
      hint: dashboard.subscribers === null ? "Integração futura" : undefined,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}>
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{c.value}</p>
            {c.hint && <p className="text-[11px] text-muted-foreground">{c.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}