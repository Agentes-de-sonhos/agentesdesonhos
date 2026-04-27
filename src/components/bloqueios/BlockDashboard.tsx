import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Users,
  Building2,
  Award,
  TrendingUp,
  Route,
  CalendarDays,
  ChevronDown,
} from "lucide-react";

interface AirBlock {
  id: string;
  origin: string;
  destination: string;
  airline: string | null;
  operator: string | null;
  departure_date: string;
  seats_available: number | null;
}

export interface SeasonRange {
  key: string;
  label: string;
  /** inclusive MM-DD start */
  start: string;
  /** inclusive MM-DD end (may wrap year — handled by isInRange) */
  end: string;
}

/**
 * Strategic seasons. Dates are best-effort fixed windows; movable holidays
 * (Carnaval, Páscoa, Corpus Christi) use approximate windows that capture
 * the typical travel period for the season.
 */
export const STRATEGIC_SEASONS: SeasonRange[] = [
  { key: "reveillon", label: "Réveillon", start: "12-26", end: "01-05" },
  { key: "ferias-janeiro", label: "Férias de janeiro", start: "01-06", end: "01-31" },
  { key: "carnaval", label: "Carnaval", start: "02-01", end: "03-10" },
  { key: "pascoa-abril", label: "Páscoa / Abril (Sexta Santa + Tiradentes)", start: "03-25", end: "04-25" },
  { key: "corpus-christi", label: "Corpus Christi (junho)", start: "05-25", end: "06-25" },
  { key: "ferias-julho", label: "Férias de julho", start: "07-01", end: "07-31" },
  { key: "sete-setembro", label: "7 de Setembro", start: "09-05", end: "09-09" },
  { key: "dia-criancas", label: "Dia das Crianças (12/10)", start: "10-10", end: "10-14" },
  { key: "finados", label: "Finados (02/11)", start: "10-31", end: "11-03" },
  { key: "proclamacao-republica", label: "Proclamação da República (15/11)", start: "11-13", end: "11-17" },
  { key: "consciencia-negra", label: "Consciência Negra (20/11)", start: "11-18", end: "11-22" },
];

function isInSeason(dateStr: string, season: SeasonRange) {
  // dateStr: YYYY-MM-DD
  const mmdd = dateStr.slice(5); // MM-DD
  const { start, end } = season;
  if (start <= end) {
    return mmdd >= start && mmdd <= end;
  }
  // wraps year (e.g. Réveillon)
  return mmdd >= start || mmdd <= end;
}

