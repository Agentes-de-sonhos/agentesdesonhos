import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import {
  Loader2,
  RefreshCw,
  Activity,
  Clock,
  AlertTriangle,
  EyeOff,
  Eye,
  Pencil,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Newspaper,
  Search,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const CATEGORIAS = [
  "Aéreo",
  "Hotelaria & Resorts",
  "Cruzeiros",
  "Destinos",
  "Operadoras & Trade",
  "Mercado & Economia",
  "Eventos & Feiras",
  "Ingressos & Atrações",
  "Turismo Sustentável",
  "Educação & Certificações",
  "Tecnologia & Inovação",
  "Regulamentação & Vistos",
  "Curiosidades",
  "Outros",
];

const PORTALS = ["PANROTAS", "Mercado & Eventos", "Brasilturis"] as const;

interface CollectorRun {
  id: string;
  portal: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  found_count: number | null;
  inserted_count: number | null;
  skipped_duplicates_count: number | null;
  updated_count: number | null;
  invalid_count: number | null;
  others_count: number | null;
  errors: unknown;
  trigger_source: string | null;
}

interface DashboardNews {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  status: string;
  hidden: boolean;
  reads_count: number | null;
  likes_count: number | null;
  classification_confidence: number | null;
  data_publicacao: string;
  created_at: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-green-600 hover:bg-green-600">Sucesso</Badge>;
    case "partial":
      return <Badge className="bg-yellow-500 hover:bg-yellow-500">Parcial</Badge>;
    case "running":
      return <Badge variant="secondary">Em execução</Badge>;
    case "error":
      return <Badge variant="destructive">Erro</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function fmtDuration(ms: number | null) {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  return `${s.toFixed(1)}s`;
}

function fmtRelative(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true });
  } catch {
    return "—";
  }
}

function nextScheduleFrom(now: Date): Date | null {
  // Cron: 11,13,15,17,19,21,23 UTC (aka 8,10,12,14,16,18,20 America/Sao_Paulo)
  const hoursUTC = [11, 13, 15, 17, 19, 21, 23];
  for (let addDays = 0; addDays < 2; addDays++) {
    for (const h of hoursUTC) {
      const cand = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + addDays,
        h, 0, 0, 0,
      ));
      if (cand.getTime() > now.getTime()) return cand;
    }
  }
  return null;
}

