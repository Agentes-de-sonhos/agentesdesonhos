import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Newspaper, Loader2, ExternalLink, Eye, ThumbsUp, Crown, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCtaLink } from "@/components/dashboard/SectionCtaLink";
import { useNewsHighlights, type HighlightNews, type Top5Item } from "@/hooks/useNewsHighlights";
import { highlightLabel } from "@/lib/newsRanking";
import { cn } from "@/lib/utils";

const CATEGORIA_COLORS: Record<string, string> = {
  "Aéreo": "bg-sky-100 text-sky-700 border-sky-200",
  "Destinos": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Mercado": "bg-amber-100 text-amber-700 border-amber-200",
  "Cruzeiros": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Turismo": "bg-teal-100 text-teal-700 border-teal-200",
  "Eventos": "bg-purple-100 text-purple-700 border-purple-200",
};

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const diffHours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
  if (diffHours < 1) return "Agora";
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffHours < 48) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function CategoryBadge({ categoria }: { categoria: string }) {
  const colorClass = CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${colorClass}`}>
      {categoria}
    </span>
  );
}

function SectionHeader() {
  return (
    <div className="mb-4 space-y-2 min-w-0">
      <div className="flex flex-col @[34rem]:flex-row @[34rem]:items-start @[34rem]:justify-between gap-2 @[34rem]:gap-3 min-w-0">
        <div className="w-fit">
          <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-[hsl(var(--section-news))]" />
            Notícias do Trade
          </h2>
          <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--section-news))]" />
        </div>
        <SectionCtaLink
          to="/noticias"
          label="Ver todas as notícias"
          shortLabel="Ver todas"
          tabTitle="Notícias"
          className="text-[hsl(var(--section-news))]"
        />
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">
        O destaque do período e o Top 5 da semana, com a mesma curadoria da página completa.
      </p>
    </div>
  );
}

export function CuratedNewsFeed() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useNewsHighlights();

  const handleRead = useCallback(
    async (item: HighlightNews | Top5Item) => {
      window.open(item.url_original, "_blank", "noopener,noreferrer");
      try {
        await (supabase as any).rpc("register_news_read", { p_noticia_id: item.id });
        queryClient.invalidateQueries({ queryKey: ["news-highlights"] });
      } catch {
        /* silencioso — leitura já contabilizada hoje ou usuário sem sessão */
      }
    },
    [queryClient]
  );

  const featured = data?.featured ?? null;
  const top5 = data?.top5 ?? [];
  const label = highlightLabel(data?.mode ?? "daily");

  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <CardContent className="pt-6 @container min-w-0">
        <SectionHeader />

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Não foi possível carregar as notícias agora.
          </div>
        ) : !featured && top5.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="rounded-full bg-muted p-3">
              <Newspaper className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma notícia publicada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-4 @[42rem]:gap-5 grid-cols-1 @[42rem]:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] items-start min-w-0">
            {/* Destaque do período */}
            <div className="min-w-0">
              {featured ? (
                <button
                  type="button"
                  onClick={() => handleRead(featured)}
                  className="group w-full text-left rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-5 transition-colors hover:border-primary/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                      <Crown className="h-3 w-3" /> {label}
                    </span>
                    <CategoryBadge categoria={featured.categoria} />
                    {featured.is_manual && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" /> Curadoria
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {featured.fonte} · {formatRelative(featured.data_publicacao)}
                    </span>
                  </div>
                  <h3 className="mt-2 font-display text-base @[42rem]:text-lg font-bold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {featured.titulo_curto}
                  </h3>
                  {featured.resumo && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">{featured.resumo}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 border-t border-border/40 pt-2 text-[11px] text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {featured.reads_count}</span>
                    <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {featured.likes_count}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary">
                      Ler matéria <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Ainda não há {label.toLowerCase()} definida para o período.
                </div>
              )}
            </div>

            {/* Top 5 da Semana */}
            <div className="min-w-0">
              <h3 className="mb-1 text-sm font-semibold text-foreground">Top 5 da Semana</h3>
              <div>
                {top5.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRead(item)}
                    className="w-full text-left group flex gap-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <span className="w-6 shrink-0 font-display text-2xl font-bold leading-none tabular-nums text-primary/70">
                      {item.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className={cn("text-[13px] font-semibold leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors")}>
                        {item.titulo_curto}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-medium">{item.fonte}</span>
                        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {item.reads_count}</span>
                        <span className="inline-flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likes_count}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {top5.length === 0 && (
                  <p className="py-4 text-xs text-muted-foreground">Sem ranking suficiente nesta semana.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
