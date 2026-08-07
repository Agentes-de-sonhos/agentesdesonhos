import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { spDateKey, spWeekStartKey } from "@/lib/newsRanking";

export interface HighlightNews {
  id: string;
  titulo_curto: string;
  resumo: string;
  categoria: string;
  fonte: string;
  url_original: string;
  data_publicacao: string;
  reads_count: number;
  likes_count: number;
  window_reads: number;
  window_likes: number;
  score: number;
  is_manual: boolean;
}

export interface Top5Item extends HighlightNews {
  position: number;
}

export interface NewsHighlights {
  mode: "daily" | "weekly";
  period_start: string;
  week_start: string;
  today: string;
  featured: HighlightNews | null;
  /** true quando o destaque veio do fallback de 24h/48h (sem publicações do dia). */
  featured_fallback: boolean;
  top5: Top5Item[];
}

/**
 * Bloco principal (Notícia do Dia / da Semana) + Top 5 da Semana.
 * A query key inclui a data e o início da semana locais (SP) para que a
 * virada do dia e da segunda-feira invalidem o cache automaticamente.
 */
export function useNewsHighlights() {
  const today = spDateKey();
  const weekStart = spWeekStartKey();

  return useQuery({
    queryKey: ["news-highlights", today, weekStart],
    queryFn: async (): Promise<NewsHighlights> => {
      const { data, error } = await (supabase as any).rpc("news_highlights");
      if (error) throw error;
      const payload = (data ?? {}) as NewsHighlights;
      return {
        mode: payload.mode ?? "daily",
        period_start: payload.period_start ?? today,
        week_start: payload.week_start ?? weekStart,
        today: payload.today ?? today,
        featured: payload.featured ?? null,
        featured_fallback: payload.featured_fallback ?? false,
        top5: (payload.top5 ?? []).slice(0, 5),
      };
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}