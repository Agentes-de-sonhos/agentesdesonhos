import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Newspaper, ExternalLink, Loader2, Star, ChevronLeft, ChevronRight,
  TrendingUp, Trash2, FileText, Flame, Zap, Bookmark, BookmarkCheck,
  Plane, Ship, Hotel, Globe, BarChart3, Mic, Palmtree, ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface NoticiaHub {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  tipo_exibicao: string;
  status: string;
  data_publicacao: string;
  alerta_trade: boolean;
  nivel_alerta: string;
}

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Aéreo": <Plane className="h-3.5 w-3.5" />,
  "Cruzeiros": <Ship className="h-3.5 w-3.5" />,
  "Hotel": <Hotel className="h-3.5 w-3.5" />,
  "Destinos": <Globe className="h-3.5 w-3.5" />,
  "Mercado": <BarChart3 className="h-3.5 w-3.5" />,
  "Eventos": <Mic className="h-3.5 w-3.5" />,
  "Turismo": <Palmtree className="h-3.5 w-3.5" />,
};

const CATEGORIAS_FILTER = [
  "Todas",
  "Destaques do Trade",
  "Aéreo",
  "Destinos",
  "Mercado",
  "Cruzeiros",
  "Turismo",
  "Eventos",
];

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mercado": "bg-amber-100 text-amber-700 border-amber-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Turismo": "bg-teal-100 text-teal-700 border-teal-200",
  "Eventos": "bg-purple-100 text-purple-700 border-purple-200",
};

const PAGE_SIZE = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atrás`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  const icon = CATEGORIA_ICONS[categoria];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${colorClass}`}>
      {icon}
      {categoria}
    </span>
  );
}