export function AdminNewsCollectorManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [portalFilter, setPortalFilter] = useState<string>("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [statusFilter, setStatusFilter] = useState<string>("todos"); // publicado/oculto/pendente/todos
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<DashboardNews | null>(null);
  const [editForm, setEditForm] = useState({ titulo_curto: "", resumo: "", categoria: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Últimas execuções por portal
  const { data: latestByPortal, isLoading: loadingLatest } = useQuery({
    queryKey: ["news-collector-latest-per-portal"],
    queryFn: async () => {
      const results: Record<string, CollectorRun | null> = {};
      await Promise.all(
        PORTALS.map(async (p) => {
          const { data } = await supabase
            .from("news_collector_runs")
            .select("*")
            .eq("portal", p)
            .order("started_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          results[p] = (data as CollectorRun | null) ?? null;
        }),
      );
      return results;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // ── Histórico de execuções (últimas 30)
  const { data: runHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["news-collector-run-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_collector_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as CollectorRun[];
    },
    refetchInterval: 30_000,
  });

  // ── Notícias (últimas 200) com filtros
  const { data: newsItems, isLoading: loadingNews } = useQuery({
    queryKey: ["admin-news-collector-items", portalFilter, categoryFilter, statusFilter],
    queryFn: async () => {
      let q = supabase.from("noticias_dashboard").select("*");
      if (portalFilter !== "todos") q = q.eq("fonte", portalFilter);
      if (categoryFilter !== "todas") q = q.eq("categoria", categoryFilter);
      if (statusFilter === "publicado") q = q.eq("hidden", false).eq("status", "aprovado");
      if (statusFilter === "oculto") q = q.eq("hidden", true);
      if (statusFilter === "pendente") q = q.is("classification_confidence", null);
      q = q.order("created_at", { ascending: false }).limit(200);
      const { data, error } = await q;
      if (error) throw error;
      return data as DashboardNews[];
    },
    staleTime: 30_000,
  });

  const filteredNews = useMemo(() => {
    const list = newsItems ?? [];
    if (!search.trim()) return list;
    const s = search.trim().toLowerCase();
    return list.filter((n) =>
      `${n.titulo_curto ?? ""} ${n.resumo ?? ""}`.toLowerCase().includes(s),
    );
  }, [newsItems, search]);

  // ── KPIs
  const kpis = useMemo(() => {
    const runs = runHistory ?? [];
    const last24 = runs.filter((r) =>
      new Date(r.started_at).getTime() > Date.now() - 24 * 3600 * 1000,
    );
    const inserted = last24.reduce((s, r) => s + (r.inserted_count ?? 0), 0);
    const skipped = last24.reduce((s, r) => s + (r.skipped_duplicates_count ?? 0), 0);
    const errors = last24.reduce(
      (s, r) => s + (Array.isArray(r.errors) ? (r.errors as unknown[]).length : 0),
      0,
    );
    const others = (newsItems ?? []).filter((n) => n.categoria === "Outros" && !n.hidden).length;
    return { inserted, skipped, errors, others };
  }, [runHistory, newsItems]);

  const nextRun = useMemo(() => nextScheduleFrom(new Date()), []);
  const lastGlobal = useMemo(() => {
    if (!runHistory || runHistory.length === 0) return null;
    return runHistory[0];
  }, [runHistory]);

  // ── Ações
  const runCollectorMutation = useMutation({
    mutationFn: async (portal: string | "all") => {
      const body =
        portal === "all" ? {} : { portals: [portal] };
      const { data, error } = await supabase.functions.invoke(
        "news-collector-orchestrator",
        { body },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data, portal) => {
      queryClient.invalidateQueries({ queryKey: ["news-collector-latest-per-portal"] });
      queryClient.invalidateQueries({ queryKey: ["news-collector-run-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-news-collector-items"] });
      const s = (data as any)?.summary ?? {};
      toast({
        title: portal === "all" ? "Coleta manual executada" : `Coleta de ${portal} executada`,
        description: `${s.inserted ?? 0} novas · ${s.skipped_duplicates ?? 0} duplicadas · ${s.others ?? 0} em "Outros".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Falha ao executar coleta",
        description: error?.message ?? "Erro desconhecido.",
        variant: "destructive",
      });
    },
  });

  const toggleHiddenMutation = useMutation({
    mutationFn: async ({ id, hidden }: { id: string; hidden: boolean }) => {
      const { error } = await supabase
        .from("noticias_dashboard")
        .update({ hidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-collector-items"] });
      queryClient.invalidateQueries({ queryKey: ["noticias-dashboard"] });
      toast({ title: vars.hidden ? "Notícia ocultada" : "Notícia restaurada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DashboardNews> }) => {
      const { error } = await supabase
        .from("noticias_dashboard")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-collector-items"] });
      queryClient.invalidateQueries({ queryKey: ["noticias-dashboard"] });
      toast({ title: "Notícia atualizada" });
      setEditing(null);
    },
    onError: (error: any) => {
      toast({ title: "Erro ao salvar", description: error?.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("noticias_dashboard").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-collector-items"] });
      toast({ title: "Notícia excluída" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    },
  });

  const reclassifyMutation = useMutation({
    mutationFn: async (payload: { ids?: string[]; only_others?: boolean; only_pending?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("reclassify-news", { body: payload });
      if (error) throw error;
      return data as { total: number; reclassified: number; kept_others: number; errors: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-news-collector-items"] });
      queryClient.invalidateQueries({ queryKey: ["noticias-dashboard"] });
      setSelected(new Set());
      toast({
        title: "Reclassificação concluída",
        description: `${data.reclassified} notícias reclassificadas, ${data.kept_others} permaneceram em Outros e ${data.errors} apresentaram erro.`,
      });
    },
    onError: (error: any) => {
      toast({ title: "Falha ao reclassificar", description: error?.message ?? "Erro desconhecido.", variant: "destructive" });
    },
  });

  const handleStartEdit = (item: DashboardNews) => {
    setEditing(item);
    setEditForm({
      titulo_curto: item.titulo_curto ?? "",
      resumo: item.resumo ?? "",
      categoria: item.categoria ?? "Outros",
    });
  };

  const isRunning = runCollectorMutation.isPending;
  const isReclassifying = reclassifyMutation.isPending;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allVisibleSelected = filteredNews.length > 0 && filteredNews.every((n) => selected.has(n.id));
  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredNews.forEach((n) => next.delete(n.id));
      else filteredNews.forEach((n) => next.add(n.id));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho + ações globais */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Coleta Automática de Notícias</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Scrapers de PANROTAS, Mercado & Eventos e Brasilturis rodam a cada 2h entre 8h e 20h (America/Sao_Paulo).
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => runCollectorMutation.mutate("all")} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Executar coleta agora
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Última coleta
              </div>
              <div className="mt-1 text-sm font-semibold">
                {lastGlobal ? fmtRelative(lastGlobal.started_at) : "—"}
              </div>
              {lastGlobal && (
                <div className="text-[11px] text-muted-foreground mt-0.5">{lastGlobal.portal}</div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Próxima coleta
              </div>
              <div className="mt-1 text-sm font-semibold">
                {nextRun ? fmtRelative(nextRun.toISOString()) : "—"}
              </div>
              {nextRun && (
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {nextRun.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </div>
              )}
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Inseridas (24h)
              </div>
              <div className="mt-1 text-sm font-semibold">{kpis.inserted}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {kpis.skipped} duplicadas ignoradas
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />
                Erros / Outras
              </div>
              <div className="mt-1 text-sm font-semibold">
                {kpis.errors} · {kpis.others}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Erros nas últimas 24h · notícias em "Outros"
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status por portal */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Status por Portal</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLatest ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {PORTALS.map((portal) => {
                const run = latestByPortal?.[portal] ?? null;
                return (
                  <div key={portal} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{portal}</div>
                      {run ? statusBadge(run.status) : <Badge variant="outline">Sem coleta</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {run ? fmtRelative(run.started_at) : "Nunca executado"}
                    </div>
                    {run && (
                      <div className="text-xs grid grid-cols-2 gap-1 pt-1">
                        <span>Novas: <b>{run.inserted_count ?? 0}</b></span>
                        <span>Duplicadas: <b>{run.skipped_duplicates_count ?? 0}</b></span>
                        <span>Encontradas: <b>{run.found_count ?? 0}</b></span>
                        <span>Duração: <b>{fmtDuration(run.duration_ms)}</b></span>
                        {Array.isArray(run.errors) && (run.errors as unknown[]).length > 0 && (
                          <span className="col-span-2 text-destructive">
                            {(run.errors as unknown[]).length} erro(s) registrado(s)
                          </span>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => runCollectorMutation.mutate(portal)}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      Coletar {portal}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de execuções */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !runHistory || runHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma execução registrada ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="pb-2 pr-3">Portal</th>
                    <th className="pb-2 pr-3">Início</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2 pr-3">Origem</th>
                    <th className="pb-2 pr-3 text-right">Encontradas</th>
                    <th className="pb-2 pr-3 text-right">Novas</th>
                    <th className="pb-2 pr-3 text-right">Duplicadas</th>
                    <th className="pb-2 pr-3 text-right">Duração</th>
                    <th className="pb-2 pr-3 text-right">Erros</th>
                  </tr>
                </thead>
                <tbody>
                  {runHistory.map((r) => (
                    <tr key={r.id} className="border-b/50">
                      <td className="py-2 pr-3">{r.portal}</td>
                      <td className="py-2 pr-3">{fmtRelative(r.started_at)}</td>
                      <td className="py-2 pr-3">{statusBadge(r.status)}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{r.trigger_source ?? "—"}</td>
                      <td className="py-2 pr-3 text-right">{r.found_count ?? 0}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{r.inserted_count ?? 0}</td>
                      <td className="py-2 pr-3 text-right">{r.skipped_duplicates_count ?? 0}</td>
                      <td className="py-2 pr-3 text-right">{fmtDuration(r.duration_ms)}</td>
                      <td className="py-2 pr-3 text-right">
                        {Array.isArray(r.errors) ? (r.errors as unknown[]).length : 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notícias — listagem e edição */}
      <Card className="border-0 shadow-md">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">Notícias Publicadas</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou resumo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={portalFilter} onValueChange={setPortalFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Portal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os portais</SelectItem>
                {PORTALS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="publicado">Publicadas</SelectItem>
                <SelectItem value="oculto">Ocultas</SelectItem>
                <SelectItem value="pendente">Pendente de classificação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t pt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => reclassifyMutation.mutate({ only_others: true })}
              disabled={isReclassifying}
            >
              {isReclassifying ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Reclassificar todas em "Outros"
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reclassifyMutation.mutate({ only_pending: true })}
              disabled={isReclassifying}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Reprocessar pendentes de IA
            </Button>
            <Button
              size="sm"
              onClick={() => reclassifyMutation.mutate({ ids: Array.from(selected) })}
              disabled={isReclassifying || selected.size === 0}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Reclassificar selecionadas ({selected.size})
            </Button>
            {filteredNews.length > 0 && (
              <Button size="sm" variant="ghost" onClick={toggleSelectAllVisible}>
                {allVisibleSelected ? "Desmarcar todas" : "Selecionar todas visíveis"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingNews ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredNews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma notícia encontrada com os filtros atuais.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredNews.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(n.id)}
                    onCheckedChange={() => toggleSelect(n.id)}
                    aria-label="Selecionar notícia"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="secondary" className="text-[10px]">{n.fonte}</Badge>
                      <Badge variant="outline" className="text-[10px]">{n.categoria}</Badge>
                      {n.hidden ? (
                        <Badge variant="destructive" className="text-[10px]">Oculta</Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">Publicada</Badge>
                      )}
                      {n.classification_confidence == null && (
                        <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">
                          Pendente IA
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {fmtRelative(n.created_at)}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{n.titulo_curto}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.resumo}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{n.reads_count ?? 0} leituras</span>
                      <span>{n.likes_count ?? 0} curtidas</span>
                      {n.classification_confidence != null && (
                        <span>Confiança IA: {Math.round((n.classification_confidence ?? 0) * 100)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Abrir matéria"
                      onClick={() => window.open(n.url_original, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Editar"
                      onClick={() => handleStartEdit(n)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={n.hidden ? "Restaurar" : "Ocultar"}
                      onClick={() => toggleHiddenMutation.mutate({ id: n.id, hidden: !n.hidden })}
                    >
                      {n.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <ConfirmDeleteDialog onConfirm={() => deleteMutation.mutate(n.id)}>
                      <Button variant="ghost" size="icon" title="Excluir">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </ConfirmDeleteDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar notícia</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={editForm.titulo_curto}
                  onChange={(e) => setEditForm({ ...editForm, titulo_curto: e.target.value })}
                />
              </div>
              <div>
                <Label>Resumo</Label>
                <Textarea
                  rows={4}
                  value={editForm.resumo}
                  onChange={(e) => setEditForm({ ...editForm, resumo: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={editForm.categoria}
                  onValueChange={(v) => setEditForm({ ...editForm, categoria: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button
                  onClick={() =>
                    editing &&
                    editMutation.mutate({ id: editing.id, patch: editForm })
                  }
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}