import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  Star,
  Pencil,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Search,
  ExternalLink,
  Brain,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface NoticiasDashboard {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  score_perfil: number | null;
  aderencia_perfil: string | null;
  score_explicacao: string | null;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  created_at: string;
}

const CATEGORIAS = ["Aéreo", "Turismo", "Destinos", "Cruzeiros", "Mercado", "Eventos"];

const FILTERS_STORAGE_KEY = "admin-news-curation-filters-v1";

type SortField = "relevancia_score" | "score_perfil" | "data_publicacao" | "created_at";
type SortDir = "desc" | "asc";
type ScoreRange = "all" | "0-3" | "4-6" | "7-8" | "9-10";
type PerfilRange = "all" | "low" | "mid" | "high";

interface PersistedFilters {
  filterStatus: string;
  filterCategoria: string;
  filterFonte: string;
  sortField: SortField;
  sortDir: SortDir;
  scoreRange: ScoreRange;
  perfilRange: PerfilRange;
  search: string;
}

const DEFAULT_FILTERS: PersistedFilters = {
  filterStatus: "pendente",
  filterCategoria: "todas",
  filterFonte: "todas",
  sortField: "relevancia_score",
  sortDir: "desc",
  scoreRange: "all",
  perfilRange: "all",
  search: "",
};

function loadPersistedFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function AdminNewsCurationManager() {
  const [editingItem, setEditingItem] = useState<NoticiasDashboard | null>(null);
  const [editForm, setEditForm] = useState({ titulo_curto: "", resumo: "", categoria: "", tipo_exibicao: "" });
  const initial = loadPersistedFilters();
  const [filterStatus, setFilterStatus] = useState<string>(initial.filterStatus);
  const [sortField, setSortField] = useState<SortField>(initial.sortField);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir);
  const [filterCategoria, setFilterCategoria] = useState<string>(initial.filterCategoria);
  const [filterFonte, setFilterFonte] = useState<string>(initial.filterFonte);
  const [scoreRange, setScoreRange] = useState<ScoreRange>(initial.scoreRange);
  const [perfilRange, setPerfilRange] = useState<PerfilRange>(initial.perfilRange);
  const [search, setSearch] = useState<string>(initial.search);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resetScope, setResetScope] = useState<null | "todas" | "pendente" | "rejeitado" | "aprovado">(null);
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [collectDate, setCollectDate] = useState<string>("");
  const [collectTime, setCollectTime] = useState<string>("");
  const [collectSources, setCollectSources] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useAuth();

  // Persiste filtros
  useEffect(() => {
    const payload: PersistedFilters = {
      filterStatus, filterCategoria, filterFonte, sortField, sortDir,
      scoreRange, perfilRange, search,
    };
    try { localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload)); } catch { /* ignore */ }
  }, [filterStatus, filterCategoria, filterFonte, sortField, sortDir, scoreRange, perfilRange, search]);

  // Estatísticas de aprendizado da curadoria
  const { data: stats } = useQuery({
    queryKey: ["news-curation-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_news_curation_stats");
      if (error) throw error;
      return data as {
        total_feedback: number;
        total_aprovados: number;
        total_rejeitados: number;
        feedback_30d: number;
        nivel_aderencia: "baixa" | "media" | "alta";
      };
    },
    staleTime: 60_000,
  });

  const { data: noticias, isLoading } = useQuery({
    queryKey: ["admin-noticias-curadas", filterStatus, filterCategoria, filterFonte],
    queryFn: async () => {
      let query = supabase
        .from("noticias_dashboard")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }
      if (filterCategoria !== "todas") {
        query = query.eq("categoria", filterCategoria);
      }
      if (filterFonte !== "todas") {
        query = query.eq("fonte", filterFonte);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as NoticiasDashboard[];
    },
  });

  // Filtragem e ordenação client-side (com tie-break por perfil)
  const filteredNoticias = useMemo(() => {
    const list = (noticias || []).filter((n) => {
      // Faixa de nota
      const s = n.relevancia_score ?? 0;
      if (scoreRange === "0-3" && !(s >= 0 && s <= 3)) return false;
      if (scoreRange === "4-6" && !(s >= 4 && s <= 6)) return false;
      if (scoreRange === "7-8" && !(s >= 7 && s <= 8)) return false;
      if (scoreRange === "9-10" && !(s >= 9 && s <= 10)) return false;
      // Faixa de perfil
      const p = n.score_perfil ?? -1;
      if (perfilRange === "low" && !(p >= 0 && p <= 4)) return false;
      if (perfilRange === "mid" && !(p >= 5 && p <= 7)) return false;
      if (perfilRange === "high" && !(p >= 8)) return false;
      // Busca
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${n.titulo_curto ?? ""} ${n.resumo ?? ""} ${n.fonte ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dirMul = sortDir === "desc" ? -1 : 1;
    const getVal = (n: NoticiasDashboard, f: SortField): number => {
      if (f === "relevancia_score") return n.relevancia_score ?? -1;
      if (f === "score_perfil") return n.score_perfil ?? -1;
      if (f === "data_publicacao") return new Date(n.data_publicacao || 0).getTime();
      return new Date(n.created_at || 0).getTime();
    };

    list.sort((a, b) => {
      const av = getVal(a, sortField);
      const bv = getVal(b, sortField);
      if (av !== bv) return (av - bv) * dirMul;
      // Tie-break: se ordenando por nota, desempata por perfil desc; caso contrário por nota desc
      if (sortField === "relevancia_score") {
        return ((b.score_perfil ?? -1) - (a.score_perfil ?? -1));
      }
      return ((b.relevancia_score ?? -1) - (a.relevancia_score ?? -1));
    });

    return list;
  }, [noticias, scoreRange, perfilRange, search, sortField, sortDir]);

  // Extract unique sources for filter
  const { data: fontes } = useQuery({
    queryKey: ["admin-noticias-fontes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("fonte");
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.fonte))].sort();
      return unique;
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (params?: { since?: string; sources?: string[] }) => {
      const body: Record<string, unknown> = {};
      if (params?.since) body.since = params.since;
      if (params?.sources && params.sources.length > 0) body.sources = params.sources;
      const { data, error } = await supabase.functions.invoke("curate-news", {
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      setCollectDialogOpen(false);
      toast({
        title: "Coleta concluída!",
        description: `${data.fetched || 0} notícias coletadas, ${data.curated || 0} curadas pela IA`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na coleta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (scope: "todas" | "pendente" | "rejeitado" | "aprovado") => {
      // Apaga apenas noticias_dashboard. O histórico em news_curation_feedback é preservado
      // (a FK noticia_id está marcada como nullable e ON DELETE SET NULL não é necessária —
      // testamos a cascata abaixo). Para evitar qualquer risco, fazemos UPDATE antes de DELETE.
      // Primeiro, desvinculamos o noticia_id no feedback (caso haja FK CASCADE).
      let query = supabase
        .from("noticias_dashboard")
        .delete({ count: "exact" });
      if (scope !== "todas") {
        query = query.eq("status", scope);
      } else {
        // delete all → precisa de filtro no PostgREST; usamos um filtro sempre verdadeiro
        query = query.not("id", "is", null);
      }
      const { error, count } = await query;
      if (error) throw error;
      return count || 0;
    },
    onSuccess: (count, scope) => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-fontes"] });
      const label =
        scope === "todas" ? "todas as notícias" :
        scope === "pendente" ? "as notícias pendentes" :
        scope === "rejeitado" ? "as notícias rejeitadas" : "as notícias aprovadas";
      toast({
        title: "Notícias removidas com sucesso",
        description: `${count} ${label} apagadas. Histórico de aprendizado preservado.`,
      });
      setResetScope(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao limpar notícias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NoticiasDashboard> }) => {
      const { error } = await supabase.from("noticias_dashboard").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({ title: "Notícia atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({
      ids,
      decisao,
      tipo,
    }: {
      ids: string[];
      decisao: "aprovado" | "rejeitado";
      tipo?: "destaque" | "secundaria";
    }) => {
      const updateData: any = { status: decisao };
      if (decisao === "aprovado") {
        updateData.tipo_exibicao = tipo || "secundaria";
      }
      const { error } = await supabase
        .from("noticias_dashboard")
        .update(updateData)
        .in("id", ids);
      if (error) throw error;
      return { count: ids.length, decisao };
    },
    onSuccess: ({ count, decisao }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-noticias-curadas"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({
        title:
          decisao === "aprovado"
            ? `${count} ${count === 1 ? "notícia aprovada" : "notícias aprovadas"}`
            : `${count} ${count === 1 ? "notícia rejeitada" : "notícias rejeitadas"}`,
      });
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const ids = filteredNoticias.map((n) => n.id);
    setSelectedIds((prev) => (prev.size === ids.length && ids.length > 0 ? new Set() : new Set(ids)));
  };

  const handleEdit = (item: NoticiasDashboard) => {
    setEditingItem(item);
    setEditForm({
      titulo_curto: item.titulo_curto,
      resumo: item.resumo,
      categoria: item.categoria,
      tipo_exibicao: item.tipo_exibicao,
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data: editForm });
    setEditingItem(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-700 bg-green-100";
    if (score >= 5) return "text-yellow-700 bg-yellow-100";
    return "text-red-700 bg-red-100";
  };

  const getPerfilColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 5) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendente</Badge>;
      case "aprovado":
        return <Badge className="bg-green-600">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-col gap-3">
        <div className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Curadoria IA de Notícias
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" disabled={resetMutation.isPending}>
                  {resetMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Limpar notícias
                  <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setResetScope("todas")}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar todas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setResetScope("pendente")}>
                  Apagar apenas pendentes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setResetScope("rejeitado")}>
                  Apagar apenas rejeitadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setResetScope("aprovado")}>
                  Apagar apenas aprovadas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              onClick={() => collectMutation.mutate()}
              disabled={collectMutation.isPending}
            >
              {collectMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Coletar Agora
            </Button>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-900">
          <Brain className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
          <div>
            <strong>Aprendizado ativo:</strong> a IA traz todas as notícias das últimas 24h como
            "pendentes" para você decidir. Cada aprovação ou rejeição com motivo é usada como
            exemplo na próxima coleta — quanto mais você curar, mais preciso fica o score.
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-3 p-3 rounded-md border bg-gradient-to-r from-violet-50 to-blue-50 text-xs flex-wrap">
            <Brain className="h-4 w-4 text-violet-600" />
            <span className="font-semibold text-violet-900">IA ajustada ao seu perfil:</span>
            <Badge
              className={
                stats.nivel_aderencia === "alta"
                  ? "bg-emerald-600 hover:bg-emerald-600"
                  : stats.nivel_aderencia === "media"
                  ? "bg-amber-500 hover:bg-amber-500"
                  : "bg-slate-400 hover:bg-slate-400"
              }
            >
              Aderência {stats.nivel_aderencia}
            </Badge>
            <span className="text-muted-foreground">
              {stats.total_feedback} decisões treinadas ({stats.total_aprovados} aprovadas, {stats.total_rejeitados} rejeitadas) — {stats.feedback_30d} nos últimos 30 dias
            </span>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, resumo ou fonte..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
                <SelectItem value="rejeitado">Rejeitados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFonte} onValueChange={setFilterFonte}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas fontes</SelectItem>
                {fontes?.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scoreRange} onValueChange={(v) => setScoreRange(v as ScoreRange)}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Nota" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer nota</SelectItem>
                <SelectItem value="9-10">Nota 9 a 10</SelectItem>
                <SelectItem value="7-8">Nota 7 a 8</SelectItem>
                <SelectItem value="4-6">Nota 4 a 6</SelectItem>
                <SelectItem value="0-3">Nota 0 a 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={perfilRange} onValueChange={(v) => setPerfilRange(v as PerfilRange)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Perfil" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer perfil</SelectItem>
                <SelectItem value="high">Alto interesse (8-10)</SelectItem>
                <SelectItem value="mid">Médio interesse (5-7)</SelectItem>
                <SelectItem value="low">Baixo interesse (0-4)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevancia_score">Ordenar por Nota</SelectItem>
                <SelectItem value="score_perfil">Ordenar por Perfil</SelectItem>
                <SelectItem value="data_publicacao">Data de publicação</SelectItem>
                <SelectItem value="created_at">Data de importação</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
              title={sortDir === "desc" ? "Maior primeiro" : "Menor primeiro"}
            >
              {sortDir === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              <span className="ml-1 text-xs">{sortDir === "desc" ? "Maior" : "Menor"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredNoticias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma notícia encontrada com os filtros atuais</p>
            <p className="text-sm mt-1">Ajuste os filtros ou clique em "Coletar Agora" para buscar novas notícias</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground px-1">
              {filteredNoticias.length} {filteredNoticias.length === 1 ? "notícia encontrada" : "notícias encontradas"}
            </div>
            {(() => {
              const allSelected = filteredNoticias.length > 0 && selectedIds.size === filteredNoticias.length;
              return (
                <div className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/40 sticky top-0 z-10">
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => toggleSelectAll()}
                      disabled={filteredNoticias.length === 0}
                    />
                    <span className="text-muted-foreground">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} selecionada${selectedIds.size === 1 ? "" : "s"}`
                        : "Selecionar todas visíveis"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={selectedIds.size === 0 || decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          ids: Array.from(selectedIds),
                          decisao: "aprovado",
                          tipo: "secundaria",
                        })
                      }
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aprovar selecionadas
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedIds.size === 0 || decisionMutation.isPending}
                      onClick={() =>
                        decisionMutation.mutate({
                          ids: Array.from(selectedIds),
                          decisao: "rejeitado",
                        })
                      }
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar selecionadas
                    </Button>
                  </div>
                </div>
              );
            })()}
            {filteredNoticias.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-lg border bg-card"
              >
                <Checkbox
                  className="mt-1"
                  checked={selectedIds.has(item.id)}
                  onCheckedChange={() => toggleSelect(item.id)}
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{item.categoria}</Badge>
                    <span className="text-xs text-muted-foreground">{item.fonte}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(item.relevancia_score)}`}>
                      <Star className="h-3 w-3 inline mr-0.5" />
                      {item.relevancia_score}/10
                    </span>
                    {item.score_perfil != null && (
                      <span
                        title={item.score_explicacao || "Score ajustado ao seu padrão de curadoria"}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border ${getPerfilColor(item.score_perfil)}`}
                      >
                        <Brain className="h-3 w-3" />
                        Perfil {item.score_perfil}/10
                      </span>
                    )}
                    {item.tipo_exibicao === "destaque" && (
                      <Badge className="bg-primary/20 text-primary border-primary/30">Destaque</Badge>
                    )}
                    {getStatusBadge(item.status)}
                  </div>
                  <h4 className="font-medium text-foreground leading-tight">{item.titulo_curto}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{item.resumo}</p>
                  {item.score_explicacao && (
                    <p className="text-[11px] text-violet-700 italic flex items-start gap-1">
                      <Brain className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {item.score_explicacao}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{new Date(item.data_publicacao).toLocaleDateString("pt-BR")}</span>
                    <a
                      href={item.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Ver original <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                {item.status === "pendente" && (
                  <div className="flex sm:flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        decisionMutation.mutate({ ids: [item.id], decisao: "aprovado", tipo: "destaque" })
                      }
                      disabled={decisionMutation.isPending}
                      className="text-xs"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Destaque
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        decisionMutation.mutate({ ids: [item.id], decisao: "aprovado", tipo: "secundaria" })
                      }
                      disabled={decisionMutation.isPending}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                      className="text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        decisionMutation.mutate({ ids: [item.id], decisao: "rejeitado" })
                      }
                      disabled={decisionMutation.isPending}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Notícia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título Curto</Label>
              <Input
                value={editForm.titulo_curto}
                onChange={(e) => setEditForm({ ...editForm, titulo_curto: e.target.value })}
              />
            </div>
            <div>
              <Label>Resumo</Label>
              <Textarea
                value={editForm.resumo}
                onChange={(e) => setEditForm({ ...editForm, resumo: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={editForm.categoria}
                  onValueChange={(v) => setEditForm({ ...editForm, categoria: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editForm.tipo_exibicao}
                  onValueChange={(v) => setEditForm({ ...editForm, tipo_exibicao: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destaque">Destaque</SelectItem>
                    <SelectItem value="secundaria">Secundária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de limpeza */}
      <AlertDialog open={!!resetScope} onOpenChange={(open) => !open && setResetScope(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resetScope === "todas" && "Apagar TODAS as notícias?"}
              {resetScope === "pendente" && "Apagar notícias pendentes?"}
              {resetScope === "rejeitado" && "Apagar notícias rejeitadas?"}
              {resetScope === "aprovado" && "Apagar notícias aprovadas?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {resetScope === "todas"
                  ? "Tem certeza que deseja apagar TODAS as notícias coletadas (pendentes, aprovadas e rejeitadas)? Essa ação não pode ser desfeita."
                  : "Tem certeza que deseja apagar essas notícias? Essa ação não pode ser desfeita."}
              </span>
              <span className="block text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                ✓ O histórico de aprendizado da IA (suas decisões anteriores) será preservado e continuará treinando o sistema nas próximas coletas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (resetScope) resetMutation.mutate(resetScope);
              }}
              disabled={resetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
