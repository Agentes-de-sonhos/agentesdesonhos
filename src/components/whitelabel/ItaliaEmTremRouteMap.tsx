import { Maximize2 } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ITALIA_ROUTE_LEGS, ITALIA_ROUTE_STOPS } from "@/lib/circuits/italiaRoute";
import geography from "@/lib/circuits/italiaRouteGeography.json";
import { circuitNights } from "@/lib/circuits/presentation";
import type { CircuitTour } from "@/lib/circuits/types";

const W = 570, H = 300;
const routeBlue = "#2502ff"; // O mesmo azul da página principal da Curti.
type Point = readonly [number, number];
const project = ([lon, lat]: Point) => [
  (lon - 11.35) * 63,
  (43.02 - lat) * 84,
] as const;

const countryPaths = geography.features.map((feature) =>
  feature.geometry.coordinates.map((poly) =>
    poly.map((ring) =>
      ring.map(([lon, lat], i) => {
        const [x, y] = project([lon, lat]);
        return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join("") + "Z"
    ).join("")
  ).join("")
);
const route = ["Roma", ...ITALIA_ROUTE_LEGS.map(leg => leg.to)].join(" → ");
const positions = new Map(ITALIA_ROUTE_STOPS.map(({ city, coords }) => [city, project(coords)] as const));
// The two directions between Naples and Sorrento follow the same line.
const visibleLegs = ITALIA_ROUTE_LEGS.filter(leg => !(leg.from === "Sorrento" && leg.to === "Nápoles"));

function RouteSvg({ circuit }: { circuit: CircuitTour }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Mapa do percurso principal: ${route}`}>
      <rect width={W} height={H} fill="#eaf1f4" />
      {countryPaths.map(path => <path key={path} d={path} fill="#f7f6f1" stroke="#bac7c9" strokeWidth="1" />)}
      <text x="195" y="37" fill="#647981" fontSize="14" letterSpacing="4">ITÁLIA</text>
      {visibleLegs.map(({ from, to, mode }) => {
        const [x1, y1] = positions.get(from)!;
        const [x2, y2] = positions.get(to)!;
        return <line key={`${from}-${to}`} data-mode={mode} x1={x1} y1={y1} x2={x2} y2={y2} stroke={routeBlue} strokeWidth="3.6" strokeDasharray={mode === "train" ? "8 6" : undefined} strokeLinecap="round" />;
      })}
      {ITALIA_ROUTE_STOPS.map(p => {
        const [x, y] = positions.get(p.city)!;
        const [dx, dy] = p.label;
        const nights = circuitNights(circuit, p.city);
        const sub = [p.status, nights ? `${nights} ${nights === 1 ? "noite" : "noites"}` : ""].filter(Boolean).join(" · ");
        const edge = p.city === "Roma" || p.city === "Brindisi";
        return (
          <g key={p.city}>
            <circle cx={x} cy={y} r={edge ? 7 : 5} fill={routeBlue} stroke="white" strokeWidth="1.6" />
            <text x={x + dx} y={y + dy} textAnchor={p.anchor} fontSize="17" fontWeight="700" fill="#171717" stroke="white" strokeWidth="4" paintOrder="stroke">{p.city}</text>
            {sub && <text x={x + dx} y={y + dy + 15} textAnchor={p.anchor} fontSize="12.5" fontWeight="600" fill="#171717" stroke="white" strokeWidth="3" paintOrder="stroke">{sub}</text>}
          </g>
        );
      })}
      <text x="10" y={H - 10} fontSize="11" fill="#52636b">Geografia: Natural Earth · Traçado esquemático</text>
    </svg>
  );
}

function RouteLegend() {
  return <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Legenda do mapa" style={{ color: routeBlue }}>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="w-7 border-t-[3px] border-dashed" style={{ borderColor: routeBlue }} /> Trem</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="w-7 border-t-[3px]" style={{ borderColor: routeBlue }} /> Traslado</li>
  </ul>;
}

export function ItaliaEmTremRouteMap({ circuit }: { circuit: CircuitTour }) {
  return <Dialog>
    <figure className="mx-auto mt-6 max-w-2xl rounded-2xl border border-border bg-background">
      <DialogTrigger asChild><button type="button" aria-label="Ampliar mapa do roteiro" className="relative block w-full cursor-zoom-in overflow-hidden rounded-t-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        <RouteSvg circuit={circuit} />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/95 px-3 py-1 text-xs font-semibold text-foreground shadow-sm"><Maximize2 aria-hidden="true" className="h-3.5 w-3.5" /> Ampliar mapa</span>
      </button></DialogTrigger>
      <figcaption className="space-y-2 p-4 text-muted-foreground">
        <RouteLegend />
        <p className="text-sm"><strong className="text-foreground">Percurso principal:</strong> {route}.</p>
        <p className="text-xs leading-5">As excursões estão no dia a dia abaixo. As linhas do mapa ligam as cidades e não representam a via ferroviária exata.</p>
      </figcaption>
    </figure>
      <DialogContent hideClose className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto p-3 sm:p-5">
        <DialogTitle className="pr-7 text-left">Mapa do roteiro · Itália em Trem</DialogTitle>
        <DialogDescription>{route}</DialogDescription>
        <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Mapa ampliado; deslize na horizontal se necessário"><div className="min-w-[510px]"><RouteSvg circuit={circuit} /></div></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><RouteLegend /><DialogClose className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">Fechar mapa</DialogClose></div>
      </DialogContent>
  </Dialog>;
}
