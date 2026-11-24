import { useState } from "react";
import { Maximize2 } from "lucide-react";
import geographyRaw from "../../../public/maps/circuit-europe.geojson?raw";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CIRCUIT_CITY_COORDS } from "@/lib/circuits/cityCoordinates";
import { circuitNights } from "@/lib/circuits/presentation";
import type { CircuitTour } from "@/lib/circuits";

type Pt = [number, number]; // [lng, lat]
const geo = JSON.parse(geographyRaw) as { features: { properties: { name: string }; geometry: { coordinates: Pt[][][] } }[] };

/** Posição do rótulo para cidades próximas entre si. */
const LABEL_SIDE: Record<string, "left" | "right" | "top" | "bottom"> = { Viena: "left", Bratislava: "top", Budapeste: "bottom" };

function RouteSvg({ circuit, large }: { circuit: CircuitTour; large?: boolean }) {
  const W = 800, H = large ? 560 : 340, PAD = large ? 90 : 60;
  const pts = circuit.cities.map(city => ({ city, c: CIRCUIT_CITY_COORDS[city]! }));
  const lats = pts.map(p => p.c[0]), lngs = pts.map(p => p.c[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const spanX = Math.max((maxLng - minLng) * kx, 1), spanY = Math.max(maxLat - minLat, 1);
  const s = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
  const cx = ((minLng + maxLng) / 2) * kx, cy = (minLat + maxLat) / 2;
  const proj = ([lng, lat]: Pt): Pt => [W / 2 + (lng * kx - cx) * s, H / 2 - (lat - cy) * s];
  const xy = pts.map(p => { const [x, y] = proj([p.c[1], p.c[0]]); return { ...p, x, y, n: circuitNights(circuit, p.city) }; });
  const path = xy.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fs = large ? 1 : 1.25;
  const countries = geo.features.filter(f => f.geometry.coordinates.length).map(f => {
    const d = f.geometry.coordinates.map(poly => poly.map(r => r.map((p, i) => `${i ? "L" : "M"}${proj(p).map(v => v.toFixed(1)).join(",")}`).join("") + "Z").join("")).join("");
    const main = f.geometry.coordinates.reduce((a, b) => (b[0].length > a[0].length ? b : a));
    const ring = main[0].map(proj);
    const lx = ring.reduce((a, p) => a + p[0], 0) / ring.length, ly = ring.reduce((a, p) => a + p[1], 0) / ring.length;
    return { name: f.properties.name, d, lx, ly };
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Mapa do roteiro: ${circuit.cities.join(" → ")}`}>
      <rect width={W} height={H} fill="#eaf1f4" />
      {countries.map(c => <path key={c.name + c.d.length} d={c.d} fill="#f7f6f1" stroke="#bac7c9" strokeWidth={1} />)}
      {countries.filter(c => c.name && c.lx > 30 && c.lx < W - 30 && c.ly > 20 && c.ly < H - 20).map(c => (
        <text key={"l" + c.name} x={c.lx} y={c.ly} textAnchor="middle" fontSize={13 * fs} fill="#8a9aa0" letterSpacing={2} style={{ textTransform: "uppercase" }}>{c.name}</text>
      ))}
      <path d={path} fill="none" stroke="var(--brand-primary, hsl(var(--primary)))" strokeWidth={3.5} strokeDasharray="8 7" strokeLinecap="round" />
      {xy.map((p, i) => {
        const edge = i === 0 || i === xy.length - 1;
        const side = LABEL_SIDE[p.city] ?? (p.x < W / 2 ? "right" : "left");
        const anchor = side === "right" ? "start" : side === "left" ? "end" : "middle";
        const lx = side === "right" ? p.x + 16 : side === "left" ? p.x - 16 : p.x;
        const ly = side === "top" ? p.y - 22 - 18 * fs : side === "bottom" ? p.y + 20 + 16 * fs : p.y;
        const sub = [i === 0 ? "Início" : i === xy.length - 1 ? "Término" : "", p.n > 0 ? `${p.n} ${p.n === 1 ? "noite" : "noites"}` : ""].filter(Boolean).join(" • ");
        return (
          <g key={p.city}>
            <circle cx={p.x} cy={p.y} r={edge ? 9 : 6} fill={edge ? "var(--brand-primary, hsl(var(--primary)))" : "white"} stroke="var(--brand-primary, hsl(var(--primary)))" strokeWidth={3} />
            <text x={lx} y={ly} textAnchor={anchor} fontSize={18 * fs} fontWeight={700} fill="#16262b" stroke="white" strokeWidth={4} paintOrder="stroke">{p.city}</text>
            {sub && <text x={lx} y={ly + 19 * fs} textAnchor={anchor} fontSize={14 * fs} fontWeight={600} fill="#52636b" stroke="white" strokeWidth={3} paintOrder="stroke">{sub}</text>}
          </g>
        );
      })}
      <text x={8} y={H - 8} fontSize={10} fill="#52636b">Geografia: Natural Earth · Ligações esquemáticas</text>
    </svg>
  );
}

export function CircuitRouteMap({ circuit }: { circuit: CircuitTour }) {
  const [open, setOpen] = useState(false);
  if (circuit.cities.length < 2 || circuit.cities.some(c => !CIRCUIT_CITY_COORDS[c])) return null;
  return (
    <>
      <figure className="relative mt-6 max-w-xl overflow-hidden rounded-2xl border border-border">
        <button type="button" onClick={() => setOpen(true)} className="block w-full cursor-zoom-in" aria-label="Ampliar mapa do roteiro">
          <RouteSvg circuit={circuit} />
        </button>
        <button type="button" onClick={() => setOpen(true)} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-background/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
          <Maximize2 className="h-3.5 w-3.5" /> Ampliar mapa
        </button>
      </figure>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-3 sm:p-4">
          <DialogTitle className="px-1 text-base">Mapa do roteiro · {circuit.cities.join(" → ")}</DialogTitle>
          <div className="overflow-hidden rounded-xl border border-border"><RouteSvg circuit={circuit} large /></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
