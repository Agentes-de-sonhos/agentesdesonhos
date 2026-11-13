import geographyRaw from '../../../public/maps/cruise-south-america.geojson?raw';
import type { SeasonItinerary } from '@/lib/cruiseShips/seasonItineraries';

type Point = [number, number];
const geography = JSON.parse(geographyRaw) as { features: { geometry: { type: string; coordinates: Point[][] | Point[][][] } }[] };
const polygons = geography.features.flatMap(f => f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates as Point[][][] : [f.geometry.coordinates as Point[][]]);

/** Local Natural Earth geography; schematic links between verified ports, never a navigation track. */
export function SeasonItineraryMap({ option }: { option: SeasonItinerary }) {
  const points = option.ports.map(port => option.ship.routes.coordinates[port]); // [latitude, longitude]
  const latitudes = points.map(p => p[0]), longitudes = points.map(p => p[1]);
  const midLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
  const factor = Math.cos(midLat * Math.PI / 180);
  const projected = points.map(([lat, lon]) => [lon * factor, -lat] as Point);
  const xs = projected.map(p => p[0]), ys = projected.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const scale = Math.min(235 / Math.max(Math.max(...xs) - Math.min(...xs), 2), 150 / Math.max(Math.max(...ys) - Math.min(...ys), 2));
  const project = ([lon, lat]: Point) => [160 + (lon * factor - cx) * scale, 112 + (-lat - cy) * scale] as Point;
  const position = ([lat, lon]: Point) => project([lon, lat]);
  const unique = [...new Set(option.ports)];
  return <svg viewBox="0 0 320 240" role="img" aria-label={`Mapa esquemático: ${option.ports.join(' → ')}`} className="csi-map">
    <rect width="320" height="240" fill="#eaf1f4" />
    {polygons.map((polygon, index) => <path key={index} d={polygon.map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(v => v.toFixed(1)).join(',')}`).join(' ') + ' Z').join(' ')} fill="#f7f6f1" stroke="#bac7c9" strokeWidth="0.7" />)}
    <polyline points={points.map(p => position(p).join(',')).join(' ')} fill="none" stroke="var(--brand-primary, #222)" strokeWidth="2.5" strokeDasharray="5 4" />
    {unique.map((port, index) => {
      const [x, y] = position(option.ship.routes.coordinates[port]);
      return <g key={port}><circle cx={x} cy={y} r="6" fill="var(--brand-primary, #222)" stroke="white" strokeWidth="2" />
        <text x={Math.min(310, Math.max(10, x))} y={y + (index % 2 ? 21 : -13)} textAnchor={x > 230 ? 'end' : x < 90 ? 'start' : 'middle'} fontSize="11" fontWeight="600" fill="#16262b" stroke="white" strokeWidth="3" paintOrder="stroke">{port}</text></g>;
    })}
    <text x="8" y="233" fontSize="8" fill="#52636b">Geografia: Natural Earth · Ligações esquemáticas</text>
  </svg>;
}
