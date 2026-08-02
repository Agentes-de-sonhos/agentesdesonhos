import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEditButton } from "@/components/layout/AdminEditButton";
import {
  Newspaper, ExternalLink, Loader2, TrendingUp, Flame, Search, Crown,
  Plane, Ship, Hotel, Globe, BarChart3, Mic, Palmtree, Building2, Ticket,
  DollarSign, GraduationCap, Users, Sparkles, Shield, Wrench, Filter,
  EyeOff, Eye, ThumbsUp, X, ChevronDown, ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNewsLikes } from "@/hooks/useNewsLikes";
import { useNewsHighlights, type Top5Item } from "@/hooks/useNewsHighlights";
import { highlightLabel, sortByEngagement } from "@/lib/newsRanking";
import { NewsLikeButton } from "@/components/news/NewsLikeButton";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────── */
type Noticia = {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  data_publicacao: string;
  reads_count: number;
  likes_count: number;
  status: string;
  hidden: boolean;
};

type RankingRow = Top5Item;

/* ── Categorias ──────────────────────────────────────────── */
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

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Aéreo": <Plane className="h-3.5 w-3.5" />,
  "Hotelaria & Resorts": <Hotel className="h-3.5 w-3.5" />,
  "Cruzeiros": <Ship className="h-3.5 w-3.5" />,
  "Destinos": <Globe className="h-3.5 w-3.5" />,
  "Operadoras & Trade": <Building2 className="h-3.5 w-3.5" />,
  "Mercado & Economia": <DollarSign className="h-3.5 w-3.5" />,
  "Eventos & Feiras": <Mic className="h-3.5 w-3.5" />,
  "Ingressos & Atrações": <Ticket className="h-3.5 w-3.5" />,
  "Turismo Sustentável": <Palmtree className="h-3.5 w-3.5" />,
  "Educação & Certificações": <GraduationCap className="h-3.5 w-3.5" />,
  "Tecnologia & Inovação": <Sparkles className="h-3.5 w-3.5" />,
  "Regulamentação & Vistos": <Shield className="h-3.5 w-3.5" />,
  "Curiosidades": <Users className="h-3.5 w-3.5" />,
  "Outros": <Wrench className="h-3.5 w-3.5" />,
  // Legado
  "Hotel": <Hotel className="h-3.5 w-3.5" />,
  "Mercado": <BarChart3 className="h-3.5 w-3.5" />,
  "Eventos": <Mic className="h-3.5 w-3.5" />,
  "Turismo": <Palmtree className="h-3.5 w-3.5" />,
};

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Hotelaria & Resorts": "bg-rose-100 text-rose-700 border-rose-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Operadoras & Trade": "bg-amber-100 text-amber-700 border-amber-200",
  "Mercado & Economia": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Eventos & Feiras": "bg-purple-100 text-purple-700 border-purple-200",
  "Ingressos & Atrações": "bg-pink-100 text-pink-700 border-pink-200",
  "Turismo Sustentável": "bg-teal-100 text-teal-700 border-teal-200",
  "Educação & Certificações": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Tecnologia & Inovação": "bg-violet-100 text-violet-700 border-violet-200",
  "Regulamentação & Vistos": "bg-slate-100 text-slate-700 border-slate-200",
  "Curiosidades": "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "Outros": "bg-muted text-muted-foreground border-border",
};

const PORTAIS = ["PANROTAS", "Mercado & Eventos", "Brasilturis"];

