import { TrendingUp, Shield, Sun, BarChart3, Timer } from "lucide-react";

const benefits = [
  { icon: TrendingUp, title: "Tarifas competitivas", desc: "Preços mais previsíveis, sem oscilações dinâmicas" },
  { icon: Shield, title: "Condições exclusivas", desc: "Negociadas diretamente por operadoras parceiras" },
  { icon: Sun, title: "Ideal para alta temporada", desc: "Feriados e datas concorridas com preço garantido" },
  { icon: BarChart3, title: "Maior margem", desc: "Mais previsibilidade e rentabilidade para o agente" },
  { icon: Timer, title: "Estoque limitado", desc: "Oportunidades que acabam rápido — aproveite!" },
];

export function EducationalSection() {
  return (
    <div className="rounded-xl border border-[hsl(var(--section-flights))]/20 bg-[hsl(var(--section-flights))]/5 p-5 space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        ✈️ Por que usar bloqueios aéreos?
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {benefits.map((b) => (
          <div key={b.title} className="flex items-start gap-3 p-3 rounded-lg bg-background/80">
            <div className="p-2 rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))] shrink-0">
              <b.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
