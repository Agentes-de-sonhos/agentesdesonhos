import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AdminEditButton } from "@/components/layout/AdminEditButton";
import {
  Newspaper, ExternalLink, Loader2, TrendingUp, Flame, Search, Crown,
  Plane, Ship, Hotel, Globe, BarChart3, Mic, Palmtree, Building2, Ticket,
  DollarSign, GraduationCap, Users, Sparkles, Shield, Wrench, Filter,
  RefreshCw, EyeOff, Eye, ThumbsUp, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNewsLikes } from "@/hooks/useNewsLikes";
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

type RankingRow = Noticia & {
  window_reads: number;
  window_likes: number;
  score: number;
  rank_position: number;
};

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

/* ── Card (sem imagem) ───────────────────────────────────── */
function NewsRow({
  item,
  onRead,
  onLike,
  liked,
  likeCount,
  featured,
  featuredLabel,
  rankBadge,
  onHide,
  isAdmin,
}: {
  item: Noticia;
  onRead: (item: Noticia) => void;
  onLike: (id: string) => void;
  liked: boolean;
  likeCount: number;
  featured?: boolean;
  featuredLabel?: string;
  rankBadge?: string;
  onHide?: (id: string) => void;
  isAdmin?: boolean;
}) {
  return (
    <Card className={`border-0 shadow-sm hover:shadow-md transition-shadow ${featured ? "bg-gradient-to-br from-primary/8 via-card to-card" : ""}`}>
      <CardContent className={`${featured ? "p-5 md:p-6" : "p-4"} flex flex-col gap-2`}>
        <div className="flex items-center gap-2 flex-wrap">
          {rankBadge && (
            <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
              {rankBadge}
            </span>
          )}
          {featuredLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              <Crown className="h-3 w-3" /> {featuredLabel}
            </span>
          )}
          <span className="text-[11px] font-semibold text-foreground/80">{item.fonte}</span>
          <span className="text-[11px] text-muted-foreground">·</span>
          <CategoryBadge categoria={item.categoria} />
          <span className="text-[11px] text-muted-foreground">·</span>
          <span className="text-[11px] text-muted-foreground">{formatRelative(item.data_publicacao)}</span>
        </div>

        <h3 className={`${featured ? "text-lg md:text-xl" : "text-sm md:text-base"} font-bold leading-snug text-foreground`}>
          {item.titulo_curto}
        </h3>
        <p className={`${featured ? "text-sm" : "text-xs"} text-muted-foreground leading-relaxed line-clamp-3`}>
          {item.resumo}
        </p>

        <div className="flex items-center gap-3 pt-1 mt-1 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {likeCount} {likeCount === 1 ? "curtida" : "curtidas"} · {item.reads_count} {item.reads_count === 1 ? "leitura" : "leituras"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <NewsLikeButton
              noticiaId={item.id}
              count={likeCount}
              liked={liked}
              onToggle={onLike}
              size={featured ? "md" : "sm"}
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
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={(e) => { e.preventDefault(); onRead(item); }}
            >
              Ler matéria <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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

  return (
    <DashboardLayout>
      <PageHeader
        pageKey="noticias"
        icon={Newspaper}
        title="Notícias do Trade"
        subtitle="Todas as notícias do turismo em um só lugar, organizadas pelo interesse dos agentes de viagens."
        adminTab="news"
      />

      <div className="container max-w-7xl mx-auto px-4 pb-12 space-y-6">
        {/* Barra meta + refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {feedQuery.isFetching ? "Atualizando…" : `${news.length} notícias · atualizado ${formatRelative(new Date().toISOString())}`}
          </span>
          {pendingCount > 0 && (
            <Button size="sm" variant="secondary" onClick={handleReload} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              {pendingCount} {pendingCount === 1 ? "nova notícia" : "novas notícias"}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleReload}>
              <RefreshCw className={`h-3.5 w-3.5 ${feedQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="grid grid-cols-2 max-w-md">
            <TabsTrigger value="destaques">Destaques do Trade</TabsTrigger>
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
          <div className="space-y-8">
            {/* Notícia do Dia/Semana + Top 5 */}
            {topOne && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <NewsRow
                    item={topOne}
                    featured
                    featuredLabel={featuredLabel}
                    onRead={handleRead}
                    onLike={toggleLike}
                    liked={isLiked(topOne.id)}
                    likeCount={getLikeCount(topOne.id) || topOne.likes_count}
                    onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                    isAdmin={isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">{top5Label}</h3>
                  </div>
                  {topRest.map((r) => (
                    <NewsRow
                      key={r.id}
                      item={r}
                      rankBadge={`#${r.rank_position}`}
                      onRead={handleRead}
                      onLike={toggleLike}
                      liked={isLiked(r.id)}
                      likeCount={getLikeCount(r.id) || r.likes_count}
                      onHide={isAdmin ? (id) => hideMutation.mutate(id) : undefined}
                      isAdmin={isAdmin}
                    />
                  ))}
                  {topRest.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4">Ainda não há dados suficientes para o ranking. Acesse e curta notícias para influenciar o Top 5.</p>
                  )}
                </div>
              </div>
            )}

            {/* Notícias por categoria */}
            {CATEGORIAS.map((cat) => {
              const items = byCategory.get(cat) ?? [];
              if (items.length === 0) return null;
              const preview = items.slice(0, 6);
              return (
                <section key={cat} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CategoryBadge categoria={cat} />
                    <h3 className="text-sm font-bold text-foreground">{cat}</h3>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                    {items.length > preview.length && (
                      <Button
                        size="sm"
                        variant="link"
                        className="ml-auto h-auto p-0 text-xs"
                        onClick={() => {
                          setCategoriaFilter(cat);
                          setView("todas");
                        }}
                      >
                        Ver todas
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {preview.map((item) => (
                      <NewsRow
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
              );
            })}
          </div>
        )}

        {/* View: Todas */}
        {view === "todas" && ordered.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {ordered.slice(0, visibleCount).map((item) => (
                <NewsRow
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