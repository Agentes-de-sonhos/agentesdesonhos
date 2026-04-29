import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ExternalLink, Loader2, ArrowRight, Newspaper,
  Flame, Zap, Star, TrendingUp, ThumbsUp,
  Plane, Ship, Hotel, Globe, BarChart3, Mic, Palmtree, Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useNewsLikes } from "@/hooks/useNewsLikes";
import { NewsLikeButton } from "@/components/news/NewsLikeButton";

interface CuratedNews {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  relevancia_score: number;
  score_perfil: number | null;
  aderencia_perfil: string | null;
  tipo_exibicao: string;
  data_publicacao: string;
  alerta_trade: boolean;
  is_noticia_do_dia: boolean;
  top5_position: number | null;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const CATEGORIA_ICONS: Record<string, React.ReactNode> = {
  "Aéreo": <Plane className="h-3 w-3" />,
  "Cruzeiros": <Ship className="h-3 w-3" />,
  "Hotel": <Hotel className="h-3 w-3" />,
  "Destinos": <Globe className="h-3 w-3" />,
  "Mercado": <BarChart3 className="h-3 w-3" />,
  "Eventos": <Mic className="h-3 w-3" />,
  "Turismo": <Palmtree className="h-3 w-3" />,
};

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mercado": "bg-amber-100 text-amber-700 border-amber-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Turismo": "bg-teal-100 text-teal-700 border-teal-200",
  "Eventos": "bg-purple-100 text-purple-700 border-purple-200",
};

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  const icon = CATEGORIA_ICONS[categoria];
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}>
      {icon}
      {categoria}
    </span>
  );
}

function NewsMetaRow({ item, isTopTrending }: { item: CuratedNews; isTopTrending: boolean }) {
  const tags: React.ReactNode[] = [];

  if (item.is_noticia_do_dia) {
    tags.push(
      <span key="dia" className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider leading-4">
        <Flame className="h-2.5 w-2.5" /> Dia
      </span>
    );
  }

  if (item.top5_position != null) {
    tags.push(
      <span key="top5" className="inline-flex items-center gap-0.5 rounded-full bg-warning/15 text-warning border border-warning/30 px-1.5 py-0 text-[9px] font-bold leading-4">
        <Zap className="h-2.5 w-2.5" /> Top {item.top5_position}
      </span>
    );
  }

  if (item.alerta_trade) {
    tags.push(
      <span key="destaque" className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0 text-[9px] font-bold leading-4">
        <Star className="h-2.5 w-2.5" /> Destaque
      </span>
    );
  }

  if (isTopTrending && !item.is_noticia_do_dia) {
    tags.push(
      <span key="alta" className="inline-flex items-center gap-0.5 rounded-full bg-destructive/10 text-destructive px-1.5 py-0 text-[9px] font-bold leading-4">
        <TrendingUp className="h-2.5 w-2.5" /> Em alta
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden min-w-0">
      <CategoryBadge categoria={item.categoria} />
      {tags}
      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto flex-shrink-0">
        {item.fonte} • {formatDate(item.data_publicacao)}
        {item.relevancia_score >= 8 && (
          <span className="font-semibold text-primary ml-1">★ {item.relevancia_score}</span>
        )}
      </span>
    </div>
  );
}

export function CuratedNewsFeed() {
  const navigate = useNavigate();
  const { data: news, isLoading } = useQuery({
    queryKey: ["curated-news-dashboard"],
    queryFn: async () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("noticias_dashboard")
        .select("*")
        .eq("status", "aprovado")
        .gte("data_publicacao", twentyFourHoursAgo)
        .order("score_perfil", { ascending: false, nullsFirst: false })
        .order("relevancia_score", { ascending: false })
        .order("data_publicacao", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        is_noticia_do_dia: d.is_noticia_do_dia ?? false,
        top5_position: d.top5_position ?? null,
        alerta_trade: d.alerta_trade ?? false,
        score_perfil: d.score_perfil ?? null,
        aderencia_perfil: d.aderencia_perfil ?? null,
      })) as CuratedNews[];
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const newsIds = useMemo(() => (news || []).map((n) => n.id), [news]);
  const { getLikeCount, isLiked, toggleLike } = useNewsLikes(newsIds);

  if (isLoading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="pt-6 space-y-4">
          <div className="mb-3 w-fit">
            <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-[hsl(var(--section-news))]" />
              Radar do Turismo
            </h2>
            <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-news))]" />
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="rounded-full bg-muted p-3">
              <Newspaper className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-medium">Nenhuma notícia publicada ainda.</p>
            <p className="text-xs text-muted-foreground/70">Aguarde, em breve teremos novidades por aqui.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Top 3 by score for "Em alta" tag
  const trendingIds = new Set(
    [...news].sort((a, b) => b.relevancia_score - a.relevancia_score).slice(0, 2).map((n) => n.id)
  );

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="pt-6 space-y-0.5">
        <div className="mb-3 w-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-[hsl(var(--section-news))]" />
            Radar do Turismo
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-news))]" />
        </div>

        {news.map((item, i) => {
          const isFirst = i === 0;
          const likeCount = getLikeCount(item.id);
          return (
            <div key={item.id} className="relative group/item">
              <a
                href={item.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex items-start gap-3 rounded-xl p-3 transition-all duration-200 hover:bg-[hsl(var(--section-news))]/5 ${
                  isFirst ? "bg-primary/[0.03] border border-primary/10" : ""
                }`}
              >
                {/* Rank indicator */}
                <span className={`flex-shrink-0 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5 ${
                  isFirst
                    ? "bg-[hsl(var(--section-news))] text-white"
                    : "bg-[hsl(var(--section-news))]/10 text-[hsl(var(--section-news))]"
                }`}>
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <NewsMetaRow item={item} isTopTrending={trendingIds.has(item.id)} />
                  <h4 className={`font-medium text-foreground group-hover:text-[hsl(var(--section-news))] transition-colors line-clamp-1 leading-snug ${
                    isFirst ? "text-sm" : "text-[13px]"
                  }`}>
                    {item.titulo_curto}
                  </h4>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                  {likeCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <ThumbsUp className="h-3 w-3" /> {likeCount}
                    </span>
                  )}
                  <ExternalLink className="h-4 w-4 text-[hsl(var(--section-news))] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </a>
              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                <NewsLikeButton noticiaId={item.id} count={likeCount} liked={isLiked(item.id)} onToggle={toggleLike} />
              </div>
            </div>
          );
        })}

        <div className="pt-3 border-t">
          <Button
            variant="ghost"
            className="w-full text-[hsl(var(--section-news))] hover:text-[hsl(var(--section-news))] hover:bg-[hsl(var(--section-news))]/5"
            onClick={() => navigate("/noticias")}
          >
            Mais notícias
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
