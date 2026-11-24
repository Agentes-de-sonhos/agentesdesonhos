import { CIRCUIT_CITY_COORDS } from "@/lib/circuits/cityCoordinates";
import { circuitNights } from "@/lib/circuits/presentation";
import type { CircuitTour } from "@/lib/circuits";

/** Posição do rótulo para cidades próximas entre si. */
const LABEL_SIDE: Record<string, "left" | "right" | "top" | "bottom"> = { Viena: "left", Bratislava: "top", Budapeste: "bottom" };

const W = 800, H = 480, PAD = 70;

export function CircuitRouteMap({ circuit }: { circuit: CircuitTour }) {
  const pts = circuit.cities.map(city => ({ city, c: CIRCUIT_CITY_COORDS[city] }));
  if (pts.length < 2 || pts.some(p => !p.c)) return null;
  const lats = pts.map(p => p.c![0]), lngs = pts.map(p => p.c![1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max((maxLng - minLng) * kx, 0.01), spanY = Math.max(maxLat - minLat, 0.01);
  const s = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const ox = (W - spanX * s) / 2, oy = (H - spanY * s) / 2;
  const xy = pts.map(p => ({ ...p, x: ox + (p.c![1] - minLng) * kx * s, y: oy + (maxLat - p.c![0]) * s, n: circuitNights(circuit, p.city) }));
  const path = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-muted/40" aria-label={`Mapa do roteiro: ${circuit.cities.join(", ")}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img">
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} strokeDasharray="8 7" strokeLinecap="round" />
        {xy.map((p, i) => {
          const edge = i === 0 || i === xy.length - 1;
          const side = LABEL_SIDE[p.city] ?? (p.x < W / 2 ? "right" : "left");
          const anchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
          const lx = side === "right" ? p.x + 18 : side === "left" ? p.x - 18 : p.x;
          const ly = side === "top" ? p.y - 42 : side === "bottom" ? p.y + 34 : p.y - 2;
          const sub = [i === 0 ? "Início" : i === xy.length - 1 ? "Término" : "", p.n > 0 ? `${p.n} ${p.n === 1 ? "noite" : "noites"}` : ""].filter(Boolean).join(" • ");
          return (
            <g key={p.city}>
              <circle cx={p.x} cy={p.y} r={edge ? 11 : 7} fill={edge ? "hsl(var(--primary))" : "hsl(var(--card))"} stroke="hsl(var(--primary))" strokeWidth={3} />
              <text x={lx} y={ly} textAnchor={anchor} className="fill-foreground" fontSize={20} fontWeight={600}>{p.city}</text>
              {sub && <text x={lx} y={ly + 22} textAnchor={anchor} className="fill-muted-foreground" fontSize={15}>{sub}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