interface BlockDashboardProps {
  blocks: AirBlock[];
  getCityLabel: (code: string) => string;
  onFilterAirline?: (airline: string) => void;
  onFilterOperator?: (operator: string) => void;
  onFilterOrigin?: (origin: string) => void;
  onFilterDestination?: (destination: string) => void;
  onFilterRoute?: (origin: string, destination: string) => void;
  onFilterSeason?: (season: SeasonRange) => void;
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-4 border-0 shadow-sm bg-card">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))] shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * List with progressive "Ver mais" pagination (10 per page).
 * Each row is clickable when onItemClick is provided.
 */
function PaginatedList({
  title,
  icon: Icon,
  items,
  unit,
  onItemClick,
  renderLabel,
}: {
  title: string;
  icon: any;
  items: { key: string; label: string; value: number; raw?: any }[];
  unit: string;
  onItemClick?: (item: { key: string; label: string; value: number; raw?: any }) => void;
  renderLabel?: (item: { key: string; label: string; value: number; raw?: any }) => React.ReactNode;
}) {
  const [visible, setVisible] = useState(10);
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.value - a.value),
    [items]
  );
  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  return (
    <Card className="p-4 border-0 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-[hsl(var(--section-flights))]" />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {sorted.length}
        </Badge>
      </div>
      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {shown.map((item) => {
              const content = (
                <>
                  <span className="truncate text-sm font-medium text-foreground">
                    {renderLabel ? renderLabel(item) : item.label}
                  </span>
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-sky-100 text-foreground hover:bg-sky-100"
                  >
                    {item.value.toLocaleString("pt-BR")} {unit}
                  </Badge>
                </>
              );
              return (
                <li key={item.key}>
                  {onItemClick ? (
                    <button
                      onClick={() => onItemClick(item)}
                      className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sky-100 transition-colors text-left"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => setVisible((v) => v + 10)}
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1" />
              Ver mais ({sorted.length - visible} restantes)
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

export function BlockDashboard({
  blocks,
  getCityLabel,
  onFilterAirline,
  onFilterOperator,
  onFilterOrigin,
  onFilterDestination,
  onFilterRoute,
  onFilterSeason,
}: BlockDashboardProps) {
  const stats = useMemo(() => {
    const total = blocks.length;
    const totalSeats = blocks.reduce(
      (sum, b) => sum + (b.seats_available || 0),
      0
    );

    const sumSeatsBy = (key: "destination" | "origin" | "airline") => {
      const map = new Map<string, number>();
      blocks.forEach((b) => {
        const k = (b as any)[key];
        if (!k) return;
        map.set(k, (map.get(k) || 0) + (b.seats_available || 0));
      });
      return map;
    };

    const countBy = (key: "operator") => {
      const map = new Map<string, number>();
      blocks.forEach((b) => {
        const k = (b as any)[key];
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
      });
      return map;
    };

    const seatsByDest = sumSeatsBy("destination");
    const seatsByOrigin = sumSeatsBy("origin");
    const seatsByAirline = sumSeatsBy("airline");
    const blocksByOperator = countBy("operator");

    // Routes
    const routeMap = new Map<string, { origin: string; destination: string; count: number }>();
    blocks.forEach((b) => {
      if (!b.origin || !b.destination) return;
      const key = `${b.origin}→${b.destination}`;
      const cur = routeMap.get(key);
      if (cur) cur.count += 1;
      else routeMap.set(key, { origin: b.origin, destination: b.destination, count: 1 });
    });
    const topRoutes = Array.from(routeMap.entries())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Seasons
    const seasonStats = STRATEGIC_SEASONS.map((s) => {
      const matching = blocks.filter(
        (b) => b.departure_date && isInSeason(b.departure_date, s)
      );
      const seats = matching.reduce(
        (sum, b) => sum + (b.seats_available || 0),
        0
      );
      return {
        season: s,
        blocks: matching.length,
        seats,
      };
    }).filter((s) => s.blocks > 0);

    return {
      total,
      totalSeats,
      seatsByDest,
      seatsByOrigin,
      seatsByAirline,
      blocksByOperator,
      topRoutes,
      seasonStats,
    };
  }, [blocks]);

  if (blocks.length === 0) return null;

  const destItems = Array.from(stats.seatsByDest.entries()).map(([k, v]) => ({
    key: k,
    label: getCityLabel(k),
    value: v,
  }));
  const originItems = Array.from(stats.seatsByOrigin.entries()).map(([k, v]) => ({
    key: k,
    label: getCityLabel(k),
    value: v,
  }));
  const airlineItems = Array.from(stats.seatsByAirline.entries()).map(([k, v]) => ({
    key: k,
    label: k,
    value: v,
  }));
  const operatorItems = Array.from(stats.blocksByOperator.entries()).map(([k, v]) => ({
    key: k,
    label: k,
    value: v,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <KpiCard icon={Plane} label="Total de bloqueios" value={stats.total} />
        <KpiCard
          icon={Users}
          label="Total de lugares disponíveis"
          value={stats.totalSeats.toLocaleString("pt-BR")}
        />
      </div>

      {/* Companhias e Operadoras (visão completa) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PaginatedList
          title="Lugares por companhia aérea"
          icon={Building2}
          items={airlineItems}
          unit="lugares"
          onItemClick={
            onFilterAirline
              ? (item) => onFilterAirline(item.key)
              : undefined
          }
        />
        <PaginatedList
          title="Bloqueios por operadora"
          icon={Award}
          items={operatorItems}
          unit="bloqueios"
          onItemClick={
            onFilterOperator
              ? (item) => onFilterOperator(item.key)
              : undefined
          }
        />
      </div>

      {/* Destinos e Origens (visão completa, paginada) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PaginatedList
          title="Lugares por destino"
          icon={TrendingUp}
          items={destItems}
          unit="lugares"
          onItemClick={
            onFilterDestination
              ? (item) => onFilterDestination(item.key)
              : undefined
          }
        />
        <PaginatedList
          title="Lugares por origem"
          icon={Plane}
          items={originItems}
          unit="lugares"
          onItemClick={
            onFilterOrigin ? (item) => onFilterOrigin(item.key) : undefined
          }
        />
      </div>

      {/* Rotas mais frequentes (top 10) e Temporadas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Rotas mais frequentes</h3>
            <Badge variant="secondary" className="ml-auto text-xs">
              {stats.topRoutes.length}
            </Badge>
          </div>
          {stats.topRoutes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados.</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.topRoutes.map((r) => {
                const content = (
                  <>
                    <span className="truncate text-sm font-medium text-foreground">
                      {getCityLabel(r.origin)} → {getCityLabel(r.destination)}
                    </span>
                    <Badge variant="secondary" className="shrink-0 bg-sky-100 text-foreground hover:bg-sky-100">
                      {r.count} {r.count === 1 ? "bloqueio" : "bloqueios"}
                    </Badge>
                  </>
                );
                return (
                  <li key={r.key}>
                    {onFilterRoute ? (
                      <button
                        onClick={() => onFilterRoute(r.origin, r.destination)}
                        className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sky-100 transition-colors text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Bloqueios por período estratégico</h3>
            <Badge variant="secondary" className="ml-auto text-xs">
              {stats.seasonStats.length}
            </Badge>
          </div>
          {stats.seasonStats.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum bloqueio em períodos estratégicos.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {stats.seasonStats.map((s) => {
                const content = (
                  <>
                    <span className="truncate text-sm font-medium text-foreground">
                      {s.season.label}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs text-foreground hover:bg-secondary">
                        {s.blocks} {s.blocks === 1 ? "bloqueio" : "bloqueios"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-sky-100 text-foreground hover:bg-sky-100"
                      >
                        {s.seats} lugares
                      </Badge>
                    </div>
                  </>
                );
                return (
                  <li key={s.season.key}>
                    {onFilterSeason ? (
                      <button
                        onClick={() => onFilterSeason(s.season)}
                        className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-sky-100 transition-colors text-left"
                      >
                        {content}
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}