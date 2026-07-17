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
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, differenceInDays, addDays, addHours, addMonths, isSameHour, isSameDay, isSameMonth } from "date-fns";
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

function matches(q: string, ...fields: (string | null | undefined)[]) {
  if (!q) return true;
  const lower = q.toLowerCase();
  return fields.some((f) => (f || "").toLowerCase().includes(lower));
}

export function AdminUserProjectsManager() {
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

      <Tabs defaultValue="trips">
        <TabsList>
          <TabsTrigger value="trips">
            Carteiras Digitais ({trips.length})
          </TabsTrigger>
          <TabsTrigger value="quotes">
            Orçamentos ({quotes.length})
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
                  <TableHead>Senha</TableHead>
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && trips.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma carteira encontrada</TableCell></TableRow>
                )}
                {trips.map((t) => {
                  const link = t.public_access_code && t.owner_agency
                    ? buildCarteiraLink(t.owner_agency, t.public_access_code)
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
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && quotes.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum orçamento encontrado</TableCell></TableRow>
                )}
                {quotes.map((q) => {
                  const link = q.public_access_code && q.owner_agency
                    ? buildOrcamentoLink(q.owner_agency, q.public_access_code)
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
                  <TableHead>Link Público</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!isLoading && itineraries.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum roteiro encontrado</TableCell></TableRow>
                )}
                {itineraries.map((i) => {
                  const link = i.public_access_code && i.owner_agency
                    ? buildRoteiroLink(i.owner_agency, i.public_access_code)
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
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}