/* ── Helpers ─────────────────────────────────────────────── */
function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function isWeekend(): boolean {
  const d = new Date();
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Próxima janela de coleta (SP): 08, 10, 12, 14, 16, 18, 20 */
const COLLECT_HOURS = [8, 10, 12, 14, 16, 18, 20];
function getNextCollectionLabel(): string {
  const nowSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const h = nowSp.getHours();
  const next = COLLECT_HOURS.find((x) => x > h);
  if (next !== undefined) return `${String(next).padStart(2, "0")}h`;
  return "08h de amanhã";
}

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  const icon = CATEGORIA_ICONS[categoria] || <Newspaper className="h-3.5 w-3.5" />;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colorClass}`}>
      {icon}
      {categoria}
    </span>
  );
}

/* ── Card editorial (sem imagem) ─────────────────────────── */
function NewsCard({
  item,
  onRead,
  onLike,
  liked,
  likeCount,
  variant = "default",
  featuredLabel,
  onHide,
  isAdmin,
}: {
  item: Noticia;
  onRead: (item: Noticia) => void;
  onLike: (id: string) => void;
  liked: boolean;
  likeCount: number;
  variant?: "default" | "feature" | "compact";
  featuredLabel?: string;
  onHide?: (id: string) => void;
  isAdmin?: boolean;
}) {
  const isFeature = variant === "feature";
  const isCompact = variant === "compact";

  const handleCardClick = (e: React.MouseEvent) => {
    // Só abre a matéria se não houve seleção de texto e o alvo não é um controle interativo
    if (window.getSelection()?.toString()) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a")) return;
    onRead(item);
  };

  return (
    <Card
      className={cn(
        "group border border-border/60 shadow-none hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer bg-card",
        isFeature && "border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card"
      )}
      onClick={handleCardClick}
    >
      <CardContent
        className={cn(
          "flex flex-col gap-2",
          isFeature ? "p-6 md:p-7 gap-3" : isCompact ? "p-3" : "p-4"
        )}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {featuredLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <Crown className="h-3 w-3" /> {featuredLabel}
            </span>
          )}
          <CategoryBadge categoria={item.categoria} />
          <span className="text-[11px] font-medium text-muted-foreground">{item.fonte}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{formatRelative(item.data_publicacao)}</span>
        </div>

        <h3
          className={cn(
            "font-display font-bold leading-tight text-foreground group-hover:text-primary transition-colors",
            isFeature ? "text-2xl md:text-3xl" : isCompact ? "text-sm line-clamp-2" : "text-base md:text-lg line-clamp-2"
          )}
        >
          {item.titulo_curto}
        </h3>

        {!isCompact && item.resumo && (
          <p
            className={cn(
              "text-muted-foreground leading-relaxed",
              isFeature ? "text-base line-clamp-3" : "text-sm line-clamp-2"
            )}
          >
            {item.resumo}
          </p>
        )}

        <div className={cn("flex items-center gap-3 pt-2 mt-auto", isCompact ? "" : "border-t border-border/40")}>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
            <span className="inline-flex items-center gap-1" aria-label={`${item.reads_count} leituras`}>
              <Eye className="h-3.5 w-3.5" /> {item.reads_count}
            </span>
            <span className="inline-flex items-center gap-1" aria-label={`${likeCount} curtidas`}>
              <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-primary text-primary")} /> {likeCount}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NewsLikeButton
              noticiaId={item.id}
              count={likeCount}
              liked={liked}
              onToggle={onLike}
              size={isFeature ? "md" : "sm"}
            />
            {isAdmin && onHide && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Ocultar notícia"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(item.id); }}
              >
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            <a
              href={item.url_original}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRead(item); }}
              className={cn(
                "inline-flex items-center gap-1 text-primary hover:underline font-medium",
                isFeature ? "text-sm" : "text-xs"
              )}
            >
              Ler matéria <ExternalLink className={cn(isFeature ? "h-4 w-4" : "h-3 w-3")} />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Item enxuto do Top 5 (lista com nº grande) ──────────── */
function RankingItem({
  item,
  position,
  onRead,
}: {
  item: RankingRow;
  position: number;
  onRead: (item: Noticia) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(item)}
      className="w-full text-left group flex gap-3 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
    >
      <span className="text-3xl md:text-4xl font-display font-bold text-primary/70 tabular-nums leading-none w-8 shrink-0">
        {position}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {item.titulo_curto}
        </h4>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
          <span className="font-medium">{item.fonte}</span>
          <span>·</span>
          <span>{item.categoria}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {item.reads_count}</span>
          <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likes_count}</span>
        </div>
      </div>
    </button>
  );
}

/* ── Página ──────────────────────────────────────────────── */
export default function Noticias() {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"destaques" | "todas">("destaques");
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [portalFilter, setPortalFilter] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<"recent" | "reads" | "likes" | "score">("recent");
  const [visibleCount, setVisibleCount] = useState(20);
  const [pendingCount, setPendingCount] = useState(0);
  const [categoryVisibleCounts, setCategoryVisibleCounts] = useState<Record<string, number>>({});

  // Reset per-category counts when filters change
  useEffect(() => {
    setCategoryVisibleCounts({});
  }, [search, categoriaFilter, portalFilter, orderBy]);

  const weekend = isWeekend();
  const rankingWindow: "day" | "week" = weekend ? "week" : "day";

  /* Feed principal — últimas notícias */
  const feedQuery = useQuery({
    queryKey: ["news-feed", 200],
    queryFn: async () => {
      const { data, error } = await (supabase.from("noticias_dashboard") as any)
        .select("id, titulo_curto, resumo, categoria, fonte, url_original, data_publicacao, reads_count, likes_count, status, hidden")
        .eq("status", "aprovado")
        .eq("hidden", false)
        .order("data_publicacao", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Noticia[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  /* Ranking (Top 5) */
  const rankingQuery = useQuery({
    queryKey: ["news-ranking", rankingWindow],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("news_ranking", {
        p_window: rankingWindow,
        p_limit: 5,
      });
      if (error) throw error;
      return (data ?? []) as RankingRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  /* Polling — sinaliza novas notícias sem trocar o scroll */
  useEffect(() => {
    const items = feedQuery.data ?? [];
    if (items.length === 0) return;
    const latestSeen = new Date(items[0].data_publicacao).getTime();
    const intervalId = window.setInterval(async () => {
      const { data } = await (supabase.from("noticias_dashboard") as any)
        .select("id, data_publicacao")
        .eq("status", "aprovado")
        .eq("hidden", false)
        .gt("data_publicacao", new Date(latestSeen).toISOString());
      setPendingCount((data ?? []).length);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [feedQuery.data]);

  const news = feedQuery.data ?? [];
  const newsIds = useMemo(() => news.map((n) => n.id), [news]);
  const { getLikeCount, isLiked, toggleLike } = useNewsLikes(newsIds);

  /* Registrar leitura */
  const handleRead = useCallback(
    async (item: Noticia) => {
      window.open(item.url_original, "_blank", "noopener,noreferrer");
      try {
        await (supabase as any).rpc("register_news_read", { p_noticia_id: item.id });
        queryClient.setQueryData<Noticia[]>(["news-feed", 200], (prev) =>
          (prev ?? []).map((n) => (n.id === item.id ? { ...n, reads_count: n.reads_count + 1 } : n))
        );
      } catch {
        /* silencioso — leitura já foi contabilizada em outro dia ou usuário anônimo */
      }
    },
    [queryClient]
  );

  /* Ocultar (admin) */
  const hideMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("noticias_dashboard") as any)
        .update({ hidden: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Notícia ocultada", description: "A notícia não aparece mais no feed dos agentes." });
      queryClient.invalidateQueries({ queryKey: ["news-feed"] });
      queryClient.invalidateQueries({ queryKey: ["news-ranking"] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  /* Filtragem + busca */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter((n) => {
      if (categoriaFilter !== "all" && n.categoria !== categoriaFilter) return false;
      if (portalFilter !== "all" && n.fonte !== portalFilter) return false;
      if (q) {
        const hay = `${n.titulo_curto} ${n.resumo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [news, search, categoriaFilter, portalFilter]);

  const ordered = useMemo(() => {
    const arr = [...filtered];
    if (orderBy === "recent") return arr.sort((a, b) => +new Date(b.data_publicacao) - +new Date(a.data_publicacao));
    if (orderBy === "reads") return arr.sort((a, b) => b.reads_count - a.reads_count);
    if (orderBy === "likes") return arr.sort((a, b) => b.likes_count - a.likes_count);
    return arr.sort((a, b) => (b.reads_count + b.likes_count * 2) - (a.reads_count + a.likes_count * 2));
  }, [filtered, orderBy]);

  /* Notícias por categoria (destaques) */
  const byCategory = useMemo(() => {
    const map = new Map<string, Noticia[]>();
    for (const n of filtered) {
      const arr = map.get(n.categoria) ?? [];
      arr.push(n);
      map.set(n.categoria, arr);
    }
    return map;
  }, [filtered]);

  const ranking = rankingQuery.data ?? [];
  const topOne = ranking[0];
  const topRest = ranking.slice(1, 5);

  const featuredLabel = weekend ? "Notícia da Semana" : "Notícia do Dia";
  const top5Label = weekend ? "Top 5 da Semana" : "Top 5 do Dia";

  const handleReload = () => {
    setPendingCount(0);
    feedQuery.refetch();
    rankingQuery.refetch();
  };

  // Métricas do cabeçalho
  const news24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600_000;
    return news.filter((n) => new Date(n.data_publicacao).getTime() >= cutoff).length;
  }, [news]);
  const lastUpdateLabel = news[0] ? formatRelative(news[0].data_publicacao) : "—";
  const nextCollection = getNextCollectionLabel();

  return (
    <DashboardLayout>
      <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Cabeçalho editorial compacto */}
        <header className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <Newspaper className="h-6 w-6 text-primary" />
                Notícias do Trade
              </h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                Todas as notícias do turismo em um só lugar, organizadas pelo interesse dos agentes de viagens.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <AdminEditButton adminTab="news" />}
              <Button size="sm" variant="ghost" onClick={handleReload} aria-label="Atualizar">
                <RefreshCw className={cn("h-4 w-4", feedQuery.isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* Linha de indicadores */}
          <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <strong className="text-foreground">{news24hCount}</strong> nas últimas 24h
            </span>
            <span className="text-border">•</span>
            <span><strong className="text-foreground">{PORTAIS.length}</strong> portais monitorados</span>
            <span className="text-border">•</span>
            <span>Última atualização <strong className="text-foreground">{lastUpdateLabel}</strong></span>
            <span className="text-border">•</span>
            <span>Próxima coleta às <strong className="text-foreground">{nextCollection}</strong></span>
            {pendingCount > 0 && (
              <Button size="sm" variant="secondary" onClick={handleReload} className="gap-1.5 h-7 ml-auto">
                <RefreshCw className="h-3.5 w-3.5" />
                {pendingCount} {pendingCount === 1 ? "nova" : "novas"}
              </Button>
            )}
          </div>
        </header>

        {/* Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="destaques">Destaques</TabsTrigger>
            <TabsTrigger value="todas">Todas as notícias</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar notícias"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="h-9 w-[190px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={portalFilter} onValueChange={setPortalFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Portal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os portais</SelectItem>
              {PORTAIS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {view === "todas" && (
            <Select value={orderBy} onValueChange={(v) => setOrderBy(v as any)}>
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="score">Mais relevantes</SelectItem>
                <SelectItem value="reads">Mais acessadas</SelectItem>
                <SelectItem value="likes">Mais curtidas</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Estados de carregamento */}
        {feedQuery.isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!feedQuery.isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma notícia encontrada com estes filtros.</p>
          </div>
        )}

        {/* View: Destaques do Trade */}
        {view === "destaques" && filtered.length > 0 && (
          <div className="space-y-10">
            {/* Notícia do Dia/Semana (65%) + Top 5 (35%) */}
            {topOne && (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] gap-6">
                <NewsCard
                  item={topOne}
                  variant="feature"
                  featuredLabel={featuredLabel}
                  onRead={handleRead}
                  onLike={toggleLike}
                  liked={isLiked(topOne.id)}
                  likeCount={getLikeCount(topOne.id) || topOne.likes_count}
                  onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                  isAdmin={isAdmin}
                />
                <aside className="rounded-lg border border-border/60 bg-card p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-display font-bold text-foreground">{top5Label}</h3>
                  </div>
                  <div className="flex flex-col">
                    {topRest.map((r) => (
                      <RankingItem key={r.id} item={r} position={r.rank_position} onRead={handleRead} />
                    ))}
                    {topRest.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4">
                        Ainda não há dados suficientes para o ranking. Acesse e curta notícias para influenciar o Top {top5Label.includes("Semana") ? 5 : 5}.
                      </p>
                    )}
                  </div>
                </aside>
              </div>
            )}

            {/* Explorar por categoria */}
            <section>
              <h3 className="text-sm font-display font-bold text-foreground mb-2">Explorar por categoria</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map((cat) => {
                  const count = (byCategory.get(cat) ?? []).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setCategoriaFilter(cat); setView("todas"); }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card hover:bg-muted hover:border-primary/40 px-3 py-1.5 text-xs transition-colors"
                    >
                      <span>{cat}</span>
                      <span className="text-muted-foreground tabular-nums">({count})</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Últimas notícias — cronológico */}
            {filtered.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-display font-bold text-foreground">Últimas notícias</h3>
                  <Button
                    size="sm"
                    variant="link"
                    className="ml-auto h-auto p-0 text-xs"
                    onClick={() => { setOrderBy("recent"); setView("todas"); }}
                  >
                    Ver todas →
                  </Button>
                </div>
                <div className="grid grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.slice(0, 6).map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      onRead={handleRead}
                      onLike={toggleLike}
                      liked={isLiked(item.id)}
                      likeCount={getLikeCount(item.id) || item.likes_count}
                      onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Notícias organizadas por categoria — no máximo 4 por seção */}
            {CATEGORIAS.map((cat) => {
              const items = byCategory.get(cat) ?? [];
              if (items.length === 0) return null;
              const sorted = [...items].sort(
                (a, b) => (b.reads_count + b.likes_count * 2) - (a.reads_count + a.likes_count * 2)
              );
              const visible = categoryVisibleCounts[cat] ?? 8;
              const preview = sorted.slice(0, visible);
              const remaining = sorted.length - preview.length;
              const nextBatch = Math.min(4, remaining);
              return (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge categoria={cat} />
                    <h3 className="text-sm font-display font-bold text-foreground">{cat}</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {preview.map((item) => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        onRead={handleRead}
                        onLike={toggleLike}
                        liked={isLiked(item.id)}
                        likeCount={getLikeCount(item.id) || item.likes_count}
                        onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                  {remaining > 0 && (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs"
                        aria-label={`Carregar mais notícias da categoria ${cat}`}
                        onClick={() =>
                          setCategoryVisibleCounts((prev) => ({
                            ...prev,
                            [cat]: (prev[cat] ?? 8) + 4,
                          }))
                        }
                      >
                        Carregar mais {nextBatch} {nextBatch === 1 ? "notícia" : "notícias"}
                        <ChevronDown className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {/* View: Todas */}
        {view === "todas" && ordered.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ordered.slice(0, visibleCount).map((item) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onRead={handleRead}
                  onLike={toggleLike}
                  liked={isLiked(item.id)}
                  likeCount={getLikeCount(item.id) || item.likes_count}
                  onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
            {visibleCount < ordered.length && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setVisibleCount((c) => c + 20)}>
                  Carregar mais notícias
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}