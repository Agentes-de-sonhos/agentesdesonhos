import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, ExternalLink, Copy, Eye, EyeOff, Search, ShieldAlert, TrendingUp, TrendingDown, Minus, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { buildRoteiroLink } from "@/lib/roteiro-domain";
import { buildOrcamentoLink } from "@/lib/orcamento-domain";
import { buildCarteiraLink } from "@/lib/carteira-domain";
import { useAgencyDomainsMap } from "@/hooks/useAgencyCustomDomain";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, subMonths, differenceInDays, addDays, addHours, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACCESS_PASSWORD = "@Univers44l!";

type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "this_year" | "custom";
const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
  { key: "this_year", label: "Este ano" },
  { key: "custom", label: "Personalizado" },
];

function getRange(p: PeriodKey, cs?: string, ce?: string): { start: Date; end: Date } {
  const now = new Date();
  switch (p) {
    case "today": return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday": { const y = subDays(now, 1); return { start: startOfDay(y), end: endOfDay(y) }; }
    case "7d": return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case "30d": return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case "this_month": return { start: startOfMonth(now), end: endOfDay(now) };
    case "last_month": { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    case "this_year": return { start: startOfYear(now), end: endOfDay(now) };
    case "custom": {
      if (cs && ce) {
        const [sy, sm, sd] = cs.split("-").map(Number);
        const [ey, em, ed] = ce.split("-").map(Number);
        return { start: new Date(sy, sm - 1, sd, 0, 0, 0, 0), end: new Date(ey, em - 1, ed, 23, 59, 59, 999) };
      }
      return { start: startOfDay(now), end: endOfDay(now) };
    }
  }
}

function previousRange(r: { start: Date; end: Date }): { start: Date; end: Date } {
  const ms = r.end.getTime() - r.start.getTime();
  return { start: new Date(r.start.getTime() - ms - 1), end: new Date(r.start.getTime() - 1) };
}

type Granularity = "hour" | "day" | "month";
function pickGranularity(p: PeriodKey, r: { start: Date; end: Date }): Granularity {
  if (p === "today" || p === "yesterday") return "hour";
  if (p === "this_year") return "month";
  const days = differenceInDays(r.end, r.start);
  if (days <= 1) return "hour";
  if (days <= 92) return "day";
  return "month";
}

function buildBuckets(r: { start: Date; end: Date }, g: Granularity): Date[] {
  const buckets: Date[] = [];
  if (g === "hour") {
    let d = new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate(), r.start.getHours(), 0, 0, 0);
    while (d <= r.end) { buckets.push(new Date(d)); d = addHours(d, 1); }
  } else if (g === "day") {
    let d = startOfDay(r.start);
    while (d <= r.end) { buckets.push(new Date(d)); d = addDays(d, 1); }
  } else {
    let d = startOfMonth(r.start);
    while (d <= r.end) { buckets.push(new Date(d)); d = addMonths(d, 1); }
  }
  return buckets;
}

function bucketKey(d: Date, g: Granularity): string {
  if (g === "hour") return format(d, "yyyy-MM-dd HH");
  if (g === "day") return format(d, "yyyy-MM-dd");
  return format(d, "yyyy-MM");
}
function bucketLabel(d: Date, g: Granularity): string {
  if (g === "hour") return format(d, "HH'h'");
  if (g === "day") return format(d, "dd/MM");
  return format(d, "MMM/yy", { locale: ptBR });
}
function inRange(iso: string, r: { start: Date; end: Date }): boolean {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t <= r.end.getTime();
}

const PAGE_SIZE = 25;
const RANK_PAGE_SIZES = [25, 50, 100];

type AgencyRankRow = {
  agency_id: string;
  agency_name: string | null;
  owner_name: string | null;
  owner_email: string | null;
  quotes: number;
  trips: number;
  itineraries: number;
  opportunities: number;
  operations: number;
  sales: number;
  clients: number;
};

type RankSortCol = "quotes" | "trips" | "itineraries" | "projects" | "opportunities" | "operations" | "sales" | "clients" | "total";

