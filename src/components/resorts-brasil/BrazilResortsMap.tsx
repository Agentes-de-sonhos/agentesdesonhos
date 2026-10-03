import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAZIL_RESORTS, type BrazilResort } from "./resortsData";

const LOGOS = import.meta.glob("@/assets/resorts-brasil/*.webp", { eager: true, import: "default" }) as Record<string, string>;
const logoFor = (slug: string) =>
  Object.entries(LOGOS).find(([p]) => p.endsWith(`/${slug}.webp`))?.[1];

/** Mapa-grade (cartograma) do Brasil: [UF, nome, coluna, linha]. */
const STATES: [string, string, number, number][] = [
  ["RR", "Roraima", 3, 1], ["AP", "Amapá", 5, 1],
  ["AM", "Amazonas", 2, 2], ["PA", "Pará", 4, 2], ["MA", "Maranhão", 5, 2], ["CE", "Ceará", 6, 2], ["RN", "Rio Grande do Norte", 7, 2],
  ["AC", "Acre", 1, 3], ["RO", "Rondônia", 2, 3], ["TO", "Tocantins", 4, 3], ["PI", "Piauí", 5, 3], ["PB", "Paraíba", 7, 3],
  ["MT", "Mato Grosso", 3, 3], ["PE", "Pernambuco", 6, 3],
  ["BA", "Bahia", 5, 4], ["AL", "Alagoas", 7, 4], ["SE", "Sergipe", 6, 4], ["GO", "Goiás", 4, 4], ["DF", "Distrito Federal", 4, 5],
  ["MS", "Mato Grosso do Sul", 3, 5], ["MG", "Minas Gerais", 5, 5], ["ES", "Espírito Santo", 6, 5],
  ["SP", "São Paulo", 4, 6], ["RJ", "Rio de Janeiro", 5, 6], ["PR", "Paraná", 3, 6],
  ["SC", "Santa Catarina", 3, 7], ["RS", "Rio Grande do Sul", 2, 7],
];
const STATE_NAME = Object.fromEntries(STATES.map(([uf, n]) => [uf, n]));

const prettyName = (name: string) =>
  name === name.toLowerCase()
    ? name.replace(/\b\p{L}/gu, (c) => c.toUpperCase()).replace(/\bClubmed\b/, "Club Med")
    : name;

export function BrazilResortsMap({
  onQuote,
  title = "Explore os resorts do Brasil",
}: {
  onQuote?: (resort: BrazilResort, stateName: string) => void;
  title?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    BRAZIL_RESORTS.forEach((r) => (c[r.uf] = (c[r.uf] ?? 0) + 1));
    return c;
  }, []);
  const ufsWithResorts = STATES.filter(([uf]) => counts[uf]).sort((a, b) => counts[b[0]] - counts[a[0]]);
  const list = selected ? BRAZIL_RESORTS.filter((r) => r.uf === selected) : BRAZIL_RESORTS;

  return (
    <div className="w-full">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Resorts Brasil</p>
        <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          {BRAZIL_RESORTS.length} resorts em {ufsWithResorts.length} estados. Toque em um estado para ver as opções.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* Mapa */}
        <div className="mx-auto w-full max-w-md lg:sticky lg:top-24">
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Mapa do Brasil por estado">
            {STATES.map(([uf, name, col, row]) => {
              const n = counts[uf] ?? 0;
              const active = selected === uf;
              return (
                <button
                  key={uf}
                  type="button"
                  disabled={!n}
                  onClick={() => setSelected(active ? null : uf)}
                  title={n ? `${name} · ${n} resort${n > 1 ? "s" : ""}` : name}
                  aria-pressed={active}
                  style={{ gridColumn: col, gridRow: row }}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all",
                    !n && "cursor-default bg-muted text-muted-foreground/60",
                    n > 0 && !active && "bg-primary/15 text-primary hover:scale-105 hover:bg-primary/25",
                    active && "scale-105 bg-primary text-primary-foreground shadow-lg",
                  )}
                >
                  {uf}
                  {n > 0 && <span className="text-[10px] font-normal opacity-80">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        <div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
            <Chip active={!selected} onClick={() => setSelected(null)}>Todos ({BRAZIL_RESORTS.length})</Chip>
            {ufsWithResorts.map(([uf, name]) => (
              <Chip key={uf} active={selected === uf} onClick={() => setSelected(uf)}>
                {name} ({counts[uf]})
              </Chip>
            ))}
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((r) => {
              const logo = logoFor(r.slug);
              const name = prettyName(r.name);
              return (
                <li key={r.slug} className="flex flex-col rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                  <div className="flex h-20 items-center justify-center">
                    {logo ? (
                      <img src={logo} alt={`Logotipo ${name}`} loading="lazy" className="max-h-16 max-w-full object-contain" />
                    ) : (
                      <span className="font-display text-lg text-foreground">{name}</span>
                    )}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium text-foreground">{name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden /> {STATE_NAME[r.uf]}
                  </p>
                  {onQuote && (
                    <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => onQuote(r, STATE_NAME[r.uf])}>
                      Solicitar cotação
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
