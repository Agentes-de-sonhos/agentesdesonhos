import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plane,
  Users,
  MapPin,
  Building2,
  Award,
  TrendingUp,
  Lightbulb,
  Flame,
  AlertTriangle,
  Route,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AirBlock {
  id: string;
  origin: string;
  destination: string;
  airline: string | null;
  operator: string | null;
  departure_date: string;
  seats_available: number | null;
}

interface BlockDashboardProps {
  blocks: AirBlock[];
  getCityLabel: (code: string) => string;
}

const COLORS = [
  "hsl(var(--section-flights))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-4 border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-[hsl(var(--section-flights))]/10 text-[hsl(var(--section-flights))] shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
          {hint && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function BlockDashboard({ blocks, getCityLabel }: BlockDashboardProps) {
  const stats = useMemo(() => {
    const total = blocks.length;
    const totalSeats = blocks.reduce(
      (sum, b) => sum + (b.seats_available || 0),
      0
    );
    const destinations = new Set(blocks.map((b) => b.destination).filter(Boolean));
    const origins = new Set(blocks.map((b) => b.origin).filter(Boolean));

    const countBy = (key: "airline" | "operator" | "destination" | "origin") => {
      const map = new Map<string, number>();
      blocks.forEach((b) => {
        const k = (b as any)[key];
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
      });
      return map;
    };

    const sumSeatsBy = (key: "destination" | "origin" | "airline") => {
      const map = new Map<string, number>();
      blocks.forEach((b) => {
        const k = (b as any)[key];
        if (!k) return;
        map.set(k, (map.get(k) || 0) + (b.seats_available || 0));
      });
      return map;
    };

    const airlineCount = countBy("airline");
    const operatorCount = countBy("operator");
    const seatsByDest = sumSeatsBy("destination");
    const seatsByOrigin = sumSeatsBy("origin");
    const seatsByAirline = sumSeatsBy("airline");

    const topEntry = (m: Map<string, number>) => {
      let best: [string, number] | null = null;
      m.forEach((v, k) => {
        if (!best || v > best[1]) best = [k, v];
      });
      return best;
    };

    const topAirline = topEntry(airlineCount);
    const topOperator = topEntry(operatorCount);

    // Charts data (top N)
    const toChartData = (m: Map<string, number>, n = 8, transformLabel?: (k: string) => string) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, value]) => ({
          name: transformLabel ? transformLabel(name) : name,
          value,
        }));

    const destChart = toChartData(seatsByDest, 8);
    const originChart = toChartData(seatsByOrigin, 8);
    const airlineChart = toChartData(seatsByAirline, 6);

    // Timeline by date
    const dateMap = new Map<string, number>();
    blocks.forEach((b) => {
      if (!b.departure_date) return;
      dateMap.set(b.departure_date, (dateMap.get(b.departure_date) || 0) + 1);
    });
    const timeline = Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => {
        const [y, m, d] = date.split("-");
        return { date: `${d}/${m}`, fullDate: date, voos: count };
      });

    // Peak window detection (largest 10-day rolling window)
    let peakLabel: string | null = null;
    if (timeline.length > 1) {
      const dates = Array.from(dateMap.entries()).sort((a, b) =>
        a[0].localeCompare(b[0])
      );
      let bestStart = 0;
      let bestEnd = 0;
      let bestSum = 0;
      for (let i = 0; i < dates.length; i++) {
        const startDate = new Date(dates[i][0]);
        let sum = 0;
        let endIdx = i;
        for (let j = i; j < dates.length; j++) {
          const cur = new Date(dates[j][0]);
          const diffDays =
            (cur.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 10) break;
          sum += dates[j][1];
          endIdx = j;
        }
        if (sum > bestSum) {
          bestSum = sum;
          bestStart = i;
          bestEnd = endIdx;
        }
      }
      if (bestSum > 0 && dates[bestStart] && dates[bestEnd]) {
        const fmt = (s: string) => {
          const [y, m, d] = s.split("-");
          return `${d}/${m}`;
        };
        peakLabel = `${fmt(dates[bestStart][0])} a ${fmt(dates[bestEnd][0])}`;
      }
    }

    // Routes (origin -> destination)
    const routeMap = new Map<string, number>();
    blocks.forEach((b) => {
      if (!b.origin || !b.destination) return;
      const key = `${b.origin}→${b.destination}`;
      routeMap.set(key, (routeMap.get(key) || 0) + 1);
    });
    const topRoutes = Array.from(routeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // High availability blocks (top by seats)
    const highAvail = [...blocks]
      .filter((b) => (b.seats_available || 0) >= 10)
      .sort((a, b) => (b.seats_available || 0) - (a.seats_available || 0))
      .slice(0, 5);

    // Last seats (low availability)
    const lastSeats = [...blocks]
      .filter((b) => (b.seats_available || 0) > 0 && (b.seats_available || 0) <= 3)
      .sort((a, b) => (a.seats_available || 0) - (b.seats_available || 0))
      .slice(0, 5);

    // Insights
    const insights: string[] = [];
    const topDestSeats = Array.from(seatsByDest.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (topDestSeats) {
      insights.push(
        `${topDestSeats[0]} é o destino com maior número de lugares disponíveis (${topDestSeats[1]} lugares).`
      );
    }
    if (topAirline && total > 0) {
      const pct = Math.round((topAirline[1] / total) * 100);
      insights.push(`${topAirline[0]} concentra ${pct}% dos bloqueios.`);
    }
    const topOriginSeats = Array.from(seatsByOrigin.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];
    if (topOriginSeats) {
      insights.push(
        `${topOriginSeats[0]} é a principal origem dos voos (${topOriginSeats[1]} lugares).`
      );
    }
    if (peakLabel) {
      insights.push(`Maior concentração de saídas entre ${peakLabel}.`);
    }
    if (topRoutes[0]) {
      insights.push(
        `Rota mais frequente: ${topRoutes[0][0]} (${topRoutes[0][1]} bloqueios).`
      );
    }

    return {
      total,
      totalSeats,
      destinationsCount: destinations.size,
      originsCount: origins.size,
      topAirline,
      topOperator,
      destChart,
      originChart,
      airlineChart,
      timeline,
      topRoutes,
      highAvail,
      lastSeats,
      insights,
    };
  }, [blocks]);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={Plane} label="Bloqueios" value={stats.total} />
        <KpiCard
          icon={Users}
          label="Lugares disponíveis"
          value={stats.totalSeats.toLocaleString("pt-BR")}
        />
        <KpiCard icon={MapPin} label="Destinos únicos" value={stats.destinationsCount} />
        <KpiCard icon={Route} label="Origens únicas" value={stats.originsCount} />
        <KpiCard
          icon={Building2}
          label="Top companhia"
          value={stats.topAirline?.[0] || "—"}
          hint={stats.topAirline ? `${stats.topAirline[1]} bloqueios` : undefined}
        />
        <KpiCard
          icon={Award}
          label="Top operadora"
          value={stats.topOperator?.[0] || "—"}
          hint={stats.topOperator ? `${stats.topOperator[1]} bloqueios` : undefined}
        />
      </div>

      {/* Insights */}
      {stats.insights.length > 0 && (
        <Card className="p-4 border-0 shadow-sm bg-gradient-to-br from-[hsl(var(--section-flights))]/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-2">Insights automáticos</p>
              <ul className="space-y-1.5">
                {stats.insights.map((insight, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-[hsl(var(--section-flights))] mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Lugares por destino (top 8)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.destChart} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} />
              <YAxis dataKey="name" type="category" fontSize={11} width={50} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="hsl(var(--section-flights))"
                radius={[0, 4, 4, 0]}
                name="Lugares"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Lugares por origem (top 8)</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.originChart} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis type="number" fontSize={11} />
              <YAxis dataKey="name" type="category" fontSize={11} width={50} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                name="Lugares"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Distribuição por companhia</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.airlineChart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}`}
                labelLine={false}
                fontSize={11}
              >
                {stats.airlineChart.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Concentração de saídas por data</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.timeline}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="voos"
                stroke="hsl(var(--section-flights))"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Voos"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Commercial highlights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Alta disponibilidade</h3>
          </div>
          {stats.highAvail.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum voo com 10+ lugares.</p>
          ) : (
            <ul className="space-y-2">
              {stats.highAvail.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium">{b.origin}→{b.destination}</span>
                    {b.airline && (
                      <span className="text-muted-foreground"> · {b.airline}</span>
                    )}
                  </span>
                  <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-0 shrink-0">
                    {b.seats_available} lugares
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">Últimos lugares</h3>
          </div>
          {stats.lastSeats.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem voos com baixa disponibilidade.</p>
          ) : (
            <ul className="space-y-2">
              {stats.lastSeats.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium">{b.origin}→{b.destination}</span>
                    {b.airline && (
                      <span className="text-muted-foreground"> · {b.airline}</span>
                    )}
                  </span>
                  <Badge variant="destructive" className="shrink-0">
                    {b.seats_available} {b.seats_available === 1 ? "lugar" : "lugares"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 border-0 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Route className="h-4 w-4 text-[hsl(var(--section-flights))]" />
            <h3 className="text-sm font-semibold">Rotas mais frequentes</h3>
          </div>
          {stats.topRoutes.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topRoutes.map(([route, count]) => (
                <li
                  key={route}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium truncate">{route}</span>
                  <Badge variant="secondary" className="shrink-0">
                    {count} {count === 1 ? "voo" : "voos"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}