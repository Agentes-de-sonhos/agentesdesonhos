import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAZIL_RESORTS, type BrazilResort } from "./resortsData";
import { BRAZIL_STATE_PATHS, BRAZIL_VIEWBOX } from "./brazilStatePaths";

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
  const [query, setQuery] = useState("");
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    BRAZIL_RESORTS.forEach((r) => (c[r.uf] = (c[r.uf] ?? 0) + 1));
    return c;
  }, []);
  const ufsWithResorts = STATES.filter(([uf]) => counts[uf]).sort((a, b) => counts[b[0]] - counts[a[0]]);
  const list = selected ? BRAZIL_RESORTS.filter((r) => r.uf === selected) : BRAZIL_RESORTS;

  const filtered = query.trim()
    ? list.filter((r) => prettyName(r.name).toLowerCase().includes(query.trim().toLowerCase()))
    : list;

  // Barra de estados: arrastar com o mouse + setas laterais.
  const railRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ down: boolean; moved: boolean; startX: number; startScroll: number }>({ down: false, moved: false, startX: 0, startScroll: 0 });
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updateArrows();
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      drag.current = { down: true, moved: false, startX: e.pageX, startScroll: el.scrollLeft };
      el.style.cursor = "grabbing";
    };
    const onMove = (e: MouseEvent) => {
      if (!drag.current.down) return;
      const dx = e.pageX - drag.current.startX;
      if (Math.abs(dx) > 4) drag.current.moved = true;
      el.scrollLeft = drag.current.startScroll - dx;
    };
    const onUp = () => {
      drag.current.down = false;
      el.style.cursor = "";
    };
    const onClickCapture = (e: MouseEvent) => {
      if (drag.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        drag.current.moved = false;
      }
    };
    const onLeave = () => onUp();
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseleave", onLeave);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  const scrollRail = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: "smooth" });
  };


  return (
    <div className="w-full">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Resorts Brasil</p>
        <h2 className="mt-3 font-display text-3xl text-foreground md:text-5xl">{title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          {BRAZIL_RESORTS.length} resorts em {ufsWithResorts.length} estados. Escolha um estado no mapa para ver as opções.
        </p>
      </div>

      <div className="mt-10">
        <section>
          <svg viewBox={BRAZIL_VIEWBOX} className="mx-auto h-auto w-full max-w-2xl" role="group" aria-label="Mapa do Brasil por estado">
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
                  onClick={() => n && setSelected(active ? null : uf)}
                  onKeyDown={(e) => n && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setSelected(active ? null : uf))}
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
                      n > 0 && !active && (selected ? "fill-primary/15" : "fill-primary/25") + " group-hover:fill-primary/45 group-focus-visible:fill-primary/45",
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

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {selected ? (
              <>
                <span className="font-medium text-foreground">{STATE_NAME[selected]}</span> · {list.length} resort{list.length > 1 ? "s" : ""} ·{" "}
                <button type="button" onClick={() => setSelected(null)} className="text-primary underline-offset-4 hover:underline">
                  ver todos
                </button>
              </>
            ) : (
              "Os números indicam a quantidade de resorts por estado."
            )}
          </p>
        </section>

        <div className="mx-auto mt-10 max-w-4xl">
          <div className="relative mx-auto max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar resort pelo nome"
              aria-label="Buscar resort pelo nome"
              className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative mt-5">
            {canLeft && (
              <button
                type="button"
                aria-label="Rolar estados para a esquerda"
                onClick={() => scrollRail(-1)}
                className="absolute -left-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
            )}
            <div
              ref={railRef}
              className="flex cursor-grab select-none gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&:not(:active)]:cursor-grab"
              role="tablist"
              aria-label="Filtrar resorts por estado"
              style={{ WebkitTouchCallout: "none" }}
            >
              <Chip active={!selected} onClick={() => setSelected(null)}>Todos ({BRAZIL_RESORTS.length})</Chip>
              {ufsWithResorts.map(([uf, name]) => (
                <Chip key={uf} active={selected === uf} onClick={() => setSelected(selected === uf ? null : uf)}>
                  {name} ({counts[uf]})
                </Chip>
              ))}
            </div>
            {canRight && (
              <button
                type="button"
                aria-label="Rolar estados para a direita"
                onClick={() => scrollRail(1)}
                className="absolute -right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="mt-10 min-w-0">

          {filtered.length === 0 ? (
            <p className="mt-10 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Nenhum resort encontrado com esse nome.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((r) => {
                const logo = logoFor(r.slug);
                const name = prettyName(r.name);
                return (
                  <li key={r.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                    <div className="flex h-32 items-center justify-center bg-card px-6">
                      {logo ? (
                        <img src={logo} alt={`Logotipo ${name}`} loading="lazy" className="max-h-20 w-full object-contain transition duration-300 group-hover:scale-105" />
                      ) : (
                        <span className="text-center font-display text-lg text-foreground">{name}</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col border-t border-border px-4 py-3">
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground">{name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden /> {STATE_NAME[r.uf]}
                      </p>
                      {onQuote && (
                        <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => onQuote(r, STATE_NAME[r.uf])}>
                          Solicitar cotação
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