type TripRow = {
  id: string; user_id: string; client_name: string; trip_title: string | null;
  destination: string; start_date: string; end_date: string; status: string;
  public_access_code: string | null; access_password: string | null;
  is_locked: boolean; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};
type QuoteRow = {
  id: string; user_id: string; client_name: string; destination: string;
  start_date: string; end_date: string; status: string; public_access_code: string | null;
  total_amount: number; currency: string; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};
type ItineraryRow = {
  id: string; user_id: string; destination: string; start_date: string;
  end_date: string; status: string; public_access_code: string | null;
  travelers_count: number; trip_type: string; created_at: string; updated_at: string;
  owner_name: string | null; owner_agency: string | null;
};

function copy(text: string, label = "Copiado") {
  navigator.clipboard.writeText(text);
  toast.success(label);
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("pt-BR");
}

function fmtDateTime(iso: string) {
  if (!iso) return "—";
  try { return format(new Date(iso), "dd/MM/yy HH:mm"); } catch { return "—"; }
}

function pctDelta(now: number, prev: number): { pct: number | null; dir: "up"|"down"|"flat" } {
  if (prev === 0) {
    if (now === 0) return { pct: 0, dir: "flat" };
    return { pct: null, dir: "up" };
  }
  const pct = ((now - prev) / prev) * 100;
  return { pct, dir: pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat" };
}

function KpiCard({ title, value, prev, accent }: { title: string; value: number; prev: number; accent: string }) {
  const d = pctDelta(value, prev);
  const Icon = d.dir === "up" ? TrendingUp : d.dir === "down" ? TrendingDown : Minus;
  const color = d.dir === "up" ? "text-emerald-600" : d.dir === "down" ? "text-red-600" : "text-muted-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
        <div className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <div className="mt-2 text-3xl font-display font-bold">{value.toLocaleString("pt-BR")}</div>
      <div className={`mt-1 flex items-center gap-1 text-xs ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>
          {d.pct === null ? "novo" : `${d.pct > 0 ? "+" : ""}${d.pct.toFixed(1)}%`}
          <span className="text-muted-foreground"> vs período anterior ({prev})</span>
        </span>
      </div>
    </Card>
  );
}

function SortHead({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc"|"desc"; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
      {active && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(page, totalPages);
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
      <div>Mostrando {(p - 1) * PAGE_SIZE + 1}–{Math.min(p * PAGE_SIZE, total)} de {total}</div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={p === 1} onClick={() => onPage(p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>Página {p} de {totalPages}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={p === totalPages} onClick={() => onPage(p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function matches(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const lower = q.toLowerCase();
  return fields.some((f) => (f || "").toLowerCase().includes(lower));
}

export function AdminUserProjectsManager() {
  const domainsByOwner = useAgencyDomainsMap();
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customStart, setCustomStart] = useState<string>(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [seriesEnabled, setSeriesEnabled] = useState({ quotes: true, trips: true, itineraries: true });
  const [sort, setSort] = useState<{ tab: "trips"|"quotes"|"itineraries"; col: string; dir: "asc"|"desc" }>({ tab: "quotes", col: "created_at", dir: "desc" });
  const [page, setPage] = useState<Record<string, number>>({ trips: 1, quotes: 1, itineraries: 1 });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-user-projects"],
    enabled: unlocked,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_user_projects");
      if (error) throw error;
      return data as { trips: TripRow[]; quotes: QuoteRow[]; itineraries: ItineraryRow[] };
    },
  });

  const range = useMemo(() => getRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const prevRange = useMemo(() => previousRange(range), [range]);
  const gran = useMemo(() => pickGranularity(period, range), [period, range]);

  const rawTrips = data?.trips || [];
  const rawQuotes = data?.quotes || [];
  const rawItins = data?.itineraries || [];

  // Period-filtered
  const pTrips = useMemo(() => rawTrips.filter((t) => inRange(t.created_at, range)), [rawTrips, range]);
  const pQuotes = useMemo(() => rawQuotes.filter((q) => inRange(q.created_at, range)), [rawQuotes, range]);
  const pItins = useMemo(() => rawItins.filter((i) => inRange(i.created_at, range)), [rawItins, range]);

  const prevCount = {
    quotes: rawQuotes.filter((q) => inRange(q.created_at, prevRange)).length,
    trips: rawTrips.filter((t) => inRange(t.created_at, prevRange)).length,
    itineraries: rawItins.filter((i) => inRange(i.created_at, prevRange)).length,
  };

  // Search + sort helpers
  const sortRows = <T extends Record<string, any>>(rows: T[], tab: string): T[] => {
    if (sort.tab !== tab) return [...rows].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    const { col, dir } = sort;
    return [...rows].sort((a, b) => {
      const av = a[col] ?? ""; const bv = b[col] ?? "";
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === "asc" ? cmp : -cmp;
    });
  };

  const trips = useMemo(() => sortRows(
    pTrips.filter((t) => matches(search, t.client_name, t.trip_title, t.destination, t.owner_name, t.owner_agency, t.public_access_code)),
    "trips"
  ), [pTrips, search, sort]);
  const quotes = useMemo(() => sortRows(
    pQuotes.filter((q) => matches(search, q.client_name, q.destination, q.owner_name, q.owner_agency, q.public_access_code)),
    "quotes"
  ), [pQuotes, search, sort]);
  const itineraries = useMemo(() => sortRows(
    pItins.filter((i) => matches(search, i.destination, i.owner_name, i.owner_agency, i.public_access_code, i.trip_type)),
    "itineraries"
  ), [pItins, search, sort]);

  // Chart series
  const chartData = useMemo(() => {
    const buckets = buildBuckets(range, gran);
    const map = new Map<string, { key: string; label: string; quotes: number; trips: number; itineraries: number }>();
    buckets.forEach((d) => {
      const k = bucketKey(d, gran);
      map.set(k, { key: k, label: bucketLabel(d, gran), quotes: 0, trips: 0, itineraries: 0 });
    });
    const bump = (iso: string, field: "quotes"|"trips"|"itineraries") => {
      const d = new Date(iso);
      const k = bucketKey(d, gran);
      const entry = map.get(k);
      if (entry) entry[field] += 1;
    };
    pQuotes.forEach((q) => bump(q.created_at, "quotes"));
    pTrips.forEach((t) => bump(t.created_at, "trips"));
    pItins.forEach((i) => bump(i.created_at, "itineraries"));
    return Array.from(map.values());
  }, [pQuotes, pTrips, pItins, range, gran]);

  const pieData = useMemo(() => ([
    { name: "Orçamentos", value: pQuotes.length, color: "hsl(217 91% 60%)" },
    { name: "Carteiras Digitais", value: pTrips.length, color: "hsl(280 65% 60%)" },
    { name: "Roteiros", value: pItins.length, color: "hsl(160 60% 45%)" },
  ]), [pQuotes.length, pTrips.length, pItins.length]);

  // ============= Ranking de Agências por Atividade =============
  const rangeStartISO = range.start.toISOString();
  const rangeEndISO = range.end.toISOString();
  const rankQuery = useQuery({
    queryKey: ["admin-agency-ranking", rangeStartISO, rangeEndISO],
    enabled: unlocked,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_agency_activity_ranking" as any, {
        _start: rangeStartISO,
        _end: rangeEndISO,
      });
      if (error) throw error;
      return ((data as any)?.agencies || []) as AgencyRankRow[];
    },
  });
  const [rankSort, setRankSort] = useState<{ col: RankSortCol; dir: "asc"|"desc" }>({ col: "projects", dir: "desc" });
  const [rankPage, setRankPage] = useState(1);
  const [rankPageSize, setRankPageSize] = useState(25);
  const [rankSearch, setRankSearch] = useState("");

  const rankRows = useMemo(() => {
    const rows = (rankQuery.data || []).map((r) => ({
      ...r,
      projects: r.quotes + r.trips + r.itineraries,
      total: r.quotes + r.trips + r.itineraries + r.opportunities + r.operations + r.sales + r.clients,
    }));
    const filtered = rankSearch
      ? rows.filter((r) => matches(rankSearch, r.agency_name, r.owner_name, r.owner_email))
      : rows;
    const primary = rankSort.col;
    const dirMul = rankSort.dir === "asc" ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      const av = a[primary] as number;
      const bv = b[primary] as number;
      if (av !== bv) return (av - bv) * dirMul;
      // Tiebreakers
      if (primary !== "projects" && a.projects !== b.projects) return (b.projects - a.projects);
      if (a.total !== b.total) return (b.total - a.total);
      if (primary === "projects" && a.sales !== b.sales) return (b.sales - a.sales);
      return (a.agency_name || "").localeCompare(b.agency_name || "", "pt-BR");
    });
    return filtered;
  }, [rankQuery.data, rankSort, rankSearch]);

  const rankTotals = useMemo(() => {
    const rows = rankQuery.data || [];
    return {
      agencies: rows.length,
      quotes: rows.reduce((s, r) => s + r.quotes, 0),
      trips: rows.reduce((s, r) => s + r.trips, 0),
      itineraries: rows.reduce((s, r) => s + r.itineraries, 0),
      opportunities: rows.reduce((s, r) => s + r.opportunities, 0),
      operations: rows.reduce((s, r) => s + r.operations, 0),
      sales: rows.reduce((s, r) => s + r.sales, 0),
      clients: rows.reduce((s, r) => s + r.clients, 0),
    };
  }, [rankQuery.data]);
  const rankTotalProjects = rankTotals.quotes + rankTotals.trips + rankTotals.itineraries;
  const rankTotalActivity = rankTotalProjects + rankTotals.opportunities + rankTotals.operations + rankTotals.sales + rankTotals.clients;

  const toggleRankSort = (col: RankSortCol) => {
    setRankSort((s) => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });
    setRankPage(1);
  };
  const currentPeriodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label
    + (period === "custom" ? ` (${customStart} → ${customEnd})` : "");
  const rankPageSizeInt = rankPageSize;
  const rankTotalPages = Math.max(1, Math.ceil(rankRows.length / rankPageSizeInt));
  const rankPageSafe = Math.min(rankPage, rankTotalPages);
  const rankPageRows = rankRows.slice((rankPageSafe - 1) * rankPageSizeInt, rankPageSafe * rankPageSizeInt);

  const toggleSort = (tab: "trips"|"quotes"|"itineraries", col: string) => {
    setSort((s) => s.tab === tab && s.col === col
      ? { tab, col, dir: s.dir === "asc" ? "desc" : "asc" }
      : { tab, col, dir: "desc" });
  };

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 max-w-md w-full space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold">Área Restrita</h2>
              <p className="text-sm text-muted-foreground">Informe a senha para visualizar os projetos dos usuários.</p>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pwd === ACCESS_PASSWORD) {
                setUnlocked(true);
              } else {
                toast.error("Senha incorreta");
                setPwd("");
              }
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Senha de acesso"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full gap-2">
              <Lock className="h-4 w-4" /> Desbloquear
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, destino, agência, código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="secondary">
            {(data?.trips.length || 0) + (data?.quotes.length || 0) + (data?.itineraries.length || 0)} projetos
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setUnlocked(false)}>
            Bloquear
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive/40 text-destructive text-sm">
          Erro ao carregar: {(error as Error).message}
        </Card>
      )}

      {/* Period filter */}
      <Card className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="text-sm font-medium text-muted-foreground">Período:</div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2 items-center ml-auto">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
            <span className="text-muted-foreground">até</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
          </div>
        )}
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Total de Projetos" value={pQuotes.length + pTrips.length + pItins.length}
          prev={prevCount.quotes + prevCount.trips + prevCount.itineraries} accent="hsl(217 91% 60%)" />
        <KpiCard title="Orçamentos" value={pQuotes.length} prev={prevCount.quotes} accent="hsl(217 91% 60%)" />
        <KpiCard title="Carteiras Digitais" value={pTrips.length} prev={prevCount.trips} accent="hsl(280 65% 60%)" />
        <KpiCard title="Roteiros" value={pItins.length} prev={prevCount.itineraries} accent="hsl(160 60% 45%)" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display font-semibold">Evolução da criação</h3>
              <p className="text-xs text-muted-foreground">Granularidade: {gran === "hour" ? "por hora" : gran === "day" ? "por dia" : "por mês"}</p>
            </div>
            <div className="flex gap-2 text-xs">
              {(["quotes","trips","itineraries"] as const).map((k) => {
                const label = k === "quotes" ? "Orçamentos" : k === "trips" ? "Carteiras" : "Roteiros";
                const color = k === "quotes" ? "hsl(217 91% 60%)" : k === "trips" ? "hsl(280 65% 60%)" : "hsl(160 60% 45%)";
                const active = seriesEnabled[k];
                return (
                  <button
                    key={k}
                    onClick={() => setSeriesEnabled((s) => ({ ...s, [k]: !s[k] }))}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded border transition ${active ? "bg-muted" : "opacity-40"}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <RTooltip />
                {seriesEnabled.quotes && <Line type="monotone" dataKey="quotes" name="Orçamentos" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />}
                {seriesEnabled.trips && <Line type="monotone" dataKey="trips" name="Carteiras" stroke="hsl(280 65% 60%)" strokeWidth={2} dot={false} />}
                {seriesEnabled.itineraries && <Line type="monotone" dataKey="itineraries" name="Roteiros" stroke="hsl(160 60% 45%)" strokeWidth={2} dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-display font-semibold mb-3">Distribuição por tipo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ranking de Agências por Atividade */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold">Ranking de Agências por Atividade</h3>
            <p className="text-xs text-muted-foreground">
              Período: <span className="font-medium text-foreground">{currentPeriodLabel}</span>
              {" · "}Ordenado por{" "}
              <span className="font-medium text-foreground">
                {({ quotes: "Orçamentos", trips: "Carteiras", itineraries: "Roteiros", projects: "Total de Projetos", opportunities: "Oportunidades", operations: "Operações", sales: "Vendas", clients: "Clientes", total: "Total Geral" } as Record<RankSortCol,string>)[rankSort.col]}
              </span>
              {" "}({rankSort.dir === "asc" ? "crescente" : "decrescente"})
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar agência…"
              value={rankSearch}
              onChange={(e) => { setRankSearch(e.target.value); setRankPage(1); }}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Resumo consolidado */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2 text-center">
          {[
            { l: "Agências ativas", v: rankTotals.agencies, c: "text-primary" },
            { l: "Orçamentos", v: rankTotals.quotes },
            { l: "Carteiras", v: rankTotals.trips },
            { l: "Roteiros", v: rankTotals.itineraries },
            { l: "Total Projetos", v: rankTotalProjects, c: "text-emerald-600" },
            { l: "Oportunidades", v: rankTotals.opportunities },
            { l: "Operações", v: rankTotals.operations },
            { l: "Vendas", v: rankTotals.sales },
            { l: "Total Geral", v: rankTotalActivity, c: "text-fuchsia-600 font-semibold" },
          ].map((k) => (
            <div key={k.l} className="rounded-md border bg-muted/30 py-2 px-1">
              <div className={`text-lg font-display font-bold ${k.c || ""}`}>{k.v.toLocaleString("pt-BR")}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.l}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div className="rounded-md border overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10 border-b">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left px-3 py-2 w-14">#</th>
                <th className="text-left px-3 py-2 min-w-[200px]">Agência</th>
                {([
                  ["quotes","Orçamentos"],
                  ["trips","Carteiras"],
                  ["itineraries","Roteiros"],
                  ["projects","Total Projetos"],
                  ["opportunities","Oportunidades"],
                  ["operations","Operações"],
                  ["sales","Vendas"],
                  ["clients","Clientes"],
                  ["total","Total Geral"],
                ] as [RankSortCol, string][]).map(([col, label]) => {
                  const active = rankSort.col === col;
                  return (
                    <th key={col} className={`text-right px-3 py-2 whitespace-nowrap ${active ? "bg-muted text-foreground" : ""}`}>
                      <button onClick={() => toggleRankSort(col)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {label}
                        <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
                        {active && <span className="text-[10px]">{rankSort.dir === "asc" ? "↑" : "↓"}</span>}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rankQuery.isLoading && (
                <tr><td colSpan={11} className="text-center text-muted-foreground py-8">Carregando ranking…</td></tr>
              )}
              {rankQuery.error && !rankQuery.isLoading && (
                <tr><td colSpan={11} className="text-center text-destructive py-8">Erro ao carregar ranking: {(rankQuery.error as Error).message}</td></tr>
              )}
              {!rankQuery.isLoading && !rankQuery.error && rankRows.length === 0 && (
                <tr><td colSpan={11} className="text-center text-muted-foreground py-8">Nenhuma atividade encontrada no período selecionado.</td></tr>
              )}
              {!rankQuery.isLoading && rankPageRows.map((r, idx) => {
                const absolutePos = (rankPageSafe - 1) * rankPageSizeInt + idx + 1;
                const medal = absolutePos === 1 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300"
                  : absolutePos === 2 ? "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-200"
                  : absolutePos === 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  : "";
                const projects = r.quotes + r.trips + r.itineraries;
                const total = projects + r.opportunities + r.operations + r.sales + r.clients;
                const cellCls = (col: RankSortCol) => `text-right px-3 py-2 tabular-nums ${rankSort.col === col ? "bg-muted/40 font-medium" : ""}`;
                return (
                  <tr key={r.agency_id} className="border-b hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${medal || "text-muted-foreground"}`}>
                        {absolutePos}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.agency_name || r.owner_name || "—"}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[280px]">
                        {[r.owner_name, r.owner_email].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td className={cellCls("quotes")}>{r.quotes}</td>
                    <td className={cellCls("trips")}>{r.trips}</td>
                    <td className={cellCls("itineraries")}>{r.itineraries}</td>
                    <td className={cellCls("projects") + " text-emerald-700 dark:text-emerald-400"}>{projects}</td>
                    <td className={cellCls("opportunities")}>{r.opportunities}</td>
                    <td className={cellCls("operations")}>{r.operations}</td>
                    <td className={cellCls("sales")}>{r.sales}</td>
                    <td className={cellCls("clients")}>{r.clients}</td>
                    <td className={cellCls("total") + " text-fuchsia-700 dark:text-fuchsia-400 font-semibold"}>{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {rankRows.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Registros por página:</span>
              <Select value={String(rankPageSize)} onValueChange={(v) => { setRankPageSize(Number(v)); setRankPage(1); }}>
                <SelectTrigger className="h-7 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RANK_PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <span>
                {rankRows.length > 0 ? (rankPageSafe - 1) * rankPageSizeInt + 1 : 0}–{Math.min(rankPageSafe * rankPageSizeInt, rankRows.length)} de {rankRows.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={rankPageSafe === 1} onClick={() => setRankPage(rankPageSafe - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Página {rankPageSafe} de {rankTotalPages}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" disabled={rankPageSafe === rankTotalPages} onClick={() => setRankPage(rankPageSafe + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes">
            Orçamentos ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="trips">
            Carteiras Digitais ({trips.length})
          </TabsTrigger>
          <TabsTrigger value="itineraries">
            Roteiros ({itineraries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / Título</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><SortHead label="Criado em" active={sort.tab==="trips"&&sort.col==="created_at"} dir={sort.dir} onClick={() => toggleSort("trips","created_at")} /></TableHead>
                  <TableHead><SortHead label="Atualizado" active={sort.tab==="trips"&&sort.col==="updated_at"} dir={sort.dir} onClick={() => toggleSort("trips","updated_at")} /></TableHead>
                  <TableHead>Senha</TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && trips.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma carteira encontrada</TableCell></TableRow>
                )}
                {trips.slice((page.trips - 1) * PAGE_SIZE, page.trips * PAGE_SIZE).map((t) => {
                  const link = t.public_access_code && t.owner_agency
                    ? buildCarteiraLink(t.owner_agency, t.public_access_code, domainsByOwner[t.user_id])
                    : null;
                  const shown = revealed[`t-${t.id}`];
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.client_name}</div>
                        {t.trip_title && <div className="text-xs text-muted-foreground">{t.trip_title}</div>}
                      </TableCell>
                      <TableCell>{t.destination}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(t.start_date)} → {fmtDate(t.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{t.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.is_locked ? "destructive" : "secondary"}>{t.is_locked ? "bloqueada" : t.status}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(t.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(t.updated_at)}</TableCell>
                      <TableCell>
                        {t.access_password ? (
                          <div className="flex items-center gap-1">
                            <code className="px-2 py-1 bg-muted rounded text-xs font-mono">
                              {shown ? t.access_password : "••••••"}
                            </code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setRevealed((r) => ({ ...r, [`t-${t.id}`]: !shown }))}>
                              {shown ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copy(t.access_password!, "Senha copiada")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">sem senha</span>}
                      </TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pager page={page.trips} total={trips.length} onPage={(p) => setPage((s) => ({ ...s, trips: p }))} />
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><SortHead label="Criado em" active={sort.tab==="quotes"&&sort.col==="created_at"} dir={sort.dir} onClick={() => toggleSort("quotes","created_at")} /></TableHead>
                  <TableHead><SortHead label="Atualizado" active={sort.tab==="quotes"&&sort.col==="updated_at"} dir={sort.dir} onClick={() => toggleSort("quotes","updated_at")} /></TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && quotes.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum orçamento encontrado</TableCell></TableRow>
                )}
                {quotes.slice((page.quotes - 1) * PAGE_SIZE, page.quotes * PAGE_SIZE).map((q) => {
                  const link = q.public_access_code && q.owner_agency
                    ? buildOrcamentoLink(q.owner_agency, q.public_access_code, domainsByOwner[q.user_id])
                    : null;
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="font-medium">{q.client_name}</TableCell>
                      <TableCell>{q.destination}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(q.start_date)} → {fmtDate(q.end_date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{q.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{q.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {q.currency} {Number(q.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell><Badge variant="secondary">{q.status}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(q.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(q.updated_at)}</TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pager page={page.quotes} total={quotes.length} onPage={(p) => setPage((s) => ({ ...s, quotes: p }))} />
          </Card>
        </TabsContent>

        <TabsContent value="itineraries">
          <Card className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Datas</TableHead>
                  <TableHead>Pax</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead><SortHead label="Criado em" active={sort.tab==="itineraries"&&sort.col==="created_at"} dir={sort.dir} onClick={() => toggleSort("itineraries","created_at")} /></TableHead>
                  <TableHead><SortHead label="Atualizado" active={sort.tab==="itineraries"&&sort.col==="updated_at"} dir={sort.dir} onClick={() => toggleSort("itineraries","updated_at")} /></TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && itineraries.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum roteiro encontrado</TableCell></TableRow>
                )}
                {itineraries.slice((page.itineraries - 1) * PAGE_SIZE, page.itineraries * PAGE_SIZE).map((i) => {
                  const link = i.public_access_code && i.owner_agency
                    ? buildRoteiroLink(i.owner_agency, i.public_access_code, domainsByOwner[i.user_id])
                    : null;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.destination}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{i.trip_type}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {fmtDate(i.start_date)} → {fmtDate(i.end_date)}
                      </TableCell>
                      <TableCell>{i.travelers_count}</TableCell>
                      <TableCell>
                        <div className="text-sm">{i.owner_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{i.owner_agency || "—"}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{i.status}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(i.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(i.updated_at)}</TableCell>
                      <TableCell>
                        {link ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(link, "Link copiado")}>
                              <Copy className="h-3 w-3" />
                            </Button>
                            <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <Pager page={page.itineraries} total={itineraries.length} onPage={(p) => setPage((s) => ({ ...s, itineraries: p }))} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}