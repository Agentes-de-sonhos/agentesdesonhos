import { useMemo, useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAZIL_RESORTS } from "./resortsData";
import { BRAZIL_STATE_PATHS, BRAZIL_VIEWBOX } from "./brazilStatePaths";
import { STATES, STATE_NAME, logoFor, prettyName } from "./BrazilResortsMap";

const MAX_CARDS = 6;

/**
 * Seção compacta para a home white-label: mapa à esquerda, resorts do estado
 * selecionado à direita (até 6 cards) e "Ver todos" para a página completa.
 */
export function AgencyResortsSection({
  allHref,
  resortHref,
  initialState = "BA",
}: {
  allHref: string;
  resortHref: (slug: string) => string;
  initialState?: string;
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    BRAZIL_RESORTS.forEach((r) => (c[r.uf] = (c[r.uf] ?? 0) + 1));
    return c;
  }, []);
  const [selected, setSelected] = useState(counts[initialState] ? initialState : "SP");
  const all = BRAZIL_RESORTS.filter((r) => r.uf === selected);
  const shown = all.slice(0, MAX_CARDS);
  const ufs = STATES.filter(([uf]) => counts[uf]).sort((a, b) => counts[b[0]] - counts[a[0]]);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary wl-kicker">Resorts no Brasil</p>
          <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">Explore os resorts do Brasil com a 100 Limites</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {BRAZIL_RESORTS.length} resorts em {ufs.length} estados. Clique em um estado no mapa para ver as opções.
          </p>
        </div>
        <Button asChild variant="outline" className="wl-resorts-btn hidden rounded-full md:inline-flex">
          <a href={allHref}>Ver todos os resorts <ArrowRight className="ml-2 h-4 w-4" /></a>
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* Mapa (desktop) */}
        <svg viewBox={BRAZIL_VIEWBOX} className="mx-auto hidden h-auto w-full max-w-md lg:block" role="group" aria-label="Mapa do Brasil por estado">
          {STATES.map(([uf, name]) => {
            const shape = BRAZIL_STATE_PATHS[uf];
            if (!shape) return null;
            const n = counts[uf] ?? 0;
            const active = selected === uf;
            return (
              <g
                key={uf}
                role={n ? "button" : undefined}
                tabIndex={n ? 0 : -1}
                aria-label={n ? `${name}, ${n} resort${n > 1 ? "s" : ""}` : name}
                aria-pressed={n ? active : undefined}
                onClick={() => n && setSelected(uf)}
                onKeyDown={(e) => n && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(uf))}
                className={cn("group outline-none", n ? "cursor-pointer" : "cursor-default")}
              >
                <title>{n ? `${name} · ${n} resort${n > 1 ? "s" : ""}` : name}</title>
                <path
                  d={shape.d}
                  strokeWidth={1.5}
                  strokeLinejoin="round"
                  className={cn(
                    "stroke-card transition-colors duration-200",
                    !n && "fill-muted",
                    n > 0 && !active && "fill-primary/20 group-hover:fill-primary/45 group-focus-visible:fill-primary/45",
                    active && "fill-primary",
                  )}
                />
                {n > 0 && (
                  <g className="pointer-events-none">
                    <circle cx={shape.cx} cy={shape.cy} r={17} className={active ? "fill-background" : "fill-primary"} />
                    <text x={shape.cx} y={shape.cy} dy="0.35em" textAnchor="middle" fontSize={15} fontWeight={700}
                      className={active ? "fill-primary" : "fill-primary-foreground"}>{n}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Estados (celular) */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Escolher estado">
          {ufs.map(([uf, name]) => (
            <button
              key={uf}
              type="button"
              onClick={() => setSelected(uf)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
                selected === uf ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
              )}
            >
              {name} ({counts[uf]})
            </button>
          ))}
        </div>

        <div className="min-w-0">
          <p className="mb-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{STATE_NAME[selected]}</span> · mostrando {shown.length} de {all.length} resort{all.length > 1 ? "s" : ""}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map((r) => {
              const logo = logoFor(r.slug);
              const name = prettyName(r.name);
              return (
                <li key={r.slug} className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <a href={resortHref(r.slug)} className="absolute inset-0 z-10" aria-label={`Ver página do ${name}`} />
                  <div className="wl-resort-logo-box flex h-24 items-center justify-center px-5">
                    {logo ? (
                      <img src={logo} alt={`Logotipo ${name}`} loading="lazy" className="wl-resort-logo max-h-14 w-full object-contain transition duration-300 group-hover:scale-105" />
                    ) : (
                      <span className="text-center font-display text-base text-foreground">{name}</span>
                    )}
                  </div>
                  <div className="border-t border-border px-3 py-2.5">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground">{name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden /> {STATE_NAME[r.uf]}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex justify-center lg:justify-start">
            <Button asChild className="wl-resorts-btn rounded-full">
              <a href={allHref}>
                {all.length > shown.length ? `Ver todos os ${all.length} resorts de ${STATE_NAME[selected]}` : "Ver todos os resorts"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
