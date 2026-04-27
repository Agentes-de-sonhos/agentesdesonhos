import { useState } from "react";
import { TrendingUp, Shield, Sun, BarChart3, Timer, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const benefits = [
  { icon: TrendingUp, title: "Tarifas competitivas", desc: "Preços mais previsíveis, sem oscilações dinâmicas" },
  { icon: Shield, title: "Condições exclusivas", desc: "Negociadas diretamente por operadoras parceiras" },
  { icon: Sun, title: "Ideal para alta temporada", desc: "Feriados e datas concorridas com preço garantido" },
  { icon: BarChart3, title: "Maior margem", desc: "Mais previsibilidade e rentabilidade para o agente" },
  { icon: Timer, title: "Estoque limitado", desc: "Oportunidades que acabam rápido — aproveite!" },
];

export function EducationalSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[hsl(var(--section-flights))]/20 bg-[hsl(var(--section-flights))]/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-2 p-5 text-left transition-colors"
      >
        <h2 className="text-lg font-normal text-foreground flex items-center gap-2">
          ✈️ Por que usar bloqueios aéreos?
        </h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 px-5 pb-5">
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
      )}
    </div>
  );
}
