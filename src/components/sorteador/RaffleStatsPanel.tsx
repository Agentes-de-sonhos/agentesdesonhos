import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RaffleStats } from "@/lib/raffle/eligibility";

function DistributionList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem dados disponíveis.</p>
        ) : (
          <ScrollArea className="h-40 pr-3">
            <ul className="space-y-1.5">
              {items.map((i) => (
                <li key={i.label} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate">{i.label}</span>
                  <span className="font-semibold tabular-nums">{i.count}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function RaffleStatsPanel({ stats }: { stats: RaffleStats }) {
  const r = stats.recurrence;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <DistributionList title="Participantes por estado" items={stats.byState} />
        <DistributionList title="Participantes por cidade" items={stats.byCity} />
        <DistributionList title="Participantes por agência" items={stats.byAgency} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recorrência de participação</CardTitle>
        </CardHeader>
        <CardContent>
          {!r.available ? (
            <p className="text-xs text-muted-foreground">
              A origem atual não fornece histórico de participação. Disponível ao usar eventos da
              EducaTravel Academy.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Novos participantes", value: r.firstTime },
                { label: "Recorrentes", value: r.recurring },
                { label: "Primeira participação", value: r.firstTime },
                { label: "2 eventos", value: r.twoEvents },
                { label: "3 eventos", value: r.threeEvents },
                { label: "4+ eventos", value: r.fourPlus },
                { label: "5+ eventos", value: r.fivePlus },
              ].map((i) => (
                <div key={i.label} className="rounded-lg border p-3">
                  <p className="text-[11px] text-muted-foreground">{i.label}</p>
                  <p className="text-lg font-bold tabular-nums">{i.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}