/* ── Hero Card (Notícia do Dia) ─────────────────────────── */
function HeroNewsCard({ item, isAdmin, onDelete, saved, onToggleSave }: {
  item: NoticiaHub; isAdmin: boolean; onDelete?: (id: string) => void;
  saved: boolean; onToggleSave: (id: string) => void;
}) {
  return (
    <div className="relative group/card h-full">
      <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group h-full">
        <Card className="border-0 overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary/8 via-card to-card h-full">
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5" />
                Notícia do Dia
              </span>
              <CategoryBadge categoria={item.categoria} />
              <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                <TrendingUp className="h-3.5 w-3.5" />
                Score {item.relevancia_score}/10
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
              {item.titulo_curto}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-3xl">
              {item.resumo}
            </p>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground/70">{item.fonte}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{formatDate(item.data_publicacao)}</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary group-hover:underline">
                  Ler matéria <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(item.id); }}
      >
        {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
      </Button>
      {isAdmin && onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-3 right-12 h-8 w-8 opacity-0 group-hover/card:opacity-100 transition-opacity shadow-lg"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/* ── Standard News Card ──────────────────────────────────── */
function NewsCard({ item, isAdmin, onDelete, saved, onToggleSave, trending }: {
  item: NoticiaHub; isAdmin: boolean; onDelete?: (id: string) => void;
  saved: boolean; onToggleSave: (id: string) => void; trending?: boolean;
}) {
  return (
    <div className="relative group/card h-full">
      <a href={item.url_original} target="_blank" rel="noopener noreferrer" className="block group h-full">
        <Card className="border-0 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 h-full">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              <CategoryBadge categoria={item.categoria} />
              {trending && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold">
                  <Flame className="h-3 w-3" /> Em alta
                </span>
              )}
              {item.alerta_trade && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 text-[10px] font-bold">
                  <Star className="h-3 w-3" /> Destaque
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug flex-grow line-clamp-2">
              {item.titulo_curto}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {item.resumo}
            </p>
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/40">
              <span className="text-[11px] font-semibold text-foreground/70">{item.fonte}</span>
              <span className="text-[11px] text-muted-foreground">•</span>
              <span className="text-[11px] text-muted-foreground">{formatDate(item.data_publicacao)}</span>
              <ExternalLink className="h-3 w-3 ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      </a>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2.5 right-2.5 h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm opacity-0 group-hover/card:opacity-100 transition-opacity"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(item.id); }}
      >
        {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
      </Button>
      {isAdmin && onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2.5 right-10 h-7 w-7 opacity-0 group-hover/card:opacity-100 transition-opacity shadow-lg"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(item.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ── Compact List Card (for sidebar sections) ────────────── */
function CompactNewsItem({ item, index }: { item: NoticiaHub; index: number }) {
  const isFirst = index === 0;
  return (
    <a
      href={item.url_original}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex items-start gap-3 rounded-lg transition-colors ${
        isFirst ? "p-3 bg-primary/5 border border-primary/10" : "p-2.5 hover:bg-muted/50"
      }`}
    >
      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5 ${
        isFirst ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
      }`}>
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-relaxed ${
          isFirst ? "text-sm" : "text-xs"
        }`}>
          {item.titulo_curto}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <CategoryBadge categoria={item.categoria} />
          <span className="text-[10px] text-muted-foreground">{item.fonte}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground">{formatDate(item.data_publicacao)}</span>
        </div>
      </div>
    </a>
  );
}

/* ── Destaques Full-width Carousel with auto-advance ─────── */
function DestaquesCarousel({ items, isAdmin, onDelete, savedIds, onToggleSave, trendingSet }: {
  items: NoticiaHub[]; isAdmin: boolean; onDelete: (id: string) => void;
  savedIds: Set<string>; onToggleSave: (id: string) => void; trendingSet: Set<string>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 10000);
  }, [items.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (dir: "prev" | "next") => {
    setActiveIndex((prev) => dir === "next" ? (prev + 1) % items.length : (prev - 1 + items.length) % items.length);
    resetTimer();
  };

  const current = items[activeIndex];
  if (!current) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Star className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-bold text-foreground">Destaques do Trade</h2>
          <span className="text-xs text-muted-foreground">{activeIndex + 1} / {items.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => goTo("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => goTo("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full-width single slide */}
      <div className="relative">
        <a href={current.url_original} target="_blank" rel="noopener noreferrer" className="block group">
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-orange-50/50 to-card ring-1 ring-orange-200/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  <Star className="h-3 w-3" /> Destaque do Trade
                </span>
                <CategoryBadge categoria={current.categoria} />
                {trendingSet.has(current.id) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold">
                    <Flame className="h-3 w-3" /> Em alta
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-orange-600 transition-colors leading-snug">
                {current.titulo_curto}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {current.resumo}
              </p>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-orange-100">
                <span className="text-xs font-semibold text-foreground/70">{current.fonte}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatDate(current.data_publicacao)}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 group-hover:underline">
                  Ler matéria <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </CardContent>
          </Card>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(current.id); }}
        >
          {savedIds.has(current.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
        </Button>
        {isAdmin && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-3 right-12 h-8 w-8 opacity-0 hover:opacity-100 transition-opacity shadow-lg"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(current.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActiveIndex(i); resetTimer(); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-orange-500" : "w-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function Noticias() {
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const carouselRef = useRef<HTMLDivElement>(null);

  const { data: allNews, isLoading } = useQuery({
    queryKey: ["noticias-hub"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .eq("status", "aprovado")
        .gte("data_publicacao", twentyFourHoursAgo)
        .order("data_publicacao", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as NoticiaHub[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("noticias_dashboard").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noticias-hub"] });
      queryClient.invalidateQueries({ queryKey: ["curated-news-dashboard"] });
      toast({ title: "Notícia excluída com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta notícia?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast({ title: "Notícia removida dos salvos" });
      } else {
        next.add(id);
        toast({ title: "Notícia salva!" });
      }
      return next;
    });
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const amount = 320;
    carouselRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  // ── Sections ──
  const alertas = useMemo(
    () => (allNews || []).filter((n) => n.alerta_trade).slice(0, 6),
    [allNews]
  );
  const alertaIds = useMemo(() => new Set(alertas.map((n) => n.id)), [alertas]);

  const hero = useMemo(
    () => (allNews || []).find((n) => !alertaIds.has(n.id)),
    [allNews, alertaIds]
  );

  const heroAndAlertIds = useMemo(() => {
    const s = new Set(alertaIds);
    if (hero) s.add(hero.id);
    return s;
  }, [alertaIds, hero]);

  const curadoria = useMemo(
    () => (allNews || []).filter((n) => !heroAndAlertIds.has(n.id)),
    [allNews, heroAndAlertIds]
  );

  // Top 5 by score for "Resumo rápido"
  const topHeadlines = useMemo(
    () => [...(allNews || [])].sort((a, b) => b.relevancia_score - a.relevancia_score).slice(0, 5),
    [allNews]
  );

  // "Mais lidas" = highest score items different from headlines
  const trending = useMemo(
    () => [...(allNews || [])].sort((a, b) => b.relevancia_score - a.relevancia_score).slice(0, 3).map((n) => n.id),
    [allNews]
  );
  const trendingSet = useMemo(() => new Set(trending), [trending]);

  const filteredNews = useMemo(() => {
    if (!allNews) return [];
    switch (activeFilter) {
      case "Destaques do Trade":
        return allNews.filter((n) => n.tipo_exibicao === "destaque" || n.alerta_trade);
      case "Todas":
        return allNews;
      default:
        return allNews.filter((n) => n.categoria === activeFilter);
    }
  }, [allNews, activeFilter]);

  const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE);
  const paginatedNews = filteredNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const showSections = activeFilter === "Todas";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* ── Compact Header ── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
            <Newspaper className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Notícias do Trade
            </h1>
            <p className="text-muted-foreground text-xs">
              Curadoria inteligente das últimas 24 horas
            </p>
          </div>
        </div>

        {/* ── Filter Bar with Icons ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS_FILTER.map((cat) => {
            const icon = CATEGORIA_ICONS[cat];
            return (
              <Button
                key={cat}
                variant={activeFilter === cat ? "default" : "outline"}
                size="sm"
                className={`whitespace-nowrap text-xs rounded-full px-3.5 gap-1.5 ${
                  activeFilter === cat ? "shadow-md shadow-primary/20" : ""
                }`}
                onClick={() => handleFilterChange(cat)}
              >
                {icon}
                {cat}
              </Button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando notícias...</p>
          </div>
        ) : (
          <>
            {showSections && (
              <>
                {/* ── Hero + Top 5 side by side, same height ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
                  {/* Hero - 2/3 */}
                  <div className="lg:col-span-2 flex">
                    {hero && (
                      <div className="w-full flex">
                        <HeroNewsCard
                          item={hero}
                          isAdmin={isAdmin}
                          onDelete={handleDelete}
                          saved={savedIds.has(hero.id)}
                          onToggleSave={toggleSave}
                        />
                      </div>
                    )}
                  </div>

                  {/* Top 5 - 1/3 */}
                  <div className="lg:col-span-1 flex">
                    <Card className="border-0 shadow-sm w-full flex flex-col">
                      <CardContent className="p-4 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="h-4 w-4 text-warning" />
                          <h3 className="text-sm font-bold text-foreground">Top 5</h3>
                        </div>
                        <div className="space-y-0.5 flex-1">
                          {topHeadlines.map((item, i) => (
                            <CompactNewsItem key={item.id} item={item} index={i} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* ── Destaques Carousel (full-width slides, auto-advance 10s) ── */}
                {alertas.length > 0 && (
                  <DestaquesCarousel
                    items={alertas}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    savedIds={savedIds}
                    onToggleSave={toggleSave}
                    trendingSet={trendingSet}
                  />
                )}

                {/* ── Outras Notícias ── */}
                {curadoria.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <h2 className="text-base font-bold text-foreground">Outras Notícias</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {curadoria.map((item) => (
                        <NewsCard
                          key={item.id}
                          item={item}
                          isAdmin={isAdmin}
                          onDelete={handleDelete}
                          saved={savedIds.has(item.id)}
                          onToggleSave={toggleSave}
                          trending={trendingSet.has(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {!showSections && paginatedNews.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-base font-bold text-foreground">{activeFilter}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      saved={savedIds.has(item.id)}
                      onToggleSave={toggleSave}
                      trending={trendingSet.has(item.id)}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-full">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      {page} de {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-full">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </section>
            )}

            {filteredNews.length === 0 && (
              <div className="text-center py-24 text-muted-foreground">
                <Newspaper className="h-14 w-14 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma notícia nas últimas 24 horas</p>
                <p className="text-sm mt-1">Novas notícias aparecerão aqui conforme forem publicadas</p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
